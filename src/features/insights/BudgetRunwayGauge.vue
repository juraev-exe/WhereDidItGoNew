<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Gauge, TrendingUp, TrendingDown, ShieldCheck, ShieldAlert, ShieldX } from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import type { BudgetRunway, BudgetRunwayCategory, RunwaySeverity } from '@/services/stats'
import { tickFeedback } from '@/services/native/haptics'

const props = defineProps<{
  runway: BudgetRunway
}>()

const { t } = useI18n()

const expandedCategoryId = ref<string | null>(null)

function toggleCategory(id: string) {
  expandedCategoryId.value = expandedCategoryId.value === id ? null : id
  void tickFeedback()
}

// ── Overall gauge arc SVG ──────────────────────────────────────────
const gaugeRadius = 60
const gaugeStroke = 10
const gaugeCircumference = 2 * Math.PI * gaugeRadius
// Show 75% of the full circle (270°)
const arcFraction = 0.75
const arcLength = gaugeCircumference * arcFraction

const spentDash = computed(() => {
  const pct = Math.min(props.runway.overallSpentPercent, 120) / 100
  return arcLength * pct
})

const idealDash = computed(() => {
  const pct = Math.min(props.runway.elapsedPercent, 100) / 100
  return arcLength * pct
})

const severityColor = computed(() => {
  const s = props.runway.overallSeverity
  if (s === 'over-budget') return 'var(--color-expense)'
  if (s === 'at-risk') return 'var(--color-warning)'
  return 'var(--color-success)'
})

const overallSeverityLabel = computed(() => {
  const s = props.runway.overallSeverity
  if (s === 'over-budget') return t('insights.runway.severityOver')
  if (s === 'at-risk') return t('insights.runway.severityRisk')
  return t('insights.runway.severityOk')
})

function severityClass(sev: RunwaySeverity) {
  if (sev === 'over-budget') return 'sev--over'
  if (sev === 'at-risk') return 'sev--risk'
  return 'sev--ok'
}

function categoryBarWidth(cat: BudgetRunwayCategory) {
  return `${Math.min(cat.spentPercent, 100)}%`
}

function idealMarkerPosition(_cat: BudgetRunwayCategory) {
  return `${Math.min(props.runway.elapsedPercent, 100)}%`
}

function pacingLabel(cat: BudgetRunwayCategory) {
  const delta = cat.pacingDelta
  if (delta > 0) return t('insights.runway.pacingAhead', { pct: delta })
  if (delta < 0) return t('insights.runway.pacingBehind', { pct: Math.abs(delta) })
  return t('insights.runway.pacingOnTrack')
}

function exhaustionLabel(cat: BudgetRunwayCategory) {
  if (cat.severity === 'over-budget') return t('insights.runway.exhausted')
  if (cat.projectedExhaustionDay != null) {
    return t('insights.runway.exhaustsOnDay', { day: cat.projectedExhaustionDay })
  }
  return t('insights.runway.withinBudget')
}
</script>

