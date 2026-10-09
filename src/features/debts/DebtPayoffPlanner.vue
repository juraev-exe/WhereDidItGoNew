<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { addMonths, format } from 'date-fns'
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
} from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { tickFeedback } from '@/services/native/haptics'
import type { Debt } from '@/types/finance'

const props = defineProps<{
  debts: Debt[]
}>()

const { t } = useI18n()

const isExpanded = ref(true)
const strategy = ref<'snowball' | 'avalanche'>('snowball')

interface SimulatedDebt extends Debt {
  remaining: number
  initialRemaining: number
}

interface PayoffStep {
  monthIndex: number
  dateStr: string
  remainingTotal: number
  settledDebts: string[]
}

interface PayoffItem {
  debt: Debt
  originalRemaining: number
  monthSettled: number
  dateStr: string
}

// Active borrowed debts
const borrowedDebts = computed<SimulatedDebt[]>(() => {
  return props.debts
    .filter((d) => d.type === 'borrowed' && d.status === 'active')
    .map((d) => {
      const remaining = Math.max(0, d.amount - d.paidAmount)
      return {
        ...d,
        remaining,
        initialRemaining: remaining,
      }
    })
    .filter((d) => d.remaining > 0)
})

const totalDebtRemaining = computed(() =>
  borrowedDebts.value.reduce((sum, d) => sum + d.remaining, 0),
)

// Default monthly payment allocation: ~15% of total or minimum $50
const defaultPayment = computed(() => {
  if (totalDebtRemaining.value === 0) return 0
  const candidate = Math.round(totalDebtRemaining.value * 0.15)
  return Math.max(5000, candidate)
})

const monthlyPayment = ref<number>(5000)

// Keep monthly payment in sync if debts change
watch(
  defaultPayment,
  (val) => {
    if (val > 0 && monthlyPayment.value === 5000) {
      monthlyPayment.value = val
    }
  },
  { immediate: true },
)

function setStrategy(s: 'snowball' | 'avalanche') {
  strategy.value = s
  void tickFeedback()
}

const simulation = computed(() => {
  if (borrowedDebts.value.length === 0 || monthlyPayment.value <= 0) {
    return {
      monthsCount: 0,
      debtFreeDate: '',
      steps: [] as PayoffStep[],
      payoffOrder: [] as PayoffItem[],
    }
  }

  // Clone debts and sort according to strategy
  const queue = borrowedDebts.value.map((d) => ({ ...d }))
  if (strategy.value === 'snowball') {
    // Smallest balance first
    queue.sort((a, b) => a.remaining - b.remaining)
  } else {
    // Largest balance first
    queue.sort((a, b) => b.remaining - a.remaining)
  }

  const steps: PayoffStep[] = []
  const payoffOrder: PayoffItem[] = []
  let monthIndex = 0
  const maxMonths = 120 // 10 year cap safety
  const paymentPerMonth = monthlyPayment.value
  const startDate = new Date()

  let currentRemaining = totalDebtRemaining.value

  while (currentRemaining > 0 && monthIndex < maxMonths) {
    monthIndex++
    const monthDate = addMonths(startDate, monthIndex)
    const dateStr = format(monthDate, 'MMM yyyy')

    let available = paymentPerMonth
    const newlySettled: string[] = []

    for (const item of queue) {
      if (item.remaining <= 0) continue

      if (available >= item.remaining) {
        available -= item.remaining
        item.remaining = 0
        newlySettled.push(item.personName)
        payoffOrder.push({
          debt: item,
          originalRemaining: item.initialRemaining,
          monthSettled: monthIndex,
          dateStr,
        })
      } else {
        item.remaining -= available
        available = 0
        break
      }
    }

    currentRemaining = queue.reduce((s, i) => s + i.remaining, 0)
    steps.push({
      monthIndex,
      dateStr,
      remainingTotal: currentRemaining,
      settledDebts: newlySettled,
    })
  }

  const debtFreeDate = steps.length > 0 ? steps[steps.length - 1].dateStr : ''

  return {
    monthsCount: monthIndex,
    debtFreeDate,
    steps,
    payoffOrder,
  }
})
</script>

