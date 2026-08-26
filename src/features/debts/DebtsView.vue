<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import { useDebtsStore } from '@/stores/debts'
import { useSettingsStore } from '@/stores/settings'
import { errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { parseMoneyToMinor } from '@/lib/money'
import { shortDayLabel, todayISO } from '@/lib/dates'
import { differenceInCalendarDays } from 'date-fns'
import { parseLocalDay } from '@/lib/dates'
import HeaderActions from '@/components/ui/HeaderActions.vue'
import DebtFormModal from './DebtFormModal.vue'
import type { Debt } from '@/types/finance'

type Filter = 'active' | 'lent' | 'borrowed' | 'settled'

const { t } = useI18n()
const debtsStore = useDebtsStore()
const settingsStore = useSettingsStore()

const showFormModal = ref(false)
const editingDebt = ref<Debt | null>(null)
const filter = ref<Filter>('active')
const selectedDebt = ref<Debt | null>(null)
const paymentStr = ref('')
const paymentError = ref('')
const showPaymentSheet = ref(false)
const pendingDelete = ref<Debt | null>(null)

function setFilter(next: Filter) {
  if (filter.value === next) return
  filter.value = next
  void tickFeedback()
}

onMounted(() => debtsStore.start())
onUnmounted(() => debtsStore.stop())

const filteredDebts = computed(() => {
  if (filter.value === 'lent') {
    return debtsStore.debts.filter((d) => d.type === 'lent' && d.status === 'active')
  }
  if (filter.value === 'borrowed') {
    return debtsStore.debts.filter((d) => d.type === 'borrowed' && d.status === 'active')
  }
  if (filter.value === 'settled') return debtsStore.settledDebts
  return debtsStore.activeDebts
})

interface DebtRow {
  debt: Debt
  remaining: number
  percent: number
  dueLabel: string
  dueTone: 'overdue' | 'soon' | 'normal' | ''
}

const rows = computed<DebtRow[]>(() =>
  filteredDebts.value.map((debt) => {
    const remaining = Math.max(0, debt.amount - debt.paidAmount)
    const percent = debt.amount > 0 ? Math.min(100, (debt.paidAmount / debt.amount) * 100) : 0
    let dueLabel = ''
    let dueTone: DebtRow['dueTone'] = ''
    if (debt.dueDate && debt.status === 'active') {
      const days = differenceInCalendarDays(parseLocalDay(debt.dueDate), parseLocalDay(todayISO()))
      if (days < 0) {
        dueLabel = t('debts.overdue')
        dueTone = 'overdue'
      } else if (days === 0) {
        dueLabel = t('debts.dueToday')
        dueTone = 'soon'
      } else if (days <= 7) {
        dueLabel = t('debts.dueIn', { count: days })
        dueTone = 'soon'
      } else {
        dueLabel = shortDayLabel(debt.dueDate, settingsStore.intlLocale)
        dueTone = 'normal'
      }
    } else if (debt.dueDate) {
      dueLabel = shortDayLabel(debt.dueDate, settingsStore.intlLocale)
      dueTone = 'normal'
    }
    return { debt, remaining, percent, dueLabel, dueTone }
  }),
)

function openNew() {
  editingDebt.value = null
  showFormModal.value = true
  void tickFeedback()
}

function openEdit(debt: Debt) {
  editingDebt.value = debt
  showFormModal.value = true
  void tickFeedback()
}

function openPaymentModal(debt: Debt) {
  selectedDebt.value = debt
  paymentStr.value = ((debt.amount - debt.paidAmount) / 100).toFixed(2)
  paymentError.value = ''
  showPaymentSheet.value = true
}

const paymentRemaining = computed(() =>
  selectedDebt.value ? selectedDebt.value.amount - selectedDebt.value.paidAmount : 0,
)

async function handleRecordPayment() {
  const debt = selectedDebt.value
  if (!debt) return
  const amount = parseMoneyToMinor(paymentStr.value)
  if (amount <= 0) {
    paymentError.value = t('debts.amountRequired')
    void errorFeedback()
    return
  }
  if (amount > paymentRemaining.value) {
    paymentError.value = t('debts.paymentTooLarge')
    void errorFeedback()
    return
  }
  await debtsStore.recordPayment(debt.id, amount)
  showPaymentSheet.value = false
  selectedDebt.value = null
  void successFeedback()
}

function settleFull() {
  paymentStr.value = (paymentRemaining.value / 100).toFixed(2)
  paymentError.value = ''
  void tickFeedback()
}

async function confirmDelete() {
  const debt = pendingDelete.value
  if (!debt) return
  pendingDelete.value = null
  await debtsStore.deleteDebt(debt.id)
  void warningFeedback()
}
</script>

<template>
  <div class="debts">
    <header class="debts-header">
      <div class="title-row">
        <h1>{{ t('debts.title') }}</h1>
        <HeaderActions />
      </div>

      <div class="seg" role="tablist" :aria-label="t('debts.title')">
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'active' }"
          :aria-selected="filter === 'active'"
          @click="setFilter('active')"
        >
          {{ t('debts.statusActive') }} ({{ debtsStore.activeDebts.length }})
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'lent' }"
          :aria-selected="filter === 'lent'"
          @click="setFilter('lent')"
        >
          {{ t('debts.lent') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'borrowed' }"
          :aria-selected="filter === 'borrowed'"
          @click="setFilter('borrowed')"
        >
          {{ t('debts.borrowed') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'settled' }"
          :aria-selected="filter === 'settled'"
          @click="setFilter('settled')"
        >
          {{ t('debts.statusSettled') }}
        </button>
      </div>
    </header>

    <div class="summary">
      <div>
        <span>{{ t('debts.lent') }}</span>
        <strong class="lent-val"><MoneyText :amount="debtsStore.totalLent" /></strong>
      </div>
      <div>
        <span>{{ t('debts.borrowed') }}</span>
        <strong class="borrowed-val"><MoneyText :amount="debtsStore.totalBorrowed" /></strong>
      </div>
      <div>
        <span>{{ t('debts.net') }}</span>
        <strong :class="debtsStore.netDebt < 0 ? 'borrowed-val' : 'lent-val'">
          <MoneyText :amount="debtsStore.netDebt" />
        </strong>
      </div>
    </div>

    <EmptyState
      v-if="!rows.length"
      :title="t('debts.title')"
      :description="t('debts.empty')"
      :action-label="t('debts.addDebt')"
      @action="openNew"
    >
      <template #icon>
        <IconByName name="hand-coins" :size="28" />
      </template>
    </EmptyState>

    <div v-else class="list">
      <div v-for="row in rows" :key="row.debt.id" class="card">
        <button type="button" class="card-top" @click="openEdit(row.debt)">
          <span
            class="avatar-icon"
            :class="row.debt.type === 'lent' ? 'avatar-lent' : 'avatar-borrowed'"
            aria-hidden="true"
          >
            {{ row.debt.personName.charAt(0).toUpperCase() }}
          </span>

          <span class="meta">
            <span class="meta-row">
              <strong class="person-name">{{ row.debt.personName }}</strong>
              <span
                class="type-pill"
                :class="row.debt.type === 'lent' ? 'pill-lent' : 'pill-borrowed'"
              >
                {{ row.debt.type === 'lent' ? t('debts.lent') : t('debts.borrowed') }}
              </span>
            </span>
            <span class="sub-meta">
              <span v-if="row.dueLabel" class="due-date" :class="`due--${row.dueTone}`">
                <IconByName name="calendar" :size="12" />
                {{ row.dueLabel }}
              </span>
              <span v-if="row.debt.note" class="note-text">{{ row.debt.note }}</span>
            </span>
          </span>

          <span class="amounts">
            <span class="remaining" :class="row.debt.type === 'lent' ? 'lent-val' : 'borrowed-val'">
              <MoneyText :amount="row.remaining" />
            </span>
            <span class="total-orig">
              {{ t('common.of') }} <MoneyText :amount="row.debt.amount" />
            </span>
          </span>
        </button>

        <ProgressBar
          v-if="row.debt.amount > 0"
          :value="row.percent"
          :color="row.debt.type === 'lent' ? 'var(--color-income)' : 'var(--color-expense)'"
        />

        <div class="card-actions">
          <button
            v-if="row.debt.status === 'active'"
            type="button"
            class="action-btn pay-btn"
            @click="openPaymentModal(row.debt)"
          >
            <IconByName name="check-circle-2" :size="16" />
            <span>{{ t('debts.recordPayment') }}</span>
          </button>
          <span v-else class="settled-tag">
            <IconByName name="check-circle-2" :size="16" class="text-income" />
            <span>{{ t('debts.statusSettled') }}</span>
          </span>

          <button
            type="button"
            class="action-btn delete-btn"
            :aria-label="t('common.delete')"
            @click="pendingDelete = row.debt"
          >
            <IconByName name="trash-2" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <section v-if="rows.length" class="section">
      <div class="chips">
        <button type="button" class="chip" @click="openNew">
          <IconByName name="plus" :size="16" />
          {{ t('debts.addDebt') }}
        </button>
      </div>
    </section>

    <DebtFormModal
      v-if="showFormModal"
      :debt="editingDebt"
      @close="showFormModal = false"
      @saved="editingDebt = null"
    />

    <BottomSheet
      :open="showPaymentSheet"
      :title="`${t('debts.recordPayment')} — ${selectedDebt?.personName ?? ''}`"
      @close="showPaymentSheet = false"
    >
      <div v-if="selectedDebt" class="sheet-form">
        <p class="sheet-hint">
          {{ t('debts.remaining') }}: <MoneyText :amount="paymentRemaining" />
        </p>
        <label class="field">
          <span>{{ t('debts.enterPayment') }} ({{ settingsStore.currencySymbol }})</span>
          <input
            v-model="paymentStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <button type="button" class="link-btn" @click="settleFull">
          {{ t('debts.settleFull') }}
        </button>
        <p v-if="paymentError" class="error-msg" role="alert">{{ paymentError }}</p>
        <AppButton block size="lg" @click="handleRecordPayment">
          {{ t('common.save') }}
        </AppButton>
      </div>
    </BottomSheet>

    <ConfirmSheet
      :open="Boolean(pendingDelete)"
      :title="t('common.delete')"
      :message="t('debts.deleteConfirm')"
      :confirm-label="t('common.delete')"
      destructive
      @confirm="confirmDelete"
      @close="pendingDelete = null"
    />
  </div>
</template>

<style scoped>
.debts {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-bottom: var(--space-6);
}

.debts-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

h1 {
  font-size: var(--text-headline);
  font-family: var(--font-display);
  font-weight: 600;
  line-height: var(--leading-tight);
  margin: 0;
  min-width: 0;
  color: var(--color-on-surface);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-label);
  font-weight: 550;
  border: none;
  cursor: pointer;
}

/* Segmented Pill Navigation matching Budgets style */
.seg {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-caption);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-normal) var(--ease-emphasized),
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

