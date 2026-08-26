<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import MonthNav from '@/components/ui/MonthNav.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import Snackbar from '@/components/ui/Snackbar.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import GoalsSection from '@/features/budgets/GoalsSection.vue'
import RecurringSection from '@/features/recurring/RecurringSection.vue'
import { monthKey, previousMonthKey } from '@/lib/dates'
import { parseMoneyToMinor } from '@/lib/money'
import { budgetProgress } from '@/services/stats'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import HeaderActions from '@/components/ui/HeaderActions.vue'
import { tickFeedback } from '@/services/native/haptics'

const { t } = useI18n()
const budgets = useBudgetsStore()
const categories = useCategoriesStore()
const transactions = useTransactionsStore()
const settings = useSettingsStore()

const month = ref(monthKey())
const pane = ref<'monthly' | 'recurring' | 'goals'>('monthly')
function setPane(next: 'monthly' | 'recurring' | 'goals') {
  if (pane.value === next) return
  pane.value = next
  void tickFeedback()
}
const sheetOpen = ref(false)
const editCategoryId = ref('')
const limitStr = ref('')
const snackOpen = ref(false)
const snackNonce = ref('')

watch(
  month,
  async (next) => {
    const copied = await budgets.carryForwardIfNeeded(next)
    if (copied === 'copied') {
      snackNonce.value = `${next}-${Date.now()}`
      snackOpen.value = true
    }
  },
  { immediate: true },
)

const rows = computed(() =>
  budgetProgress(budgets.budgets, transactions.transactions, categories.categories, month.value),
)

const prevMonth = computed(() => previousMonthKey(month.value))
const canCopyLast = computed(
  () => !rows.value.length && budgets.forMonth(prevMonth.value).length > 0,
)

async function copyLastMonth() {
  await budgets.copyMonth(prevMonth.value, month.value)
  void tickFeedback()
}

async function undoCopy() {
  await budgets.clearMonth(month.value)
  await budgets.skipCarry(month.value)
  snackOpen.value = false
}

const unbudgeted = computed(() => {
  const set = new Set(rows.value.map((r) => r.category.id))
  return categories.expense.filter((c) => !set.has(c.id))
})

const totalLimit = computed(() => rows.value.reduce((s, r) => s + r.budget.limitAmount, 0))
const totalSpent = computed(() => rows.value.reduce((s, r) => s + r.spent, 0))
const totalRemaining = computed(() => totalLimit.value - totalSpent.value)

function openEdit(categoryId: string, currentLimit = 0) {
  editCategoryId.value = categoryId
  limitStr.value = currentLimit > 0 ? (currentLimit / 100).toFixed(2) : ''
  sheetOpen.value = true
}

async function saveBudget() {
  const amount = parseMoneyToMinor(limitStr.value)
  await budgets.upsertBudget(editCategoryId.value, amount, month.value)
  sheetOpen.value = false
}

const editCategory = computed(() => categories.byId(editCategoryId.value))
</script>

