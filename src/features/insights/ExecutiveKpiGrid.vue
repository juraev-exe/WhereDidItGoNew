<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  Flame,
  PiggyBank,
  PieChart,
  TrendingDown,
  TrendingUp,
} from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import type { ExecutiveKpis } from '@/services/stats'

const props = defineProps<{
  kpis: ExecutiveKpis
}>()

const { t } = useI18n()

const savingsToneClass = computed(() => `tone--${props.kpis.savingsRate.tone}`)

const savingsSubLabel = computed(() => {
  if (props.kpis.savingsRate.tone === 'good') return t('insights.kpi.savingsSubGood')
  if (props.kpis.savingsRate.tone === 'warn') return t('insights.kpi.savingsSubWarn')
  return t('insights.kpi.savingsSubNeutral')
})

const dailyBurnDeltaFormatted = computed(() => {
  const delta = props.kpis.dailyBurn.deltaPct
  if (delta === 0) return t('insights.kpi.dailySubSteady')
  const sign = delta > 0 ? '+' : ''
  return t('insights.kpi.dailySubVsPrior', { pct: `${sign}${delta}` })
})

const daysLeftLabel = computed(() => {
  const days = props.kpis.projectedSpend.daysRemaining
  return days > 0
    ? t('insights.kpi.projectedDaysRemaining', { count: days })
    : t('insights.kpi.projectedCompleted')
})

const essentialRatioLabel = computed(() =>
  t('insights.kpi.essentialRatio', {
    essential: props.kpis.essentialRatio.essentialPct,
    discretionary: props.kpis.essentialRatio.discretionaryPct,
  }),
)
</script>

<template>
  <section class="kpi-grid" role="region" :aria-label="t('insights.kpi.title')">
    <!-- Card 1: Net Savings Rate -->
    <div class="kpi-card surface-glass" :class="savingsToneClass">
      <div class="card-top">
        <span class="card-icon-squircle">
          <PiggyBank :size="18" />
        </span>
        <span class="pill tone-pill">
          <TrendingUp v-if="kpis.savingsRate.tone === 'good'" :size="12" />
          <TrendingDown v-else-if="kpis.savingsRate.tone === 'warn'" :size="12" />
          {{ kpis.savingsRate.pct }}%
        </span>
      </div>
      <div class="card-main">
        <span class="kpi-label">{{ t('insights.kpi.savingsRate') }}</span>
        <strong class="kpi-figure">{{ kpis.savingsRate.pct }}%</strong>
      </div>
      <p class="kpi-sub">{{ savingsSubLabel }}</p>
    </div>

    <!-- Card 2: Daily Burn Rate -->
    <div class="kpi-card surface-glass">
      <div class="card-top">
        <span class="card-icon-squircle icon-burn">
          <Flame :size="18" />
        </span>
        <span
          class="pill"
          :class="kpis.dailyBurn.deltaPct > 0 ? 'pill--warn' : 'pill--good'"
        >
          <TrendingUp v-if="kpis.dailyBurn.deltaPct > 0" :size="12" />
          <TrendingDown v-else-if="kpis.dailyBurn.deltaPct < 0" :size="12" />
          {{ Math.abs(kpis.dailyBurn.deltaPct) }}%
        </span>
      </div>
      <div class="card-main">
        <span class="kpi-label">{{ t('insights.kpi.dailyBurn') }}</span>
        <strong class="kpi-figure">
          <MoneyText :amount="kpis.dailyBurn.currentDaily" />
        </strong>
      </div>
      <p class="kpi-sub">{{ dailyBurnDeltaFormatted }}</p>
    </div>

    <!-- Card 3: Projected Period Spend -->
    <div class="kpi-card surface-glass">
      <div class="card-top">
        <span class="card-icon-squircle icon-projected">
          <CalendarClock :size="18" />
        </span>
        <span class="pill pill--neutral">
          {{ kpis.projectedSpend.daysRemaining }}d
        </span>
      </div>
      <div class="card-main">
        <span class="kpi-label">{{ t('insights.kpi.projectedSpend') }}</span>
        <strong class="kpi-figure">
          <MoneyText :amount="kpis.projectedSpend.projectedAmount" />
        </strong>
      </div>
      <p class="kpi-sub">{{ daysLeftLabel }}</p>
    </div>

    <!-- Card 4: Essential vs Discretionary Split -->
    <div class="kpi-card surface-glass">
      <div class="card-top">
        <span class="card-icon-squircle icon-split">
          <PieChart :size="18" />
        </span>
        <span class="pill pill--split">
          {{ kpis.essentialRatio.essentialPct }}/{{ kpis.essentialRatio.discretionaryPct }}
        </span>
      </div>
      <div class="card-main">
        <span class="kpi-label">{{ t('insights.kpi.essentialVsDiscretionary') }}</span>
        <!-- Dual progress bar track -->
        <div
          class="split-bar"
          role="progressbar"
          :aria-valuenow="kpis.essentialRatio.essentialPct"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="essentialRatioLabel"
        >
          <div
            class="split-seg split-seg--essential"
            :style="{ width: `${kpis.essentialRatio.essentialPct}%` }"
          />
          <div
            class="split-seg split-seg--discretionary"
            :style="{ width: `${kpis.essentialRatio.discretionaryPct}%` }"
          />
        </div>
      </div>
      <p class="kpi-sub">{{ essentialRatioLabel }}</p>
    </div>
  </section>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  width: 100%;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--color-outline) 12%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 24%, transparent),
    var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-standard);
  user-select: none;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 32%, transparent),
    var(--shadow-md);
}

.kpi-card:active {
  transform: scale(0.98);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.card-icon-squircle {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
}

.icon-burn {
  background: color-mix(in srgb, var(--color-warning) 16%, transparent);
  color: var(--color-warning);
}

.icon-projected {
  background: color-mix(in srgb, var(--color-tertiary) 15%, transparent);
  color: var(--color-tertiary);
}

.icon-split {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  color: var(--color-success);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-caption);
  font-weight: 700;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  line-height: 1.2;
}

.pill--good {
  background: color-mix(in srgb, var(--color-success) 16%, transparent);
  color: var(--color-success);
}

.pill--warn {
  background: color-mix(in srgb, var(--color-expense) 16%, transparent);
  color: var(--color-expense);
}

.pill--neutral {
  background: color-mix(in srgb, var(--color-tertiary) 16%, transparent);
  color: var(--color-tertiary);
}

.pill--split {
  background: color-mix(in srgb, var(--color-outline) 14%, transparent);
  color: var(--color-on-surface);
}

/* Tone modifiers for savings card */
.tone--good .tone-pill {
  background: color-mix(in srgb, var(--color-success) 18%, transparent);
  color: var(--color-success);
}
.tone--warn .tone-pill {
  background: color-mix(in srgb, var(--color-expense) 18%, transparent);
  color: var(--color-expense);
}
.tone--neutral .tone-pill {
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
}

.card-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.kpi-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-figure {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.kpi-sub {
  font-size: 0.75rem;
  color: var(--color-muted);
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dual progress bar */
.split-bar {
  display: flex;
  height: 6px;
  width: 100%;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--color-surface-container-high);
  margin-top: 4px;
}

.split-seg {
  height: 100%;
  transition: width var(--duration-normal) var(--ease-emphasized);
}

.split-seg--essential {
  background: var(--color-primary);
}

.split-seg--discretionary {
  background: var(--color-tertiary);
}

@media (max-width: 340px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