/* Summary Cards matching Budgets style */
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  border: 1px solid color-mix(in srgb, var(--color-outline) 12%, transparent);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.summary span {
  display: block;
  font-size: var(--text-caption);
  color: var(--color-muted);
  margin-bottom: 4px;
  font-weight: 600;
}

.summary strong {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-title);
  min-width: 0;
  overflow-wrap: anywhere;
}

.lent-val {
  color: var(--color-income);
}

.borrowed-val {
  color: var(--color-expense);
}

/* List & Cards */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: scaleSpring var(--duration-entrance) var(--ease-emphasized) both;
  animation-delay: 80ms;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-outline) 14%, transparent);
  box-shadow: var(--shadow-sm);
  text-align: left;
  width: 100%;
  transition: transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast) var(--ease-standard);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.avatar-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: var(--text-body);
}

.avatar-lent {
  background: color-mix(in srgb, var(--color-income) 18%, transparent);
  color: var(--color-income);
}

.avatar-borrowed {
  background: color-mix(in srgb, var(--color-expense) 18%, transparent);
  color: var(--color-expense);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.person-name {
  font-weight: 600;
  font-size: var(--text-body);
  color: var(--color-on-surface);
}

.type-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  letter-spacing: 0.04em;
}

.pill-lent {
  background: color-mix(in srgb, var(--color-income) 14%, transparent);
  color: var(--color-income);
}

.pill-borrowed {
  background: color-mix(in srgb, var(--color-expense) 14%, transparent);
  color: var(--color-expense);
}

.sub-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.note-text {
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amounts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.remaining {
  font-size: var(--text-body);
  font-weight: 700;
}

.total-orig {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-outline-variant);
  padding-top: var(--space-2);
  margin-top: 2px;
}

.action-btn {
  background: transparent;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  cursor: pointer;
  padding: 4px;
}

.pay-btn {
  color: var(--color-primary);
  font-weight: 600;
}

.settled-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
  color: var(--color-income);
  font-weight: 600;
}

.delete-btn {
  color: var(--color-muted);
}

.text-income {
  color: var(--color-income);
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field span {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.field input {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-size: var(--text-body);
}

.card-top {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
}

.amounts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.due--overdue {
  color: var(--color-expense);
  font-weight: 700;
}

.due--soon {
  color: var(--color-warning);
  font-weight: 650;
}

.sheet-hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.link-btn {
  align-self: flex-start;
  font-size: var(--text-caption);
  font-weight: 650;
  color: var(--color-primary);
}

.error-msg {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-error);
}
</style>
