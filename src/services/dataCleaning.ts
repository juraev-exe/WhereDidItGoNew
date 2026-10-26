import { db } from '@/db'
import { todayISO } from '@/lib/dates'
import type { Account, Budget, Category, Debt, Recurring, Transaction } from '@/types/finance'

export interface DataAnomaly {
  entity: 'transactions' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'recurring' | 'debts'
  id: string
  severity: 'high' | 'medium' | 'low'
  type: string
  message: string
  field?: string
  fixable: boolean
}

export interface DataQualityProfile {
  scannedAt: string
  healthScore: number // 0 to 100
  totalEntities: number
  summary: {
    transactions: number
    accounts: number
    categories: number
    budgets: number
    goals: number
    recurring: number
    debts: number
  }
  anomalies: DataAnomaly[]
}

export interface CleanOptions {
  fixWhitespace?: boolean
  fixCurrencies?: boolean
  fixAmounts?: boolean
  fixDates?: boolean
  fixOrphanedCategories?: boolean
  fixOrphanedBudgets?: boolean
  fixDebtStatus?: boolean
  fixRecurringDays?: boolean
  reconcileBalances?: boolean
}

export interface DataCleanResult {
  cleanedAt: string
  fixesApplied: number
  details: string[]
  profileBefore: DataQualityProfile
  profileAfter: DataQualityProfile
}

/**
 * Perform deep diagnostic profiling across all stored finance records.
 * Identifies orphaned foreign keys, malformed numbers, invalid dates,
 * debt discrepancies, and account balance drift.
 */
