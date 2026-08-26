<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Calendar, Plus } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import DatePickerModal from '@/components/ui/DatePickerModal.vue'
import CategoryFormSheet from '@/components/CategoryFormSheet.vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import { amountHasExpression, formatMoney, parseMoneyToMinor } from '@/lib/money'
import { monthKey, todayDayOfMonth, todayISO, yesterdayISO } from '@/lib/dates'
import { confirmFeedback, errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useCategoriesStore } from '@/stores/categories'
import { usePremiumStore } from '@/stores/premium'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import type { Category, TransactionType } from '@/types/finance'

const { t } = useI18n()
const ui = useUiStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const transactions = useTransactionsStore()
const recurring = useRecurringStore()
const settings = useSettingsStore()
const premium = usePremiumStore()

const datePickerOpen = ref(false)
const type = ref<TransactionType>('expense')
const amountStr = ref('')
const categoryId = ref<string>('')
const subcategoryId = ref<string>('')
const accountId = ref<string>('')
const toAccountId = ref<string>('')
const note = ref('')
const date = ref(todayISO())
const saving = ref(false)
const error = ref('')
const repeatMonthly = ref(false)
const dayOfMonth = ref(String(todayDayOfMonth()))

const catFormOpen = ref(false)
const catToEdit = ref<Category | null>(null)

function openDatePicker() {
  datePickerOpen.value = true
  void tickFeedback()
}

function openAddCategory() {
  catToEdit.value = null
  catFormOpen.value = true
  void tickFeedback()
}

function onCategorySaved(savedCat: Category) {
  categoryId.value = savedCat.id
}

const title = computed(() =>
  ui.editingTx ? t('quickAdd.editTitle') : t('quickAdd.addTitle'),
)

const categoryList = computed(() =>
  type.value === 'income' ? categories.income : categories.expense,
)

const categoryOptions = computed(() =>
  categoryList.value.map((c) => ({
    value: c.id,
    label: c.name,
  })),
)

const activeCategory = computed(() => categories.byId(categoryId.value))
const activeSubcategories = computed(() => activeCategory.value?.subcategories ?? [])

const accountOptions = computed(() =>
  accounts.active.map((a) => ({ value: a.id, label: a.name })),
)

const dayOptions = computed(() =>
  Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
)

const parsedAmount = computed(() => parseMoneyToMinor(amountStr.value))

/** Live total while the amount field holds a running sum like "12+8+3.50". */
const amountPreview = computed(() => {
  if (!amountHasExpression(amountStr.value) || parsedAmount.value <= 0) return ''
  return formatMoney(
    parsedAmount.value,
    settings.currency,
    settings.intlLocale,
    settings.currencyPosition,
    settings.hideCents,
  )
})

const showRepeat = computed(() => !ui.editingTx && type.value !== 'transfer')
const isGoalMove = computed(
  () => Boolean(ui.editingTx && ui.editingTx.type === 'transfer' && !ui.editingTx.toAccountId),
)
const isToday = computed(() => date.value === todayISO())
const isYesterday = computed(() => date.value === yesterdayISO())

const dateText = computed(() => {
  if (isToday.value) return `${t('quickAdd.today')} (${date.value})`
  if (isYesterday.value) return `${t('quickAdd.yesterday')} (${date.value})`
  return date.value
})

function pickActiveAccount(preferred: string, fallbackIndex = 0) {
  const list = accounts.active
  if (preferred && list.some((a) => a.id === preferred)) return preferred
  return list[fallbackIndex]?.id ?? list[0]?.id ?? ''
}

function pickCategory(kind: 'expense' | 'income') {
  const list = kind === 'income' ? categories.income : categories.expense
  const preferred = kind === 'income' ? settings.lastIncomeCategoryId : settings.lastExpenseCategoryId
  if (preferred && list.some((c) => c.id === preferred)) return preferred
  return list[0]?.id ?? ''
}

function resetForm() {
  type.value = 'expense'
  amountStr.value = ''
  categoryId.value = pickCategory('expense')
  accountId.value = pickActiveAccount(settings.lastAccountId)
  const lastTo = pickActiveAccount(settings.lastToAccountId, 1)
  toAccountId.value =
    lastTo && lastTo !== accountId.value
      ? lastTo
      : (accounts.active.find((a) => a.id !== accountId.value)?.id ?? accountId.value)
  subcategoryId.value = ''
  note.value = ''
  date.value = todayISO()
  error.value = ''
  saving.value = false
  repeatMonthly.value = false
  dayOfMonth.value = String(todayDayOfMonth())
}

