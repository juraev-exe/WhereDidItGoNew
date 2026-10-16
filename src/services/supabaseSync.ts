import { supabase, isSupabaseConfigured, getCurrentUser } from './supabase'
import { buildBackup, mergeFromBackup, replaceFromBackup } from './backup'
import { db } from '@/db'
import type { BackupPayload, Account, Category, Budget, Goal, Transaction, Recurring, Debt } from '@/types/finance'
import type { Database, SyncStats } from '@/types/supabase'

export interface CloudBackupItem {
  id: string
  version: number
  clientTimestamp: string
  createdAt: string
  accountCount: number
  transactionCount: number
}

/**
 * Upload a full snapshot backup to Supabase Cloud Vault
 */
export async function uploadCloudSnapshot(): Promise<{ id: string; timestamp: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('You must be signed in to upload cloud backups.')
  }

  const payload = await buildBackup()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('cloud_backups')
    .insert({
      user_id: user.id,
      version: payload.version,
      payload: payload as unknown as Database['public']['Tables']['cloud_backups']['Insert']['payload'],
      client_timestamp: now,
    })
    .select('id, client_timestamp')
    .single()

  if (error) throw error

  await db.meta.put({ key: 'supabaseLastSyncAt', value: now })
  return { id: data.id, timestamp: data.client_timestamp }
}

/**
 * List available cloud snapshot backups for the current user
 */
export async function listCloudSnapshots(): Promise<CloudBackupItem[]> {
  if (!isSupabaseConfigured) return []
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('cloud_backups')
    .select('id, version, client_timestamp, created_at, payload')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !data) return []

  return data.map((item) => {
    const rawPayload = item.payload as unknown as BackupPayload
    return {
      id: item.id,
      version: item.version,
      clientTimestamp: item.client_timestamp,
      createdAt: item.created_at,
      accountCount: rawPayload?.accounts?.length || 0,
      transactionCount: rawPayload?.transactions?.length || 0,
    }
  })
}

/**
 * Restore a cloud snapshot into local Dexie database
 */
export async function restoreCloudSnapshot(snapshotId?: string, mode: 'merge' | 'replace' = 'merge'): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('You must be signed in to restore cloud backups.')
  }

  let query = supabase
    .from('cloud_backups')
    .select('payload')
    .eq('user_id', user.id)

  if (snapshotId) {
    query = query.eq('id', snapshotId)
  } else {
    query = query.order('created_at', { ascending: false }).limit(1)
  }

  const { data, error } = await query.single()
  if (error || !data) {
    throw new Error('No cloud backup found to restore.')
  }

  const payload = data.payload as unknown as BackupPayload
  if (mode === 'replace') {
    await replaceFromBackup(payload)
  } else {
    await mergeFromBackup(payload)
  }

  await db.meta.put({ key: 'supabaseLastSyncAt', value: new Date().toISOString() })
}

/**
 * Two-way granular sync between local Dexie and Supabase tables
 */