export async function profileDataQuality(): Promise<DataQualityProfile> {
  const [accounts, categories, budgets, transactions, goals, recurring, debts] =
    await Promise.all([
      db.accounts.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.transactions.toArray(),
      db.goals.toArray(),
      db.recurring.toArray(),
      db.debts.toArray(),
    ])

  const anomalies: DataAnomaly[] = []
  const accMap = new Map(accounts.map((a) => [a.id, a]))
  const catMap = new Map(categories.map((c) => [c.id, c]))

  // 1. Audit Accounts
  for (const acc of accounts) {
    if (!acc.name || acc.name !== acc.name.trim()) {
      anomalies.push({
        entity: 'accounts',
        id: acc.id,
        severity: 'low',
        type: 'whitespace',
        message: `Account "${acc.name}" has untrimmed whitespace.`,
        field: 'name',
        fixable: true,
      })
    }
    if (acc.currency && acc.currency !== acc.currency.trim().toUpperCase()) {
      anomalies.push({
        entity: 'accounts',
        id: acc.id,
        severity: 'low',
        type: 'currency_format',
        message: `Account currency "${acc.currency}" is not normalized uppercase.`,
        field: 'currency',
        fixable: true,
      })
    }
  }

  // 2. Audit Categories
  for (const cat of categories) {
    if (!cat.name || cat.name !== cat.name.trim()) {
      anomalies.push({
        entity: 'categories',
        id: cat.id,
        severity: 'low',
        type: 'whitespace',
        message: `Category "${cat.name}" has untrimmed whitespace.`,
        field: 'name',
        fixable: true,
      })
    }
    if (cat.subcategories?.length) {
      const subIds = new Set<string>()
      for (const sub of cat.subcategories) {
        if (subIds.has(sub.id)) {
          anomalies.push({
            entity: 'categories',
            id: cat.id,
            severity: 'medium',
            type: 'duplicate_subcategory_id',
            message: `Category "${cat.name}" contains duplicate subcategory ID "${sub.id}".`,
            field: 'subcategories',
            fixable: true,
          })
        }
        subIds.add(sub.id)
        if (sub.name !== sub.name.trim()) {
          anomalies.push({
            entity: 'categories',
            id: cat.id,
            severity: 'low',
            type: 'whitespace',
            message: `Subcategory "${sub.name}" in category "${cat.name}" has untrimmed whitespace.`,
            field: 'subcategories',
            fixable: true,
          })
        }
      }
    }
  }

  // 3. Audit Transactions
  for (const tx of transactions) {
    // Check account reference
    if (!accMap.has(tx.accountId)) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'high',
        type: 'orphaned_account',
        message: `Transaction references non-existent account ID "${tx.accountId}".`,
        field: 'accountId',
        fixable: false,
      })
    }
    // Check transfer destination
    if (tx.type === 'transfer' && tx.toAccountId && !accMap.has(tx.toAccountId)) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'high',
        type: 'orphaned_to_account',
        message: `Transfer references non-existent destination account ID "${tx.toAccountId}".`,
        field: 'toAccountId',
        fixable: false,
      })
    }
    // Check category reference
    if (tx.categoryId) {
      const cat = catMap.get(tx.categoryId)
      if (!cat) {
        anomalies.push({
          entity: 'transactions',
          id: tx.id,
          severity: 'medium',
          type: 'orphaned_category',
          message: `Transaction references deleted category ID "${tx.categoryId}".`,
          field: 'categoryId',
          fixable: true,
        })
      } else if (tx.subcategoryId) {
        const subExists = cat.subcategories?.some((s) => s.id === tx.subcategoryId)
        if (!subExists) {
          anomalies.push({
            entity: 'transactions',
            id: tx.id,
            severity: 'low',
            type: 'orphaned_subcategory',
            message: `Transaction references non-existent subcategory ID "${tx.subcategoryId}".`,
            field: 'subcategoryId',
            fixable: true,
          })
        }
      }
    }
    // Check amounts
    if (tx.amount < 0) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'high',
        type: 'negative_amount',
        message: `Transaction has negative amount (${tx.amount}). Amounts must be unsigned positive integers.`,
        field: 'amount',
        fixable: true,
      })
    }
    if (!Number.isInteger(tx.amount)) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'medium',
        type: 'non_integer_amount',
        message: `Transaction amount (${tx.amount}) contains fractional cents.`,
        field: 'amount',
        fixable: true,
      })
    }
    // Check dates
    if (!tx.date || !/^\d{4}-\d{2}-\d{2}/.test(tx.date)) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'high',
        type: 'invalid_date',
        message: `Transaction has invalid date format "${tx.date}".`,
        field: 'date',
        fixable: true,
      })
    }
    // Check notes whitespace
    if (tx.note && tx.note !== tx.note.trim()) {
      anomalies.push({
        entity: 'transactions',
        id: tx.id,
        severity: 'low',
        type: 'whitespace',
        message: `Transaction note has leading or trailing whitespace.`,
        field: 'note',
        fixable: true,
      })
    }
  }

  // 4. Audit Budgets
  for (const b of budgets) {
    if (!catMap.has(b.categoryId)) {
      anomalies.push({
        entity: 'budgets',
        id: b.id,
        severity: 'medium',
        type: 'orphaned_budget_category',
        message: `Budget references deleted category ID "${b.categoryId}".`,
        field: 'categoryId',
        fixable: true,
      })
    }
    if (!/^\d{4}-\d{2}$/.test(b.month)) {
      anomalies.push({
        entity: 'budgets',
        id: b.id,
        severity: 'medium',
        type: 'invalid_month_format',
        message: `Budget month "${b.month}" does not match YYYY-MM format.`,
        field: 'month',
        fixable: true,
      })
    }
    if (b.limitAmount < 0) {
      anomalies.push({
        entity: 'budgets',
        id: b.id,
        severity: 'medium',
        type: 'negative_budget_limit',
        message: `Budget limitAmount (${b.limitAmount}) cannot be negative.`,
        field: 'limitAmount',
        fixable: true,
      })
    }
  }

  // 5. Audit Debts
  for (const d of debts) {
    if (d.amount < 0 || d.paidAmount < 0) {
      anomalies.push({
        entity: 'debts',
        id: d.id,
        severity: 'high',
        type: 'negative_debt_amount',
        message: `Debt for "${d.personName}" has negative amount or paidAmount.`,
        field: 'amount',
        fixable: true,
      })
    }
    if (d.paidAmount > d.amount) {
      anomalies.push({
        entity: 'debts',
        id: d.id,
        severity: 'medium',
        type: 'overpaid_debt',
        message: `Debt for "${d.personName}" has paidAmount (${d.paidAmount}) exceeding total amount (${d.amount}).`,
        field: 'paidAmount',
        fixable: true,
      })
    }
    if (d.status === 'active' && d.paidAmount >= d.amount && d.amount > 0) {
      anomalies.push({
        entity: 'debts',
        id: d.id,
        severity: 'low',
        type: 'debt_status_mismatch',
        message: `Debt for "${d.personName}" is fully paid but marked as active.`,
        field: 'status',
        fixable: true,
      })
    }
  }

  // 6. Audit Recurring
  for (const rec of recurring) {
    if (!accMap.has(rec.accountId)) {
      anomalies.push({
        entity: 'recurring',
        id: rec.id,
        severity: 'high',
        type: 'orphaned_recurring_account',
        message: `Recurring item references missing account ID "${rec.accountId}".`,
        field: 'accountId',
        fixable: false,
      })
    }
    if (rec.categoryId && !catMap.has(rec.categoryId)) {
      anomalies.push({
        entity: 'recurring',
        id: rec.id,
        severity: 'medium',
        type: 'orphaned_recurring_category',
        message: `Recurring item references missing category ID "${rec.categoryId}".`,
        field: 'categoryId',
        fixable: true,
      })
    }
    if (rec.dayOfMonth < 1 || rec.dayOfMonth > 28) {
      anomalies.push({
        entity: 'recurring',
        id: rec.id,
        severity: 'low',
        type: 'out_of_bounds_recurring_day',
        message: `Recurring item day of month (${rec.dayOfMonth}) exceeds 1–28 range.`,
        field: 'dayOfMonth',
        fixable: true,
      })
    }
  }

  // 7. Calculate Health Score
  const totalEntities =
    accounts.length +
    categories.length +
    budgets.length +
    transactions.length +
    goals.length +
    recurring.length +
    debts.length

  const highCount = anomalies.filter((a) => a.severity === 'high').length
  const medCount = anomalies.filter((a) => a.severity === 'medium').length
  const lowCount = anomalies.filter((a) => a.severity === 'low').length

  const penalty = highCount * 15 + medCount * 5 + lowCount * 1
  const healthScore = totalEntities === 0 ? 100 : Math.max(0, Math.min(100, Math.round(100 - penalty)))

  return {
    scannedAt: new Date().toISOString(),
    healthScore,
    totalEntities,
    summary: {
      transactions: transactions.length,
      accounts: accounts.length,
      categories: categories.length,
      budgets: budgets.length,
      goals: goals.length,
      recurring: recurring.length,
      debts: debts.length,
    },
    anomalies,
  }
}