let prefilling = false

watch(
  [() => ui.addSheetOpen, () => ui.editingTx],
  ([open, tx]) => {
    if (!open) return
    prefilling = true
    if (tx) {
      type.value = tx.type
      amountStr.value = (tx.amount / 100).toFixed(2)
      categoryId.value = tx.categoryId ?? ''
      subcategoryId.value = tx.subcategoryId ?? ''
      accountId.value = tx.accountId
      toAccountId.value = tx.toAccountId ?? ''
      note.value = tx.note
      date.value = tx.date
      error.value = ''
      saving.value = false
      repeatMonthly.value = false
    } else {
      resetForm()
    }
    void nextTick(() => {
      prefilling = false
    })
  },
  { immediate: true },
)

watch(categoryId, () => {
  // Prefilling an existing transaction assigns categoryId and subcategoryId in the
  // same tick; without this guard the (deferred) watcher would clear the subcategory.
  if (prefilling) return
  subcategoryId.value = ''
})

watch(type, (txType) => {
  if (prefilling) return
  if (txType === 'transfer') {
    categoryId.value = ''
    subcategoryId.value = ''
    return
  }
  const list = txType === 'income' ? categories.income : categories.expense
  const stillValid = list.some((c) => c.id === categoryId.value)
  if (!stillValid) {
    categoryId.value = pickCategory(txType)
  }
})

async function save() {
  const amount = parsedAmount.value
  if (amount <= 0) {
    error.value = t('quickAdd.amountRequired')
    void errorFeedback()
    return
  }
  if (!accountId.value) {
    error.value = t('quickAdd.accountRequired')
    void errorFeedback()
    return
  }
  if (type.value !== 'transfer' && !categoryId.value) {
    error.value = t('quickAdd.categoryRequired')
    void errorFeedback()
    return
  }
  if (type.value === 'transfer' && !isGoalMove.value) {
    if (!toAccountId.value || toAccountId.value === accountId.value) {
      error.value = t('quickAdd.destinationRequired')
      void errorFeedback()
      return
    }
  }

  if (!ui.editingTx && !premium.canAddTransaction()) {
    premium.openPaywall(t('premium.limitTxReached'))
    return
  }

  saving.value = true
  error.value = ''
  try {
    const payload = {
      type: type.value,
      amount,
      accountId: accountId.value,
      toAccountId:
        type.value === 'transfer' && toAccountId.value && toAccountId.value !== accountId.value
          ? toAccountId.value
          : undefined,
      categoryId: type.value === 'transfer' ? undefined : categoryId.value,
      subcategoryId: type.value === 'transfer' ? undefined : subcategoryId.value || undefined,
      note: note.value.trim(),
      date: date.value,
    }
    if (ui.editingTx) {
      await transactions.updateTransaction(ui.editingTx.id, payload)
    } else {
      await transactions.addTransaction(payload)
      await settings.rememberLastUsed({
        accountId: payload.accountId,
        toAccountId: payload.toAccountId,
        expenseCategoryId: payload.type === 'expense' ? payload.categoryId : undefined,
        incomeCategoryId: payload.type === 'income' ? payload.categoryId : undefined,
      })
      if (repeatMonthly.value && payload.type !== 'transfer' && payload.categoryId) {
        await recurring.addRecurring({
          type: payload.type,
          amount: payload.amount,
          accountId: payload.accountId,
          categoryId: payload.categoryId,
          note: payload.note,
          dayOfMonth: Number(dayOfMonth.value),
          lastPostedMonth: monthKey(),
        })
      }
    }
    await successFeedback()
    ui.closeAdd()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    saving.value = false
  }
}

const confirmDeleteOpen = ref(false)

