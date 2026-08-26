import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { createId } from '@/lib/id'
import { liveQuery } from 'dexie'
import type { Debt, DebtStatus, DebtType } from '@/types/finance'

export const useDebtsStore = defineStore('debts', () => {
  const ready = ref(false)
  const debts = ref<Debt[]>([])
  let sub: { unsubscribe: () => void } | null = null

  function sortRows(rows: Debt[]) {
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** Keep the list in sync with the DB the way the other stores do. */
  function start() {
    if (sub) return
    sub = liveQuery(() => db.debts.toArray()).subscribe({
      next: (rows) => {
        debts.value = sortRows(rows)
        ready.value = true
      },
    })
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
  }

  const activeDebts = computed(() => debts.value.filter((d) => d.status === 'active'))
  const settledDebts = computed(() => debts.value.filter((d) => d.status === 'settled'))

  const totalLent = computed(() =>
    activeDebts.value
      .filter((d) => d.type === 'lent')
      .reduce((sum, d) => sum + Math.max(0, d.amount - d.paidAmount), 0),
  )

  const totalBorrowed = computed(() =>
    activeDebts.value
      .filter((d) => d.type === 'borrowed')
      .reduce((sum, d) => sum + Math.max(0, d.amount - d.paidAmount), 0),
  )

  const netDebt = computed(() => totalLent.value - totalBorrowed.value)

  async function load() {
    debts.value = sortRows(await db.debts.toArray())
    ready.value = true
  }

  /** All amounts are minor units (cents). */
  async function addDebt(input: {
    type: DebtType
    personName: string
    amount: number
    paidAmount?: number
    dueDate?: string
    note?: string
  }) {
    const now = new Date().toISOString()
    const amount = Math.round(Math.abs(input.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a valid positive number')
    }
    const personName = input.personName.trim()
    if (!personName) throw new Error('Name is required')
    const paidAmount = Math.min(amount, Math.round(Math.abs(input.paidAmount ?? 0)))
    const item: Debt = {
      id: createId('debt'),
      type: input.type,
      personName,
      amount,
      paidAmount,
      status: paidAmount >= amount ? 'settled' : 'active',
      dueDate: input.dueDate || undefined,
      note: input.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    await db.debts.add(item)
    if (!sub) debts.value.unshift(item)
    return item
  }

  async function updateDebt(
    id: string,
    input: {
      type: DebtType
      personName: string
      amount: number
      paidAmount?: number
      dueDate?: string
      note?: string
    },
  ) {
    const existing = await db.debts.get(id)
    if (!existing) return
    const amount = Math.round(Math.abs(input.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a valid positive number')
    }
    const personName = input.personName.trim()
    if (!personName) throw new Error('Name is required')
    const paidAmount = Math.min(amount, Math.round(Math.abs(input.paidAmount ?? existing.paidAmount)))
    const next: Debt = {
      ...existing,
      type: input.type,
      personName,
      amount,
      paidAmount,
      status: paidAmount >= amount ? 'settled' : 'active',
      dueDate: input.dueDate || undefined,
      note: input.note?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    }
    await db.debts.put(next)
    if (!sub) {
      const idx = debts.value.findIndex((d) => d.id === id)
      if (idx !== -1) debts.value[idx] = next
    }
    return next
  }

  async function recordPayment(id: string, paymentAmount: number) {
    const idx = debts.value.findIndex((d) => d.id === id)
    if (idx === -1) return
    const target = debts.value[idx]
    const payment = Math.round(Math.abs(paymentAmount))
    if (!Number.isFinite(payment) || payment <= 0) return
    const newPaid = Math.min(target.amount, target.paidAmount + payment)
    const newStatus: DebtStatus = newPaid >= target.amount ? 'settled' : 'active'
    const now = new Date().toISOString()

    await db.debts.update(id, {
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: now,
    })

    debts.value[idx] = {
      ...target,
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: now,
    }
  }

  async function deleteDebt(id: string) {
    const existing = await db.debts.get(id)
    await db.debts.delete(id)
    if (!sub) debts.value = debts.value.filter((d) => d.id !== id)
    return existing
  }

  async function restoreDebt(debt: Debt) {
    await db.debts.put(debt)
    if (!sub) debts.value = sortRows([...debts.value, debt])
  }

  return {
    ready,
    debts,
    activeDebts,
    settledDebts,
    totalLent,
    totalBorrowed,
    netDebt,
    start,
    stop,
    load,
    addDebt,
    updateDebt,
    recordPayment,
    deleteDebt,
    restoreDebt,
  }
})