<template>
  <div class="budgets">
    <header>
      <div class="title-row">
        <h1>{{ t('budgets.title') }}</h1>
        <HeaderActions />
      </div>
      <div class="seg" role="tablist" :aria-label="t('budgets.title')">
        <button
          type="button"
          role="tab"
          :class="{ active: pane === 'monthly' }"
          :aria-selected="pane === 'monthly'"
          @click="setPane('monthly')"
        >
          {{ t('budgets.monthly') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: pane === 'recurring' }"
          :aria-selected="pane === 'recurring'"
          @click="setPane('recurring')"
        >
          {{ t('recurring.tab') }}
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: pane === 'goals' }"
          :aria-selected="pane === 'goals'"
          @click="setPane('goals')"
        >
          {{ t('goals.title') }}
        </button>
      </div>
      <MonthNav v-if="pane === 'monthly'" v-model="month" />
    </header>

    <GoalsSection v-if="pane === 'goals'" />
    <RecurringSection v-else-if="pane === 'recurring'" />

    <template v-else>

    <div v-if="rows.length" class="summary">
      <div>
        <span>{{ t('budgets.spent') }}</span>
        <strong><MoneyText :amount="totalSpent" /></strong>
      </div>
      <div>
        <span>{{ t('budgets.budgeted') }}</span>
        <strong><MoneyText :amount="totalLimit" /></strong>
      </div>
      <div>
        <span>{{ totalRemaining < 0 ? t('budgets.over') : t('budgets.remainingLabel') }}</span>
        <strong :class="totalRemaining < 0 ? 'over' : 'under'">
          <MoneyText :amount="Math.abs(totalRemaining)" />
        </strong>
      </div>
    </div>

    <EmptyState
      v-if="!rows.length"
      :title="t('budgets.emptyTitle')"
      :description="t('budgets.emptyDesc')"
      :action-label="canCopyLast ? t('budgets.copyLastMonth') : t('budgets.addBudget')"
      @action="canCopyLast ? copyLastMonth() : unbudgeted[0] && openEdit(unbudgeted[0].id)"
    >
      <template #icon>
        <IconByName name="piggy-bank" :size="28" />
      </template>
    </EmptyState>

    <div v-else class="list">
      <button
        v-for="row in rows"
        :key="row.budget.id"
        type="button"
        class="card"
        @click="openEdit(row.category.id, row.budget.limitAmount)"
      >
        <div class="card-top">
          <span class="icon" :style="{ background: `color-mix(in srgb, ${row.category.color} 22%, transparent)` }">
            <IconByName :name="row.category.icon" :size="18" />
          </span>
          <div class="meta">
            <strong>{{ row.category.name }}</strong>
            <span>
              <MoneyText :amount="row.spent" /> {{ t('common.of') }}
              <MoneyText :amount="row.budget.limitAmount" />
            </span>
          </div>
          <span class="remain" :class="{ over: row.remaining < 0 }">
            {{ row.remaining < 0 ? t('budgets.over') : t('budgets.left') }}
            <MoneyText :amount="Math.abs(row.remaining)" />
          </span>
        </div>
        <ProgressBar
          :value="row.percent"
          :color="row.percent > 100 ? 'var(--color-expense)' : row.category.color"
        />
      </button>
    </div>

    <section v-if="unbudgeted.length" class="section">
      <h2>{{ t('budgets.addCategoryBudget') }}</h2>
      <div class="chips">
        <button
          v-for="c in unbudgeted"
          :key="c.id"
          type="button"
          class="chip"
          @click="openEdit(c.id)"
        >
          <IconByName :name="c.icon" :size="16" />
          {{ c.name }}
        </button>
      </div>
    </section>

    <BottomSheet :open="sheetOpen" :title="t('budgets.sheetTitle')" @close="sheetOpen = false">
      <div class="sheet">
        <p class="cat-name">{{ editCategory?.name }}</p>
        <label class="field">
          <span>{{ t('budgets.monthlyLimit', { currency: settings.currency }) }}</span>
          <input
            v-model="limitStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
        <p class="hint">{{ t('budgets.removeHint') }}</p>
        <AppButton block size="lg" @click="saveBudget">{{ t('budgets.saveBudget') }}</AppButton>
      </div>
    </BottomSheet>

    <Snackbar
      :open="snackOpen"
      :message="t('home.copiedBudgets')"
      :action-label="t('common.undo')"
      :nonce="snackNonce"
      @update:open="snackOpen = $event"
      @action="undoCopy"
    />
    </template>
  </div>
</template>

<style scoped>
.summary strong.over {
  color: var(--color-expense);
}

.summary strong.under {
  color: var(--color-income);
}

.budgets {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

h1 {
  font-size: var(--text-headline);
  margin-bottom: var(--space-3);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-1);
  padding: 4px;
  margin-bottom: var(--space-3);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 40px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  white-space: nowrap;
  padding: 0 var(--space-1);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-spring-snappy);
}

.seg button:active {
  transform: scale(0.95);
}

@media (max-width: 360px) {
  .seg button {
    font-size: 0.75rem;
  }
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.seg button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-outline) 14%, transparent);
  box-shadow: var(--shadow-sm);
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
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-display);
  font-size: var(--text-title);
}

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
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast) var(--ease-standard);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card:active {
  transform: scale(0.985) translateY(0);
}

.card-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  transition: transform var(--duration-fast) var(--ease-spring);
}

.card:hover .icon {
  transform: scale(1.08);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.meta span {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.remain {
  font-size: var(--text-label);
  font-weight: 650;
  color: var(--color-income);
  text-align: right;
}

.remain.over {
  color: var(--color-expense);
}

.section h2 {
  font-size: var(--text-title);
  margin-bottom: var(--space-3);
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
  border: 1px solid var(--color-outline-variant);
  font-size: var(--text-label);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy), background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .chip:hover {
    background: var(--color-surface-container-high);
    transform: translateY(-1px);
    border-color: var(--color-primary);
  }
}

.chip:active {
  transform: scale(0.95) translateY(0);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.cat-name {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
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
  border: 1.5px solid var(--color-outline-variant);
  background: var(--color-surface);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.field input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}
</style>