<template>
  <section v-if="borrowedDebts.length > 0" class="payoff-planner-card surface-glass">
    <div class="planner-header" @click="isExpanded = !isExpanded; tickFeedback()">
      <div class="header-left">
        <div class="sparkle-wrap">
          <TrendingDown :size="18" class="text-emerald-400" />
        </div>
        <div>
          <h3 class="planner-title">
            {{ t('debts.payoffTitle', 'Debt Payoff Snowball & Avalanche') }}
          </h3>
          <p class="planner-subtitle">
            <template v-if="simulation.debtFreeDate">
              {{ t('debts.debtFreeBy', 'Debt-free by') }} <strong>{{ simulation.debtFreeDate }}</strong> ({{ simulation.monthsCount }} {{ t('common.mo', 'mo') }})
            </template>
            <template v-else>
              {{ t('debts.payoffCalcDesc', 'Interactive payoff timeline calculator') }}
            </template>
          </p>
        </div>
      </div>

      <button type="button" class="icon-toggle-btn" :aria-label="isExpanded ? 'Collapse' : 'Expand'">
        <ChevronUp v-if="isExpanded" :size="18" />
        <ChevronDown v-else :size="18" />
      </button>
    </div>

    <div v-if="isExpanded" class="planner-body">
      <!-- Strategy Selector -->
      <div class="strategy-switcher">
        <button
          type="button"
          class="strategy-btn"
          :class="{ active: strategy === 'snowball' }"
          @click="setStrategy('snowball')"
        >
          <ArrowDownNarrowWide :size="14" />
          <span>{{ t('debts.strategySnowball', 'Snowball (Smallest First)') }}</span>
        </button>
        <button
          type="button"
          class="strategy-btn"
          :class="{ active: strategy === 'avalanche' }"
          @click="setStrategy('avalanche')"
        >
          <ArrowUpNarrowWide :size="14" />
          <span>{{ t('debts.strategyAvalanche', 'Avalanche (Largest First)') }}</span>
        </button>
      </div>

      <!-- Monthly Payment Allocation Slider / Input -->
      <div class="allocation-row">
        <div class="allocation-meta">
          <span class="alloc-label">{{ t('debts.monthlyBudgetLabel', 'Monthly Repayment Budget:') }}</span>
          <strong class="alloc-amount">
            <MoneyText :amount="monthlyPayment" /> / {{ t('common.mo', 'mo') }}
          </strong>
        </div>

        <input
          v-model.number="monthlyPayment"
          type="range"
          :min="Math.max(1000, Math.round(totalDebtRemaining * 0.02))"
          :max="totalDebtRemaining"
          :step="1000"
          class="payment-range"
        />
      </div>

      <!-- Debt-Free Projection Highlight -->
      <div class="projection-banner">
        <div class="banner-icon">
          <Sparkles :size="20" class="text-amber-400" />
        </div>
        <div class="banner-info">
          <p class="banner-title">
            {{ t('debts.projectedDebtFree', 'Projected Debt-Free:') }} <span class="highlight-date">{{ simulation.debtFreeDate }}</span>
          </p>
          <p class="banner-sub">
            {{ t('debts.payoffProjectionStart', 'At') }} <MoneyText :amount="monthlyPayment" />/{{ t('common.mo', 'mo') }}, {{ t('debts.payoffProjectionEnd', { count: borrowedDebts.length, months: simulation.monthsCount }) }}
          </p>
        </div>
      </div>

      <!-- Payoff Sequence Steps -->
      <div class="payoff-sequence">
        <h4 class="sequence-title">{{ t('debts.plannedSequence', 'Planned Payoff Sequence:') }}</h4>
        <div class="sequence-list">
          <div
            v-for="(item, idx) in simulation.payoffOrder"
            :key="item.debt.id"
            class="sequence-item"
          >
            <div class="step-num">{{ idx + 1 }}</div>
            <div class="step-details">
              <strong>{{ item.debt.personName }}</strong>
              <small>{{ item.dateStr }} ({{ t('common.month', 'Month') }} {{ item.monthSettled }})</small>
            </div>
            <div class="step-amount">
              <MoneyText :amount="item.originalRemaining" />
              <CheckCircle2 :size="14" class="text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.payoff-planner-card {
  border-radius: var(--radius-xl, 1.25rem);
  padding: 1.15rem;
  margin-bottom: var(--space-4, 1.25rem);
  border: 1px solid var(--color-outline-variant, rgba(255, 255, 255, 0.12));
  background: var(--color-surface-container, rgba(255, 255, 255, 0.04));
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.planner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sparkle-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
}

.planner-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-on-surface, #fff);
  margin: 0;
}

.planner-subtitle {
  font-size: 0.75rem;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.65));
  margin: 0;
}

.icon-toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.6));
  cursor: pointer;
  padding: 4px;
}

.planner-body {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.strategy-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 3px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.strategy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.7));
  cursor: pointer;
  transition: all 0.2s ease;
}

.strategy-btn.active {
  background: var(--color-surface, rgba(255, 255, 255, 0.15));
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.allocation-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.allocation-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.alloc-label {
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.7));
}

.alloc-amount {
  color: var(--color-primary, #60a5fa);
}

.payment-range {
  width: 100%;
  accent-color: var(--color-primary, #3b82f6);
  cursor: pointer;
}

.projection-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.12));
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.banner-icon {
  flex-shrink: 0;
}

.banner-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
}

.highlight-date {
  color: #34d399;
}

.banner-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.75);
  margin: 0.15rem 0 0;
}

.payoff-sequence {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.sequence-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, rgba(255, 255, 255, 0.7));
  margin: 0;
}

.sequence-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sequence-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.8rem;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.step-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 0 0.65rem;
}

.step-details strong {
  color: #fff;
  font-size: 0.8rem;
}

.step-details small {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
}

.step-amount {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--color-on-surface);
}
</style>