async function remove() {
  confirmDeleteOpen.value = false
  if (!ui.editingTx) return
  saving.value = true
  try {
    await transactions.deleteTransaction(ui.editingTx.id)
    void warningFeedback()
    ui.closeAdd()
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet
    :open="ui.addSheetOpen"
    :title="title"
    contain
    @close="ui.closeAdd()"
  >
    <form class="modal-body" @submit.prevent="save">
            <!-- Segmented Type Switcher -->
            <div class="seg" role="tablist" :aria-label="t('quickAdd.typeLabel')">
              <button
                v-for="txType in (['expense', 'income', 'transfer'] as const)"
                :key="txType"
                type="button"
                role="tab"
                :class="{ active: type === txType }"
                :aria-selected="type === txType"
                @click="type = txType; confirmFeedback()"
              >
                {{ t(`txTypes.${txType}`) }}
              </button>
            </div>

            <!-- Amount Input -->
            <label class="field">
              <span>{{ t('quickAdd.amount') }} ({{ settings.currencySymbol }})</span>
              <input
                v-model="amountStr"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                required
                placeholder="0.00"
                class="amount-input"
              />
            </label>

            <!-- Account Input -->
            <label class="field">
              <span>{{ type === 'transfer' ? t('quickAdd.fromAccount') : t('quickAdd.account') }}</span>
              <AppSelect
                v-model="accountId"
                :options="accountOptions"
                :aria-label="type === 'transfer' ? t('quickAdd.fromAccount') : t('quickAdd.account')"
              />
            </label>

            <!-- Destination Account (Transfer only) -->
            <label v-if="type === 'transfer' && !isGoalMove" class="field">
              <span>{{ t('quickAdd.toAccount') }}</span>
              <AppSelect
                v-model="toAccountId"
                :options="accountOptions"
                :aria-label="t('quickAdd.toAccount')"
              />
            </label>

            <!-- Category (Expense & Income only) -->
            <div v-if="type !== 'transfer'" class="field">
              <div class="field-header">
                <span>{{ t('quickAdd.category') }}</span>
                <button type="button" class="add-cat-btn" @click="openAddCategory">
                  <Plus :size="13" />
                  <span>{{ t('settings.addCategory') }}</span>
                </button>
              </div>
              <AppSelect
                v-model="categoryId"
                :options="categoryOptions"
                :aria-label="t('quickAdd.category')"
              />
            </div>

            <!-- Subcategories Chips -->
            <div v-if="type !== 'transfer' && activeSubcategories.length" class="field">
              <span>{{ t('quickAdd.subcategoryOptional') }}</span>
              <div class="subcat-pills">
                <button
                  type="button"
                  class="subcat-pill"
                  :class="{ 'subcat-pill--active': !subcategoryId }"
                  @click="subcategoryId = ''; tickFeedback()"
                >
                  {{ t('quickAdd.subcategoryNone') }}
                </button>
                <button
                  v-for="sub in activeSubcategories"
                  :key="sub.id"
                  type="button"
                  class="subcat-pill"
                  :class="{ 'subcat-pill--active': subcategoryId === sub.id }"
                  :style="{ '--sub-color': activeCategory?.color }"
                  @click="subcategoryId = sub.id; tickFeedback()"
                >
                  {{ sub.name }}
                </button>
              </div>
            </div>

            <!-- Date -->
            <label class="field">
              <span>{{ t('quickAdd.date') }}</span>
              <button type="button" class="date-picker-btn" @click="openDatePicker">
                <Calendar :size="16" class="date-icon" />
                <span>{{ dateText }}</span>
              </button>
            </label>

            <!-- Note -->
            <label class="field">
              <span>{{ t('quickAdd.noteOptional') }}</span>
              <input
                v-model="note"
                type="text"
                maxlength="120"
                :placeholder="t('quickAdd.notePlaceholder')"
              />
            </label>

            <!-- Recurring Monthly Switch -->
            <div v-if="showRepeat" class="repeat-row">
              <span class="repeat-label">{{ t('recurring.repeatMonthly') }}</span>
              <button
                type="button"
                class="switch"
                :class="{ 'switch--on': repeatMonthly }"
                role="switch"
                :aria-checked="repeatMonthly"
                :aria-label="t('recurring.repeatMonthly')"
                @click="repeatMonthly = !repeatMonthly; tickFeedback()"
              />
            </div>

            <!-- Day of Month (if recurring) -->
            <label v-if="showRepeat && repeatMonthly" class="field">
              <span>{{ t('recurring.dayOfMonth') }}</span>
              <AppSelect
                v-model="dayOfMonth"
                :options="dayOptions"
                :aria-label="t('recurring.dayOfMonth')"
              />
            </label>

            <p v-if="amountPreview" class="amount-preview">= {{ amountPreview }}</p>

            <p v-if="error" class="error-msg" role="alert">{{ error }}</p>

            <!-- Actions -->
            <div class="form-actions">
              <button
                v-if="ui.editingTx"
                type="button"
                class="delete-btn"
                :disabled="saving"
                @click="confirmDeleteOpen = true"
              >
                {{ t('common.delete') }}
              </button>
              <button type="button" class="cancel-btn" @click="ui.closeAdd()">
                {{ t('common.cancel') }}
              </button>
              <AppButton
                type="submit"
                :disabled="saving || parsedAmount <= 0"
              >
                {{ saving ? t('quickAdd.saving') : ui.editingTx ? t('quickAdd.saveChanges') : t('common.save') }}
              </AppButton>
            </div>
          </form>
  </BottomSheet>

  <CategoryFormSheet
    :open="catFormOpen"
    :category="catToEdit"
    :default-kind="type === 'income' ? 'income' : 'expense'"
    @close="catFormOpen = false"
    @saved="onCategorySaved"
  />

  <DatePickerModal
    v-model="date"
    :open="datePickerOpen"
    @close="datePickerOpen = false"
  />

  <ConfirmSheet
    :open="confirmDeleteOpen"
    :title="t('common.delete')"
    :message="t('activity.deleteConfirm')"
    :confirm-label="t('common.delete')"
    destructive
    @confirm="remove"
    @close="confirmDeleteOpen = false"
  />
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal-card {
  width: 100%;
  max-width: 440px;
  max-height: min(90dvh, 680px);
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
  scrollbar-width: none;
  border: 1px solid var(--color-outline-variant);
  animation: scaleSpring var(--duration-entrance) var(--ease-emphasized) both;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  margin: 0;
  color: var(--color-on-surface);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.icon-btn:hover {
  background: var(--color-surface-container);
  color: var(--color-on-surface);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background var(--duration-normal) var(--ease-emphasized),
    color var(--duration-normal) var(--ease-emphasized),
    box-shadow var(--duration-normal) var(--ease-emphasized),
    transform var(--duration-fast) var(--ease-spring-snappy);
}

.seg button:active {
  transform: scale(0.95);
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-cat-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-container);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy), box-shadow var(--duration-fast);
}

.add-cat-btn:hover {
  transform: translateY(-1px);
}

.add-cat-btn:active {
  transform: scale(0.95) translateY(0);
}

.field input,
.date-picker-btn {
  width: 100%;
  min-height: 46px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-outline-variant);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-body);
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: border-color var(--duration-fast), background var(--duration-fast), box-shadow var(--duration-fast);
}