export async function syncTwoWay(): Promise<SyncStats> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('You must be signed in to sync data.')
  }

  let pulled = 0
  let pushed = 0
  const now = new Date().toISOString()

  // 1. Fetch Local Data
  const [localAccounts, localCategories, localBudgets, localGoals, localTxs, localRecurring, localDebts] =
    await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.goals.toArray(),
      db.transactions.toArray(),
      db.recurring.toArray(),
      db.debts.toArray(),
    ])

  // 2. Fetch Remote Data for User
  const [remoteAccs, remoteCats, remoteBudgets, remoteGoals, remoteTxs, remoteRecs, remoteDebts] =
    await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('recurring').select('*').eq('user_id', user.id),
      supabase.from('debts').select('*').eq('user_id', user.id),
    ])

  // Process Accounts
  if (localAccounts.length > 0) {
    const accRows = localAccounts.map((a) => ({
      id: a.id,
      user_id: user.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency,
      color: a.color,
      archived: a.archived,
      created_at: a.createdAt || now,
      updated_at: now,
    }))
    const { error } = await supabase.from('accounts').upsert(accRows as any, { onConflict: 'id' })
    if (!error) pushed += accRows.length
  }

  if (remoteAccs.data && (remoteAccs.data as any[]).length > 0) {
    const localMap = new Map(localAccounts.map((a) => [a.id, a]))
    const incoming: Account[] = []
    for (const r of (remoteAccs.data as any[])) {
      if (!localMap.has(r.id)) {
        incoming.push({
          id: r.id,
          name: r.name,
          type: r.type as Account['type'],
          balance: r.balance,
          currency: r.currency,
          color: r.color,
          archived: r.archived,
          createdAt: r.created_at,
        })
      }
    }
    if (incoming.length > 0) {
      await db.accounts.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Categories
  if (localCategories.length > 0) {
    const catRows = localCategories.map((c) => ({
      id: c.id,
      user_id: user.id,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      sort_order: c.sortOrder,
      subcategories: (c.subcategories || []) as any,
      created_at: now,
      updated_at: now,
    }))
    const { error } = await supabase.from('categories').upsert(catRows as any, { onConflict: 'id' })
    if (!error) pushed += catRows.length
  }

  if (remoteCats.data && (remoteCats.data as any[]).length > 0) {
    const localMap = new Map(localCategories.map((c) => [c.id, c]))
    const incoming: Category[] = []
    for (const r of (remoteCats.data as any[])) {
      if (!localMap.has(r.id)) {
        incoming.push({
          id: r.id,
          name: r.name,
          kind: r.kind,
          icon: r.icon,
          color: r.color,
          sortOrder: r.sort_order,
          subcategories: Array.isArray(r.subcategories) ? (r.subcategories as any) : [],
        })
      }
    }
    if (incoming.length > 0) {
      await db.categories.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Transactions
  if (localTxs.length > 0) {
    const txRows = localTxs.map((t) => ({
      id: t.id,
      user_id: user.id,
      type: t.type,
      amount: t.amount,
      account_id: t.accountId,
      to_account_id: t.toAccountId || null,
      category_id: t.categoryId || null,
      subcategory_id: t.subcategoryId || null,
      note: t.note || '',
      date: t.date,
      created_at: t.createdAt || now,
      updated_at: t.updatedAt || now,
    }))
    const { error } = await supabase.from('transactions').upsert(txRows as any, { onConflict: 'id' })
    if (!error) pushed += txRows.length
  }

  if (remoteTxs.data && (remoteTxs.data as any[]).length > 0) {
    const localMap = new Map(localTxs.map((t) => [t.id, t]))
    const incoming: Transaction[] = []
    for (const r of (remoteTxs.data as any[])) {
      const local = localMap.get(r.id)
      if (!local || new Date(r.updated_at) > new Date(local.updatedAt)) {
        incoming.push({
          id: r.id,
          type: r.type,
          amount: r.amount,
          accountId: r.account_id,
          toAccountId: r.to_account_id || undefined,
          categoryId: r.category_id || undefined,
          subcategoryId: r.subcategory_id || undefined,
          note: r.note || '',
          date: r.date,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })
      }
    }
    if (incoming.length > 0) {
      await db.transactions.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Budgets
  if (localBudgets.length > 0) {
    const budgetRows = localBudgets.map((b) => ({
      id: b.id,
      user_id: user.id,
      category_id: b.categoryId,
      month: b.month,
      limit_amount: b.limitAmount,
      rollover: Boolean(b.rollover),
      created_at: now,
      updated_at: now,
    }))
    const { error } = await supabase.from('budgets').upsert(budgetRows as any, { onConflict: 'id' })
    if (!error) pushed += budgetRows.length
  }

  if (remoteBudgets.data && (remoteBudgets.data as any[]).length > 0) {
    const localMap = new Map(localBudgets.map((b) => [b.id, b]))
    const incoming: Budget[] = []
    for (const r of (remoteBudgets.data as any[])) {
      if (!localMap.has(r.id)) {
        incoming.push({
          id: r.id,
          categoryId: r.category_id,
          month: r.month,
          limitAmount: r.limit_amount,
          rollover: r.rollover,
        })
      }
    }
    if (incoming.length > 0) {
      await db.budgets.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Goals
  if (localGoals.length > 0) {
    const goalRows = localGoals.map((g) => ({
      id: g.id,
      user_id: user.id,
      name: g.name,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount,
      deadline: g.deadline || null,
      color: g.color,
      icon: g.icon,
      created_at: g.createdAt || now,
      updated_at: now,
    }))
    const { error } = await supabase.from('goals').upsert(goalRows as any, { onConflict: 'id' })
    if (!error) pushed += goalRows.length
  }

  if (remoteGoals.data && (remoteGoals.data as any[]).length > 0) {
    const localMap = new Map(localGoals.map((g) => [g.id, g]))
    const incoming: Goal[] = []
    for (const r of (remoteGoals.data as any[])) {
      if (!localMap.has(r.id)) {
        incoming.push({
          id: r.id,
          name: r.name,
          targetAmount: r.target_amount,
          currentAmount: r.current_amount,
          deadline: r.deadline || undefined,
          color: r.color,
          icon: r.icon,
          createdAt: r.created_at,
        })
      }
    }
    if (incoming.length > 0) {
      await db.goals.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Debts
  if (localDebts.length > 0) {
    const debtRows = localDebts.map((d) => ({
      id: d.id,
      user_id: user.id,
      type: d.type,
      person_name: d.personName,
      amount: d.amount,
      paid_amount: d.paidAmount,
      status: d.status,
      due_date: d.dueDate || null,
      note: d.note || '',
      created_at: d.createdAt || now,
      updated_at: d.updatedAt || now,
    }))
    const { error } = await supabase.from('debts').upsert(debtRows as any, { onConflict: 'id' })
    if (!error) pushed += debtRows.length
  }

  if (remoteDebts.data && (remoteDebts.data as any[]).length > 0) {
    const localMap = new Map(localDebts.map((d) => [d.id, d]))
    const incoming: Debt[] = []
    for (const r of (remoteDebts.data as any[])) {
      const local = localMap.get(r.id)
      if (!local || new Date(r.updated_at) > new Date(local.updatedAt)) {
        incoming.push({
          id: r.id,
          type: r.type,
          personName: r.person_name,
          amount: r.amount,
          paidAmount: r.paid_amount,
          status: r.status,
          dueDate: r.due_date || undefined,
          note: r.note || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })
      }
    }
    if (incoming.length > 0) {
      await db.debts.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  // Process Recurring
  if (localRecurring.length > 0) {
    const recRows = localRecurring.map((rec) => ({
      id: rec.id,
      user_id: user.id,
      type: rec.type,
      amount: rec.amount,
      account_id: rec.accountId,
      category_id: rec.categoryId,
      note: rec.note || '',
      day_of_month: rec.dayOfMonth,
      last_posted_month: rec.lastPostedMonth || null,
      created_at: rec.createdAt || now,
      updated_at: now,
    }))
    const { error } = await supabase.from('recurring').upsert(recRows as any, { onConflict: 'id' })
    if (!error) pushed += recRows.length
  }

  if (remoteRecs.data && (remoteRecs.data as any[]).length > 0) {
    const localMap = new Map(localRecurring.map((r) => [r.id, r]))
    const incoming: Recurring[] = []
    for (const r of (remoteRecs.data as any[])) {
      if (!localMap.has(r.id)) {
        incoming.push({
          id: r.id,
          type: r.type,
          amount: r.amount,
          accountId: r.account_id,
          categoryId: r.category_id,
          note: r.note || '',
          dayOfMonth: r.day_of_month,
          lastPostedMonth: r.last_posted_month || undefined,
          createdAt: r.created_at,
        })
      }
    }
    if (incoming.length > 0) {
      await db.recurring.bulkPut(incoming)
      pulled += incoming.length
    }
  }

  await db.meta.put({ key: 'supabaseLastSyncAt', value: now })

  return { pulled, pushed, syncedAt: now }
}

/**
 * Get ISO timestamp of last successful Supabase sync
 */
export async function getLastSyncAt(): Promise<string | null> {
  const row = await db.meta.get('supabaseLastSyncAt')
  return row?.value || null
}
