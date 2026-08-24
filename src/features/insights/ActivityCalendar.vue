<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Flame, Trophy, X } from '@lucide/vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import { formatTxDate, type ActivityHeatmap, type CalendarDay } from '@/services/stats'
import { weekdayLabels } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback } from '@/services/native/haptics'

const props = defineProps<{
  heatmap: ActivityHeatmap
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const scroller = ref<HTMLElement | null>(null)
const selectedDate = ref<string | null>(null)

const weekdays = computed(() => weekdayLabels(settings.intlLocale, 'short'))

const selected = computed<CalendarDay | null>(() => {
  if (!selectedDate.value) return null
  return props.heatmap.days.find((d) => d.date === selectedDate.value) ?? null
})

// GitHub-style Streak and Total Stats calculation
const stats = computed(() => {
  const pastDays = props.heatmap.days.filter((d) => !d.future)
  let totalTx = 0
  let longestStreak = 0
  let tempStreak = 0
  let currentStreak = 0

  for (const day of pastDays) {
    totalTx += day.count
    if (day.count > 0) {
      tempStreak++
      if (tempStreak > longestStreak) longestStreak = tempStreak
    } else {
      tempStreak = 0
    }
  }

  // Calculate current streak backwards from today
  for (let i = pastDays.length - 1; i >= 0; i--) {
    const d = pastDays[i]
    if (d && d.count > 0) {
      currentStreak++
    } else if (i === pastDays.length - 1 && d && d.count === 0) {
      // Today hasn't had activity yet, allow checking from yesterday
      continue
    } else {
      break
    }
  }

  return {
    totalTx,
    activeDays: props.heatmap.activeDays,
    longestStreak,
    currentStreak,
  }
})

function cellLabel(day: CalendarDay): string {
  const date = formatTxDate(day.date, settings.intlLocale)
  if (day.future) return date
  if (day.count === 0) return `${date}: 0 transactions`
  return `${date}: ${day.count} transactions`
}

function selectDay(day: CalendarDay) {
  if (day.future) return
  void tickFeedback()
  selectedDate.value = selectedDate.value === day.date ? null : day.date
}

async function scrollToEnd() {
  await nextTick()
  const el = scroller.value
  if (!el) return
  el.scrollLeft = el.scrollWidth
}

onMounted(scrollToEnd)
watch(() => props.heatmap.start, scrollToEnd)
</script>

<template>
  <section class="github-card" :aria-label="t('insights.activity')">
    <!-- GitHub Stats Header -->
    <div class="github-header">
      <div class="header-main">
        <h2 class="title">{{ stats.totalTx }} transactions in the last year</h2>
        <p class="subtitle">
          {{
            heatmap.activeDays
              ? t('insights.activityLede', { count: heatmap.activeDays })
              : t('insights.activityNone')
          }}
        </p>
      </div>

      <!-- Quick Streak Chips -->
      <div class="streak-chips">
        <div class="chip">
          <Flame :size="13" class="chip-icon icon-fire" />
          <span class="chip-label">Streak: <strong>{{ stats.currentStreak }}d</strong></span>
        </div>
        <div class="chip">
          <Trophy :size="13" class="chip-icon icon-trophy" />
          <span class="chip-label">Max: <strong>{{ stats.longestStreak }}d</strong></span>
        </div>
      </div>
    </div>

    <!-- GitHub Contribution Graph Heatmap Scroller -->
    <div ref="scroller" class="scroller" tabindex="0">
      <div
        class="github-graph"
        :style="{
          '--weeks': heatmap.weeks,
        }"
      >
        <!-- Month labels along top row -->
        <div class="months" aria-hidden="true">
          <span
            v-for="m in heatmap.monthLabels"
            :key="`${m.weekIndex}-${m.label}`"
            class="month-label"
            :style="{ gridColumn: m.weekIndex + 1 }"
          >
            {{ m.label }}
          </span>
        </div>

        <!-- Weekday labels column on left (Mon, Wed, Fri) -->
        <div class="weekdays" aria-hidden="true">
          <span class="wday-label"></span>
          <span class="wday-label">{{ weekdays[1] || 'Mon' }}</span>
          <span class="wday-label"></span>
          <span class="wday-label">{{ weekdays[3] || 'Wed' }}</span>
          <span class="wday-label"></span>
          <span class="wday-label">{{ weekdays[5] || 'Fri' }}</span>
          <span class="wday-label"></span>
        </div>

        <!-- Heatmap Squares Grid (7 rows x N weeks) -->
        <div class="cells-grid">
          <button
            v-for="day in heatmap.days"
            :key="day.date"
            type="button"
            class="square"
            :class="[`lvl-${day.level}`, { future: day.future, active: selectedDate === day.date }]"
            :disabled="day.future"
            :aria-label="cellLabel(day)"
            :title="cellLabel(day)"
            :aria-pressed="selectedDate === day.date"
            @click="selectDay(day)"
          />
        </div>
      </div>
    </div>

    <!-- GitHub Foot Bar -->
    <div class="github-foot">
      <div v-if="selected" class="selection-pill">
        <span class="sel-date">{{ formatTxDate(selected.date, settings.intlLocale) }}</span>
        <span class="sel-dot">·</span>
        <span class="sel-count">{{ selected.count }} {{ t('insights.txCount', 'Transactions') }}</span>
        <template v-if="selected.expense">
          <span class="sel-dot">·</span>
          <span class="expense-tag">
            <MoneyText :amount="selected.expense" signed="expense" />
          </span>
        </template>
        <template v-else-if="selected.income">
          <span class="sel-dot">·</span>
          <span class="income-tag">
            <MoneyText :amount="selected.income" signed="income" />
          </span>
        </template>
        <button type="button" class="clear-sel-btn" :aria-label="t('common.close', 'Close')" @click="selectedDate = null">
          <X :size="12" />
        </button>
      </div>
      <p v-else class="foot-hint">{{ t('insights.activityHint', 'Click any square for details') }}</p>

      <!-- GitHub Scale Legend -->
      <div class="scale-legend" aria-hidden="true">
        <span>{{ t('insights.less', 'Less') }}</span>
        <i class="legend-box lvl-0" />
        <i class="legend-box lvl-1" />
        <i class="legend-box lvl-2" />
        <i class="legend-box lvl-3" />
        <i class="legend-box lvl-4" />
        <span>{{ t('insights.more', 'More') }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.github-card {
  padding: 16px 18px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

/* Header */
.github-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.header-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-on-surface);
  font-family: var(--font-display);
  letter-spacing: -0.018em;
}

