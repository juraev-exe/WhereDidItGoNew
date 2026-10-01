<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDownLeft, ArrowUpRight, Calendar, Sparkles, X } from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { tickFeedback } from '@/services/native/haptics'
import {
  spendSeries,
  type DaySpend,
  type SeriesBucket,
  type StatsRange,
} from '@/services/stats'
import { useSettingsStore } from '@/stores/settings'
import type { Transaction } from '@/types/finance'

const props = defineProps<{
  transactions: Transaction[]
  range: StatsRange
  suggestedBucket?: SeriesBucket
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const bucket = ref<SeriesBucket>(props.suggestedBucket ?? 'day')
const selectedIndex = ref<number | null>(null)

watch(
  () => props.suggestedBucket,
  (next) => {
    if (next) bucket.value = next
  },
)

// Reset selection on range or bucket change
watch([() => props.range, bucket], () => {
  selectedIndex.value = null
})

function setBucket(b: SeriesBucket) {
  if (bucket.value === b) return
  bucket.value = b
  selectedIndex.value = null
  void tickFeedback()
}

const series = computed(() =>
  spendSeries(props.transactions, props.range, bucket.value, settings.intlLocale),
)

const totals = computed(() => {
  let inflow = 0
  let outflow = 0
  for (const row of series.value) {
    inflow += row.income
    outflow += row.expense
  }
  return {
    inflow,
    outflow,
    net: inflow - outflow,
  }
})

const maxVal = computed(() => {
  let m = 0
  for (const row of series.value) {
    if (row.income > m) m = row.income
    if (row.expense > m) m = row.expense
  }
  return Math.max(m, 1)
})

const selectedRow = computed<DaySpend | null>(() => {
  if (selectedIndex.value === null) return null
  return series.value[selectedIndex.value] ?? null
})

function onSelectPoint(idx: number) {
  if (selectedIndex.value === idx) {
    selectedIndex.value = null
  } else {
    selectedIndex.value = idx
    void tickFeedback()
  }
}

function barHeight(val: number): string {
  if (val <= 0) return '0%'
  const pct = Math.max(8, (val / maxVal.value) * 100)
  return `${pct}%`
}

function showTick(idx: number): boolean {
  const n = series.value.length
  if (n <= 8) return true
  if (n <= 14) return idx === 0 || idx === n - 1 || idx % 2 === 0
  if (n <= 31) return idx === 0 || idx === n - 1 || idx % 5 === 0
  return idx === 0 || idx === n - 1 || idx % Math.floor(n / 6) === 0
}

function formatTickLabel(row: DaySpend): string {
  if (bucket.value === 'month') return row.label
  if (row.date.length >= 10 && series.value.length > 10) {
    return String(Number.parseInt(row.date.slice(8, 10), 10))
  }
  return row.label
}
</script>

<template>
  <section class="cashflow-card surface-glass" :aria-label="t('insights.cashFlow')">
    <div class="card-header">
      <div class="header-titles">
        <h2>{{ t('insights.cashFlow') }}</h2>
        <p class="lede">{{ t('insights.cashFlowLede') }}</p>
      </div>

      <div class="bucket-seg" role="tablist" :aria-label="t('insights.cashFlow')">
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ active: bucket === 'day' }"
          :aria-selected="bucket === 'day'"
          @click="setBucket('day')"
        >
          {{ t('insights.bucketDaily') }}
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ active: bucket === 'week' }"
          :aria-selected="bucket === 'week'"
          @click="setBucket('week')"
        >
          {{ t('insights.bucketWeekly') }}
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="{ active: bucket === 'month' }"
          :aria-selected="bucket === 'month'"
          @click="setBucket('month')"
        >
          {{ t('insights.bucketMonthly') }}
        </button>
      </div>
    </div>

    <!-- Quick stats overview pill -->
    <div class="totals-bar">
      <div class="total-metric">
        <span class="metric-label">
          <ArrowDownLeft :size="14" class="icon-in" />
          {{ t('insights.inflow') }}
        </span>
        <strong class="metric-val in-val">
          <MoneyText :amount="totals.inflow" signed="income" />
        </strong>
      </div>

      <div class="total-divider" aria-hidden="true" />

      <div class="total-metric">
        <span class="metric-label">
          <ArrowUpRight :size="14" class="icon-out" />
          {{ t('insights.outflow') }}
        </span>
        <strong class="metric-val out-val">
          <MoneyText :amount="totals.outflow" signed="expense" />
        </strong>
      </div>

      <div class="total-divider" aria-hidden="true" />

      <div class="total-metric">
        <span class="metric-label">{{ t('insights.netFlow') }}</span>
        <strong
          class="metric-val"
          :class="totals.net >= 0 ? 'net-pos' : 'net-neg'"
        >
          <MoneyText :amount="totals.net" :signed="totals.net >= 0 ? 'income' : 'expense'" />
        </strong>
      </div>
    </div>

    <!-- Interactive inspection popover badge -->
    <transition name="pop">
      <div v-if="selectedRow" class="inspector-badge">
        <div class="inspector-head">
          <span class="inspector-date">
            <Calendar :size="13" />
            {{ selectedRow.label }}
          </span>
          <button
            type="button"
            class="inspector-close"
            :aria-label="t('insights.drillDownClose')"
            @click="selectedIndex = null"
          >
            <X :size="14" />
          </button>
        </div>
        <div class="inspector-metrics">
          <div class="inspector-item">
            <span class="dot-in" />
            <span class="inspector-label">{{ t('insights.inflow') }}:</span>
            <strong><MoneyText :amount="selectedRow.income" signed="income" /></strong>
          </div>
          <div class="inspector-item">
            <span class="dot-out" />
            <span class="inspector-label">{{ t('insights.outflow') }}:</span>
            <strong><MoneyText :amount="selectedRow.expense" signed="expense" /></strong>
          </div>
          <div class="inspector-item">
            <span class="dot-net" :class="(selectedRow.net ?? 0) >= 0 ? 'net-pos-bg' : 'net-neg-bg'" />
            <span class="inspector-label">{{ t('insights.netFlow') }}:</span>
            <strong :class="(selectedRow.net ?? 0) >= 0 ? 'net-pos' : 'net-neg'">
              <MoneyText :amount="selectedRow.net ?? 0" :signed="(selectedRow.net ?? 0) >= 0 ? 'income' : 'expense'" />
            </strong>
          </div>
        </div>
      </div>
    </transition>

    <!-- Chart visualization -->
    <div
      v-if="series.length && (totals.inflow > 0 || totals.outflow > 0)"
      class="chart-container"
      role="img"
      :aria-label="t('insights.cashFlowLede')"
    >
      <div class="chart-scroll">
        <div class="chart-columns">
          <div
            v-for="(row, idx) in series"
            :key="row.date"
            class="column-slot"
            :class="{ active: selectedIndex === idx }"
            tabindex="0"
            role="button"
            :aria-label="`${row.label}: +${row.income}, -${row.expense}`"
            @click="onSelectPoint(idx)"
            @keydown.enter="onSelectPoint(idx)"
            @keydown.space.prevent="onSelectPoint(idx)"
          >
            <div class="bar-pair">
              <!-- Inflow Bar -->
              <span
                class="bar bar-in"
                :style="{ height: barHeight(row.income) }"
                :title="`+${row.income}`"
              />
              <!-- Outflow Bar -->
              <span
                class="bar bar-out"
                :style="{ height: barHeight(row.expense) }"
                :title="`-${row.expense}`"
              />
            </div>
            <span class="tick-label" :class="{ ghost: !showTick(idx) }">
              {{ formatTickLabel(row) }}
            </span>
          </div>
        </div>
      </div>

      <div class="chart-legend">
        <span class="legend-item">
          <span class="legend-swatch in-swatch" />
          {{ t('insights.inflow') }}
        </span>
        <span class="legend-item">
          <span class="legend-swatch out-swatch" />
          {{ t('insights.outflow') }}
        </span>
        <span class="legend-hint">
          {{ t('insights.inspectHint') }}
        </span>
      </div>
    </div>

    <!-- Empty state when no activity -->
    <div v-else class="chart-empty">
      <Sparkles :size="24" class="empty-icon" />
      <p>{{ t('insights.noTransactions') }}</p>
    </div>
  </section>