<template>
  <section
    v-if="runway.categories.length"
    class="runway-section"
    role="region"
    :aria-label="t('insights.runway.title')"
  >
    <div class="runway-header">
      <div class="runway-title-row">
        <Gauge :size="20" class="runway-icon" />
        <h3>{{ t('insights.runway.title') }}</h3>
      </div>
      <p class="runway-lede">{{ t('insights.runway.lede') }}</p>
    </div>

    <!-- Overall gauge -->
    <div class="gauge-container surface-glass">
      <svg class="gauge-svg" viewBox="0 0 140 115" aria-hidden="true">
        <!-- Background arc -->
        <circle
          class="gauge-bg"
          :cx="70" :cy="70"
          :r="gaugeRadius"
          fill="none"
          :stroke-width="gaugeStroke"
          :stroke-dasharray="`${arcLength} ${gaugeCircumference}`"
          :stroke-dashoffset="0"
          stroke-linecap="round"
          :transform="`rotate(135 70 70)`"
        />
        <!-- Ideal pace marker arc (subtle) -->
        <circle
          class="gauge-ideal"
          :cx="70" :cy="70"
          :r="gaugeRadius"
          fill="none"
          :stroke-width="gaugeStroke + 2"
          :stroke-dasharray="`${idealDash} ${gaugeCircumference}`"
          :stroke-dashoffset="0"
          stroke-linecap="round"
          :transform="`rotate(135 70 70)`"
        />
        <!-- Spent arc -->
        <circle
          class="gauge-spent"
          :cx="70" :cy="70"
          :r="gaugeRadius"
          fill="none"
          :stroke-width="gaugeStroke"
          :stroke-dasharray="`${spentDash} ${gaugeCircumference}`"
          :stroke-dashoffset="0"
          stroke-linecap="round"
          :style="{ stroke: severityColor }"
          :transform="`rotate(135 70 70)`"
        />
      </svg>
      <div class="gauge-center">
        <strong class="gauge-pct">{{ runway.overallSpentPercent }}%</strong>
        <span class="gauge-label">{{ t('insights.runway.used') }}</span>
      </div>
      <div class="gauge-footer">
        <span class="gauge-days">
          {{ t('insights.runway.cycleDay', { elapsed: runway.elapsedDays, total: runway.totalDays }) }}
        </span>
        <span class="gauge-severity-badge" :class="severityClass(runway.overallSeverity)">
          <ShieldCheck v-if="runway.overallSeverity === 'on-track'" :size="12" />
          <ShieldAlert v-else-if="runway.overallSeverity === 'at-risk'" :size="12" />
          <ShieldX v-else :size="12" />
          {{ overallSeverityLabel }}
        </span>
      </div>
    </div>

    <!-- Per-category list -->
    <ul class="cat-list">
      <li
        v-for="cat in runway.categories"
        :key="cat.categoryId"
        class="cat-item surface-glass"
        :class="severityClass(cat.severity)"
      >
        <button
          type="button"
          class="cat-btn"
          :aria-label="cat.categoryName"
          :aria-expanded="expandedCategoryId === cat.categoryId"
          @click="toggleCategory(cat.categoryId)"
        >
          <div class="cat-top">
            <span class="cat-name-row">
              <span
                class="cat-dot"
                :style="{ background: cat.categoryColor }"
                aria-hidden="true"
              />
              <span class="cat-name">{{ cat.categoryName }}</span>
            </span>
            <span class="cat-pct" :class="severityClass(cat.severity)">
              {{ cat.spentPercent }}%
            </span>
          </div>

          <!-- Mini progress bar -->
          <div class="cat-bar-track">
            <div
              class="cat-bar-fill"
              :class="severityClass(cat.severity)"
              :style="{ width: categoryBarWidth(cat) }"
            />
            <!-- Ideal pace marker -->
            <div
              class="cat-bar-ideal"
              :style="{ left: idealMarkerPosition(cat) }"
              :aria-label="t('insights.runway.idealPace')"
            />
          </div>

          <div class="cat-amounts">
            <span class="cat-spent">
              <MoneyText :amount="cat.spentAmount" />
              {{ t('common.of') }}
              <MoneyText :amount="cat.limitAmount" />
            </span>
            <span class="cat-remaining" :class="{ 'cat-remaining--neg': cat.remaining < 0 }">
              <template v-if="cat.remaining >= 0">
                <MoneyText :amount="cat.remaining" /> {{ t('budgets.left') }}
              </template>
              <template v-else>
                <MoneyText :amount="Math.abs(cat.remaining)" /> {{ t('budgets.over') }}
              </template>
            </span>
          </div>
        </button>

        <!-- Expanded pacing details -->
        <div v-if="expandedCategoryId === cat.categoryId" class="cat-detail">
          <div class="detail-row">
            <TrendingUp v-if="cat.pacingDelta > 0" :size="14" class="detail-icon sev--risk" />
            <TrendingDown v-else-if="cat.pacingDelta < 0" :size="14" class="detail-icon sev--ok" />
            <ShieldCheck v-else :size="14" class="detail-icon sev--ok" />
            <span>{{ pacingLabel(cat) }}</span>
          </div>
          <div class="detail-row">
            <ShieldAlert :size="14" class="detail-icon" />
            <span>{{ exhaustionLabel(cat) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.runway-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.runway-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.runway-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.runway-icon {
  color: var(--color-primary);
}

.runway-title-row h3 {
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0;
}

.runway-lede {
  font-size: var(--text-label);
  color: var(--color-muted);
  margin: 0;
}

/* ── Overall gauge ─────────────────────────────────────────────── */
.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-3);
  border-radius: var(--radius-lg);
  position: relative;
}

.gauge-svg {
  width: 160px;
  height: 130px;
}

.gauge-bg {
  stroke: var(--color-surface-container);
}

.gauge-ideal {
  stroke: var(--color-outline);
  opacity: 0.35;
}

.gauge-spent {
  transition: stroke-dasharray var(--duration-normal) var(--ease-emphasized),
              stroke var(--duration-normal) var(--ease-emphasized);
}

.gauge-center {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.gauge-pct {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--color-on-surface);
}

.gauge-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.gauge-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-2);
}

.gauge-days {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
}

.gauge-severity-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-caption);
  font-weight: 700;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
}

/* ── Severity colours ──────────────────────────────────────────── */
.sev--ok {
  color: var(--color-success);
}
.sev--risk {
  color: var(--color-warning);
}
.sev--over {
  color: var(--color-expense);
}

.gauge-severity-badge.sev--ok {
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
}
.gauge-severity-badge.sev--risk {
  background: color-mix(in srgb, var(--color-warning) 16%, transparent);
}
.gauge-severity-badge.sev--over {
  background: color-mix(in srgb, var(--color-expense) 16%, transparent);
}

/* ── Per-category list ─────────────────────────────────────────── */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.cat-item {
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-standard);
}

.cat-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.cat-item:active {
  transform: scale(0.98) translateY(0);
}

.cat-btn {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.cat-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.cat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cat-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.cat-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.cat-name {
  font-weight: 650;
  font-size: var(--text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-pct {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

/* ── Category bar ──────────────────────────────────────────────── */
.cat-bar-track {
  position: relative;
  height: 6px;
  width: 100%;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  overflow: visible;
}

.cat-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-emphasized);
}

.cat-bar-fill.sev--ok {
  background: var(--color-success);
}
.cat-bar-fill.sev--risk {
  background: var(--color-warning);
}
.cat-bar-fill.sev--over {
  background: var(--color-expense);
}

.cat-bar-ideal {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  border-radius: 1px;
  background: var(--color-on-surface);
  opacity: 0.35;
  transition: left var(--duration-normal) var(--ease-emphasized);
  pointer-events: none;
}

/* ── Category amounts ──────────────────────────────────────────── */
.cat-amounts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.cat-spent {
  font-weight: 500;
}

.cat-remaining {
  font-weight: 650;
}

.cat-remaining--neg {
  color: var(--color-expense);
}

/* ── Expanded detail ───────────────────────────────────────────── */
.cat-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-4) var(--space-3);
  animation: fadeSlideUp 200ms var(--ease-emphasized) both;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  color: var(--color-muted);
  font-weight: 500;
}

.detail-icon {
  flex-shrink: 0;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
