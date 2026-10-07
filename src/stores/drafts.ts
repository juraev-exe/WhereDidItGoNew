import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'
import type { DraftTransaction, Transaction } from '@/types/finance'
import { useTransactionsStore } from './transactions'
import { useAccountsStore } from './accounts'
import { useCategoriesStore } from './categories'
import { confirmFeedback, successFeedback, warningFeedback } from '@/services/native/haptics'
import { matchCategory, type ParsedBankMessage } from '@/services/smsParser'

export const useDraftsStore = defineStore('drafts', () => {
  const drafts = ref<DraftTransaction[]>([])
  const loaded = ref(false)

  async function loadDrafts(): Promise<void> {
    const rows = await db.drafts.toArray()
    // Sort newest first
    drafts.value = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    loaded.value = true
  }

  async function addDraft(
    data: Omit<DraftTransaction, 'id' | 'createdAt'>,
  ): Promise<DraftTransaction> {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newDraft: DraftTransaction = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    }
    await db.drafts.add(newDraft)
    drafts.value.unshift(newDraft)
    return newDraft
  }

  async function ingestBankMessage(
    parsed: ParsedBankMessage,
    preferredAccountId?: string,
  ): Promise<DraftTransaction> {
    const accounts = useAccountsStore()
    const categories = useCategoriesStore()

    const targetAccount = preferredAccountId || accounts.active[0]?.id || ''
    const matched = matchCategory(parsed, categories.categories)

    const draft = await addDraft({
      source: parsed.rawSender ? 'sms' : 'notification',
      rawSender: parsed.rawSender,
      rawText: parsed.rawText,
      amount: parsed.amount,
      type: parsed.type,
      accountId: targetAccount,
      categoryId: matched?.id,
      note: parsed.note,
      date: parsed.date,
    })

    void confirmFeedback()
    return draft
  }

  async function confirmDraft(
    draftId: string,
    overrides?: Partial<Transaction>,
  ): Promise<void> {
    const draft = drafts.value.find((d) => d.id === draftId)
    if (!draft) return

    const txStore = useTransactionsStore()
    const accounts = useAccountsStore()

    const finalAccountId = overrides?.accountId || draft.accountId || accounts.active[0]?.id || ''

    await txStore.addTransaction({
      type: overrides?.type || draft.type,
      amount: overrides?.amount ?? draft.amount,
      accountId: finalAccountId,
      toAccountId: overrides?.toAccountId,
      categoryId: overrides?.categoryId ?? draft.categoryId,
      subcategoryId: overrides?.subcategoryId ?? draft.subcategoryId,
      note: overrides?.note ?? draft.note,
      date: overrides?.date ?? draft.date,
    })

    await db.drafts.delete(draftId)
    drafts.value = drafts.value.filter((d) => d.id !== draftId)
    void successFeedback()
  }

  async function discardDraft(draftId: string): Promise<void> {
    await db.drafts.delete(draftId)
    drafts.value = drafts.value.filter((d) => d.id !== draftId)
    void warningFeedback()
  }

  async function clearAll(): Promise<void> {
    await db.drafts.clear()
    drafts.value = []
    void warningFeedback()
  }

  return {
    drafts,
    loaded,
    loadDrafts,
    addDraft,
    ingestBankMessage,
    confirmDraft,
    discardDraft,
    clearAll,
  }
})