</template>

<style scoped>
.cashflow-card {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (min-width: 480px) {
  .card-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.header-titles h2 {
  font-size: var(--text-title);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.lede {
  font-size: var(--text-body);
  color: var(--color-muted);
  margin-top: 2px;
}

.bucket-seg {
  display: flex;
  gap: 3px;
  background: var(--color-surface-container);
  padding: 3px;
  border-radius: var(--radius-full);
  align-self: flex-start;
}

@media (min-width: 480px) {
  .bucket-seg {
    align-self: center;
  }
}

.seg-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-muted);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
  white-space: nowrap;
}

.seg-btn:hover {
  color: var(--color-on-surface);
}

.seg-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Totals Overview */
.totals-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface-container);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  gap: var(--space-2);
}

.total-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 550;
  color: var(--color-muted);
}

.icon-in {
  color: var(--color-income);
}

.icon-out {
  color: var(--color-expense);
}

.metric-val {
  font-size: 0.9375rem;
  font-weight: 700;
}

.in-val {
  color: var(--color-income);
}

.out-val {
  color: var(--color-expense);
}

.net-pos {
  color: var(--color-income);
}

.net-neg {
  color: var(--color-expense);
}

.total-divider {
  width: 1px;
  height: 28px;
  background: var(--color-outline-variant);
  opacity: 0.4;
}