.subtitle {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-muted);
}

.streak-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  font-size: 11px;
  color: var(--color-on-surface-variant);
}

.chip strong {
  color: var(--color-on-surface);
}

.chip-icon {
  flex-shrink: 0;
}

.icon-fire {
  color: #ff9500;
}

.icon-trophy {
  color: #eab308;
}

/* Scroller & Graph */
.scroller {
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  padding: 8px 4px 6px 2px;
}

.scroller::-webkit-scrollbar {
  display: none;
}

.github-graph {
  --cell: 10.5px;
  --gap: 3px;
  display: grid;
  grid-template-columns: 28px max-content;
  grid-template-rows: 20px auto;
  column-gap: 6px;
  width: max-content;
  padding: 2px 2px;
}

/* Month labels along top */
.months {
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(var(--weeks), var(--cell));
  column-gap: var(--gap);
  font-size: 10px;
  font-weight: 500;
  color: var(--color-muted);
  line-height: 1;
  align-items: center;
  height: 20px;
  margin-bottom: 2px;
}

.month-label {
  white-space: nowrap;
  overflow: visible;
}

/* Weekday labels along left */
.weekdays {
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  row-gap: var(--gap);
  font-size: 9px;
  font-weight: 500;
  color: var(--color-muted);
  line-height: var(--cell);
  user-select: none;
}

