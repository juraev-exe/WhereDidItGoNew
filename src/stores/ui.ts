import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Category, CategoryKind, Transaction } from '@/types/finance'

export const useUiStore = defineStore('ui', () => {
  const addSheetOpen = ref(false)
  const editingTx = ref<Transaction | null>(null)
  const categoriesSheetOpen = ref(false)
  const categoryToEdit = ref<Category | null>(null)
  const categoryDefaultKind = ref<CategoryKind>('expense')
  const budgetCopiedMonth = ref('')
  /** Settings renders its sub-pages in place; the back gesture needs to see them. */
  const settingsSubpage = ref('root')
  const activeModalCount = ref(0)

  const isAnyModalOpen = computed(
    () => addSheetOpen.value || categoriesSheetOpen.value || activeModalCount.value > 0,
  )

  function registerModalOpen() {
    activeModalCount.value++
  }

  function registerModalClose() {
    activeModalCount.value = Math.max(0, activeModalCount.value - 1)
  }

  function openAdd(tx?: Transaction | null) {
    editingTx.value = tx ?? null
    addSheetOpen.value = true
  }

  function closeAdd() {
    addSheetOpen.value = false
    editingTx.value = null
  }

  function openCategories(cat?: Category | null, defaultKind: CategoryKind = 'expense') {
    categoryToEdit.value = cat ?? null
    categoryDefaultKind.value = defaultKind
    categoriesSheetOpen.value = true
  }

  function closeCategories() {
    categoriesSheetOpen.value = false
    categoryToEdit.value = null
    categoryDefaultKind.value = 'expense'
  }

  function setSettingsSubpage(page: string) {
    settingsSubpage.value = page
  }

  function notifyBudgetCopied(month: string) {
    budgetCopiedMonth.value = month
  }

  function clearBudgetCopied() {
    budgetCopiedMonth.value = ''
  }

  return {
    addSheetOpen,
    editingTx,
    categoriesSheetOpen,
    categoryToEdit,
    categoryDefaultKind,
    budgetCopiedMonth,
    settingsSubpage,
    activeModalCount,
    isAnyModalOpen,
    registerModalOpen,
    registerModalClose,
    openAdd,
    closeAdd,
    openCategories,
    closeCategories,
    setSettingsSubpage,
    notifyBudgetCopied,
    clearBudgetCopied,
  }
})