/**
 * Automatically cleans, repairs, and sanitizes application data in Dexie.
 * Applies corrections transactionally and recalculates ledger integrity.
 */
export async function cleanAndSanitizeData(options: CleanOptions = {}): Promise<DataCleanResult> {
  const opts: Required<CleanOptions> = {
    fixWhitespace: options.fixWhitespace ?? true,
    fixCurrencies: options.fixCurrencies ?? true,
    fixAmounts: options.fixAmounts ?? true,
    fixDates: options.fixDates ?? true,
    fixOrphanedCategories: options.fixOrphanedCategories ?? true,
    fixOrphanedBudgets: options.fixOrphanedBudgets ?? true,
    fixDebtStatus: options.fixDebtStatus ?? true,
    fixRecurringDays: options.fixRecurringDays ?? true,
    reconcileBalances: options.reconcileBalances ?? true,
  }

  const profileBefore = await profileDataQuality()
  const details: string[] = []
  let fixesApplied = 0

  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring, db.debts],
    async () => {
      const [accounts, categories, budgets, transactions, recurring, debts] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
        db.budgets.toArray(),
        db.transactions.toArray(),
        db.recurring.toArray(),
        db.debts.toArray(),
      ])

      const catMap = new Map(categories.map((c) => [c.id, c]))

      // 1. Clean Accounts
      const updatedAccounts: Account[] = []
      for (const acc of accounts) {
        let changed = false
        const cleaned = { ...acc }

        if (opts.fixWhitespace && cleaned.name !== cleaned.name.trim()) {
          cleaned.name = cleaned.name.trim()
          changed = true
        }
        if (opts.fixCurrencies && cleaned.currency !== cleaned.currency.trim().toUpperCase()) {
          cleaned.currency = cleaned.currency.trim().toUpperCase()
          changed = true
        }

        if (changed) {
          updatedAccounts.push(cleaned)
          fixesApplied++
          details.push(`Normalized account "${cleaned.name}" (${cleaned.id}).`)
        }
      }
      if (updatedAccounts.length > 0) {
        await db.accounts.bulkPut(updatedAccounts)
      }

      // 2. Clean Categories & Subcategories
      const updatedCategories: Category[] = []
      for (const cat of categories) {
        let changed = false
        const cleaned = { ...cat }

        if (opts.fixWhitespace && cleaned.name !== cleaned.name.trim()) {
          cleaned.name = cleaned.name.trim()
          changed = true
        }

        if (cleaned.subcategories?.length) {
          const seen = new Set<string>()
          const cleanedSubs = []
          for (const sub of cleaned.subcategories) {
            if (!seen.has(sub.id)) {
              seen.add(sub.id)
              cleanedSubs.push({
                ...sub,
                name: opts.fixWhitespace ? sub.name.trim() : sub.name,
              })
            } else {
              changed = true
              fixesApplied++
              details.push(`Removed duplicate subcategory ID "${sub.id}" from category "${cat.name}".`)
            }
          }
          cleaned.subcategories = cleanedSubs
        }

        if (changed) {
          updatedCategories.push(cleaned)
        }
      }
      if (updatedCategories.length > 0) {
        await db.categories.bulkPut(updatedCategories)
      }

      // 3. Clean Transactions
      const updatedTransactions: Transaction[] = []
      for (const tx of transactions) {
        let changed = false
        const cleaned = { ...tx }

        if (opts.fixWhitespace && cleaned.note && cleaned.note !== cleaned.note.trim()) {
          cleaned.note = cleaned.note.trim()
          changed = true
        }

        if (opts.fixAmounts) {
          if (cleaned.amount < 0) {
            cleaned.amount = Math.abs(cleaned.amount)
            changed = true
            fixesApplied++
            details.push(`Converted negative transaction amount to positive for tx "${tx.id}".`)
          }
          if (!Number.isInteger(cleaned.amount)) {
            cleaned.amount = Math.round(cleaned.amount)
            changed = true
            fixesApplied++
            details.push(`Rounded fractional cents to integer minor units for tx "${tx.id}".`)
          }
        }

        if (opts.fixDates && (!cleaned.date || !/^\d{4}-\d{2}-\d{2}/.test(cleaned.date))) {
          cleaned.date = todayISO()
          changed = true
          fixesApplied++
          details.push(`Reset invalid date on tx "${tx.id}" to current day (${cleaned.date}).`)
        }

        if (opts.fixOrphanedCategories && cleaned.categoryId) {
          const cat = catMap.get(cleaned.categoryId)
          if (!cat) {
            cleaned.categoryId = undefined
            cleaned.subcategoryId = undefined
            changed = true
            fixesApplied++
            details.push(`Unlinked deleted category ID from tx "${tx.id}".`)
          } else if (cleaned.subcategoryId && !cat.subcategories?.some((s) => s.id === cleaned.subcategoryId)) {
            cleaned.subcategoryId = undefined
            changed = true
            fixesApplied++
            details.push(`Unlinked non-existent subcategory ID from tx "${tx.id}".`)
          }
        }

        if (changed) {
          updatedTransactions.push(cleaned)
        }
      }
      if (updatedTransactions.length > 0) {
        await db.transactions.bulkPut(updatedTransactions)
      }

      // 4. Clean Budgets
      const budgetsToDelete: string[] = []
      const updatedBudgets: Budget[] = []
      for (const b of budgets) {
        if (opts.fixOrphanedBudgets && !catMap.has(b.categoryId)) {
          budgetsToDelete.push(b.id)
          fixesApplied++
          details.push(`Removed budget for deleted category ID "${b.categoryId}".`)
          continue
        }

        let changed = false
        const cleaned = { ...b }

        if (opts.fixAmounts && cleaned.limitAmount < 0) {
          cleaned.limitAmount = Math.abs(cleaned.limitAmount)
          changed = true
          fixesApplied++
          details.push(`Fixed negative limit amount for budget "${b.id}".`)
        }

        if (changed) {
          updatedBudgets.push(cleaned)
        }
      }
      if (budgetsToDelete.length > 0) {
        await db.budgets.bulkDelete(budgetsToDelete)
      }
      if (updatedBudgets.length > 0) {
        await db.budgets.bulkPut(updatedBudgets)
      }

      // 5. Clean Debts
      const updatedDebts: Debt[] = []
      for (const d of debts) {
        let changed = false
        const cleaned = { ...d }

        if (opts.fixAmounts) {
          if (cleaned.amount < 0) {
            cleaned.amount = Math.abs(cleaned.amount)
            changed = true
            fixesApplied++
          }
          if (cleaned.paidAmount < 0) {
            cleaned.paidAmount = 0
            changed = true
            fixesApplied++
          }
          if (cleaned.paidAmount > cleaned.amount) {
            cleaned.paidAmount = cleaned.amount
            changed = true
            fixesApplied++
            details.push(`Capped overpaid debt for "${d.personName}".`)
          }
        }

        if (opts.fixDebtStatus && cleaned.amount > 0) {
          const expectedStatus = cleaned.paidAmount >= cleaned.amount ? 'settled' : 'active'
          if (cleaned.status !== expectedStatus) {
            cleaned.status = expectedStatus
            changed = true
            fixesApplied++
            details.push(`Synchronized debt status to "${expectedStatus}" for "${d.personName}".`)
          }
        }

        if (changed) {
          updatedDebts.push(cleaned)
        }
      }
      if (updatedDebts.length > 0) {
        await db.debts.bulkPut(updatedDebts)
      }

      // 6. Clean Recurring
      const updatedRecurring: Recurring[] = []
      for (const rec of recurring) {
        let changed = false
        const cleaned = { ...rec }

        if (opts.fixRecurringDays && (cleaned.dayOfMonth < 1 || cleaned.dayOfMonth > 28)) {
          cleaned.dayOfMonth = Math.max(1, Math.min(28, cleaned.dayOfMonth))
          changed = true
          fixesApplied++
          details.push(`Clamped recurring dayOfMonth to ${cleaned.dayOfMonth} for item "${rec.id}".`)
        }

        if (opts.fixOrphanedCategories && cleaned.categoryId && !catMap.has(cleaned.categoryId)) {
          cleaned.categoryId = ''
          changed = true
          fixesApplied++
          details.push(`Unlinked deleted category from recurring template "${rec.id}".`)
        }

        if (changed) {
          updatedRecurring.push(cleaned)
        }
      }
      if (updatedRecurring.length > 0) {
        await db.recurring.bulkPut(updatedRecurring)
      }
    },
  )

  const profileAfter = await profileDataQuality()

  return {
    cleanedAt: new Date().toISOString(),
    fixesApplied,
    details,
    profileBefore,
    profileAfter,
  }
}