.wday-label {
  height: var(--cell);
  line-height: var(--cell);
  display: flex;
  align-items: center;
}

/* Squares grid */
.cells-grid {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  grid-auto-flow: column;
  grid-auto-columns: var(--cell);
  gap: var(--gap);
}

.square {
  width: var(--cell);
  height: var(--cell);
  border-radius: 2px;
  padding: 0;
  margin: 0;
  min-height: 0;
  transition: transform 0.12s var(--ease-spring), box-shadow 0.12s var(--ease-standard);
  cursor: pointer;
  box-sizing: border-box;
}

.square:hover:not(.future) {
  transform: scale(1.35);
  z-index: 5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}

.square:focus-visible {
  outline: 2px solid #0969da;
  outline-offset: 1px;
  z-index: 6;
}

.square.active {
  outline: 2px solid #0969da;
  outline-offset: 1px;
  transform: scale(1.2);
  z-index: 5;
}

:global([data-theme='dark']) .square.active,
:global([data-theme='oled']) .square.active {
  outline-color: #58a6ff;
}

.square.future {
  opacity: 0.12;
  cursor: default;
}

/* ═══════════════════════════════════════════════
   Authentic GitHub Contribution Color Palette
   ═══════════════════════════════════════════════ */

/* Light mode (GitHub Light) */
.lvl-0 {
  background-color: #ebedf0;
  border: 1px solid rgba(27, 31, 35, 0.06);
}
.lvl-1 {
  background-color: #9be9a8;
  border: 1px solid rgba(27, 31, 35, 0.08);
}
.lvl-2 {
  background-color: #40c463;
  border: 1px solid rgba(27, 31, 35, 0.08);
}
.lvl-3 {
  background-color: #30a14e;
  border: 1px solid rgba(27, 31, 35, 0.08);
}
.lvl-4 {
  background-color: #216e39;
  border: 1px solid rgba(27, 31, 35, 0.08);
}

/* Dark mode (GitHub Dark) */
:global([data-theme='dark']) .lvl-0 {
  background-color: #161b22;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global([data-theme='dark']) .lvl-1 {
  background-color: #0e4429;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global([data-theme='dark']) .lvl-2 {
  background-color: #006d32;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global([data-theme='dark']) .lvl-3 {
  background-color: #26a641;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
:global([data-theme='dark']) .lvl-4 {
  background-color: #39d353;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* OLED mode (GitHub High Contrast Dark) */
:global([data-theme='oled']) .lvl-0 {
  background-color: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme='oled']) .lvl-1 {
  background-color: #0e4429;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme='oled']) .lvl-2 {
  background-color: #006d32;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme='oled']) .lvl-3 {
  background-color: #26a641;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global([data-theme='oled']) .lvl-4 {
  background-color: #39d353;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Foot Bar */
.github-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  font-size: 0.8rem;
  color: var(--color-muted);
  padding-top: 10px;
  border-top: 1px solid var(--color-outline-variant);
}

.selection-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-on-surface);
  animation: popSpring 0.2s var(--ease-spring) both;
}

.sel-date {
  font-weight: 600;
}

.sel-dot {
  color: var(--color-muted);
}

.sel-count {
  color: var(--color-on-surface-variant);
}

.expense-tag {
  color: var(--color-expense);
  font-weight: 600;
}

.income-tag {
  color: var(--color-income);
  font-weight: 600;
}

.clear-sel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-outline) 30%, transparent);
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  margin-left: 2px;
}

.foot-hint {
  font-size: 0.78rem;
  color: var(--color-muted);
}

.scale-legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-muted);
  margin-left: auto;
}

.legend-box {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: block;
  box-sizing: border-box;
}

@media (min-width: 500px) {
  .github-graph {
    --cell: 11px;
  }
  .legend-box {
    width: 11px;
    height: 11px;
  }
}
</style>