/* Inspector popover */
.inspector-badge {
  background: var(--color-surface-container-high);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.inspector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inspector-date {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 650;
  color: var(--color-on-surface);
}

.inspector-close {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.inspector-close:hover {
  background: var(--color-surface-container);
  color: var(--color-on-surface);
}

.inspector-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.inspector-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
}

.dot-in {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-income);
  flex-shrink: 0;
}

.dot-out {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-expense);
  flex-shrink: 0;
}

.dot-net {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.net-pos-bg {
  background: var(--color-income);
}

.net-neg-bg {
  background: var(--color-expense);
}

.inspector-label {
  color: var(--color-muted);
}

/* Chart Canvas */
.chart-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chart-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.chart-columns {
  display: flex;
  align-items: flex-end;
  height: 140px;
  gap: 6px;
  min-width: 100%;
  padding: 0 4px;
}

.column-slot {
  flex: 1 1 0;
  min-width: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 2px;
  transition: background var(--duration-fast);
}

.column-slot:hover,
.column-slot:focus-visible {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  outline: none;
}

.column-slot.active {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.column-slot.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
}

.bar-pair {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 100%;
  height: 110px;
  justify-content: center;
}

.bar {
  flex: 1;
  max-width: 10px;
  border-radius: 4px 4px 1px 1px;
  transition: height var(--duration-slow) var(--ease-emphasized);
}

.bar-in {
  background: var(--color-income);
  opacity: 0.85;
}

.column-slot.active .bar-in,
.column-slot:hover .bar-in {
  opacity: 1;
}

.bar-out {
  background: var(--color-expense);
  opacity: 0.85;
}

.column-slot.active .bar-out,
.column-slot:hover .bar-out {
  opacity: 1;
}

.tick-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-muted);
  margin-top: 6px;
  white-space: nowrap;
}

.tick-label.ghost {
  visibility: hidden;
}

/* Legend */
.chart-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
  font-size: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--color-muted);
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.in-swatch {
  background: var(--color-income);
}

.out-swatch {
  background: var(--color-expense);
}

.legend-hint {
  color: var(--color-muted);
  font-style: italic;
  font-size: 0.6875rem;
}

.chart-empty {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-muted);
  text-align: center;
}

.empty-icon {
  opacity: 0.5;
}

/* Transitions */
.pop-enter-active,
.pop-leave-active {
  transition: all var(--duration-fast) var(--ease-standard);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