.amount-input {
  font-family: var(--font-display);
  font-size: 1.25rem !important;
  font-weight: 600;
}

.field input:focus,
.date-picker-btn:hover {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.date-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.subcat-pills {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  padding: 4px 2px;
}

.subcat-pill {
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  border: 1.5px solid var(--color-outline-variant);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-muted);
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard),
              color var(--duration-fast) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .subcat-pill:hover {
    background: var(--color-surface-container-high);
    color: var(--color-on-surface);
    transform: translateY(-1px);
  }
}

.subcat-pill:active {
  transform: scale(0.95) translateY(0);
}

.subcat-pill--active {
  background: color-mix(in srgb, var(--sub-color, var(--color-primary)) 16%, var(--color-surface));
  border-color: var(--sub-color, var(--color-primary));
  color: var(--sub-color, var(--color-primary));
  font-weight: 700;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sub-color, var(--color-primary)) 20%, transparent);
  transform: scale(1.03);
}

.repeat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
}

.repeat-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.switch {
  width: 44px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  position: relative;
  border: none;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform var(--duration-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.switch--on {
  background: var(--color-primary);
}

.switch--on::after {
  transform: translateX(20px);
}

.amount-preview {
  margin-top: calc(var(--space-2) * -1);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.error-msg {
  color: var(--color-error);
  font-size: var(--text-caption);
  margin: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.delete-btn {
  margin-right: auto;
  background: transparent;
  border: none;
  color: var(--color-error);
  font-weight: 600;
  font-size: var(--text-label);
  cursor: pointer;
  padding: 8px 4px;
  transition: opacity var(--duration-fast);
}

.delete-btn:hover {
  opacity: 0.8;
}

.cancel-btn {
  background: transparent;
  border: none;
  color: var(--color-muted);
  font-weight: 600;
  font-size: var(--text-label);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  transition: color var(--duration-fast), background var(--duration-fast);
}

.cancel-btn:hover {
  color: var(--color-on-surface);
  background: var(--color-surface-container);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-standard);
}

.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card {
  transform: scale(0.94);
}
</style>
