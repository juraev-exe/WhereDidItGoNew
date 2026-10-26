<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '@/lib/money'
import { shortMonthLabel, weekdayDayLabel } from '@/lib/dates'
import { useSettingsStore } from '@/stores/settings'

export interface ActivityDay {
  date: string // YYYY-MM-DD
  count: number
  amount?: number // minor units (cents)
}

const props = withDefaults(
  defineProps<{
    days: ActivityDay[]
    label?: string
    period?: string
    selectedDate?: string | null
    weekStartsOn?: 0 | 1
    thresholds?: [number, number, number]
  }>(),
  {
    label: 'Activity',
    period: 'the last year',
    selectedDate: null,
    weekStartsOn: 1, // Default Monday start
    thresholds: undefined,
  },
)

const emit = defineEmits<{
  (e: 'selectDate', date: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const DAY_MS = 86_400_000
const LEVELS = [0, 1, 2, 3, 4] as const

const toUtc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10)

// Active preview level when hovering legend swatch
const previewLevel = ref<number | null>(null)
const pinnedLevel = ref<number | null>(null)
const activeHighlight = computed(() => previewLevel.value ?? pinnedLevel.value)

// Tooltip state
const activeTip = ref<{
  date: string
  count: number
  amount?: number
  x: number
  y: number
} | null>(null)

const rootEl = ref<HTMLElement | null>(null)

// Build model
const model = computed(() => {
  const dates = props.days.map((d) => toUtc(d.date)).filter(Number.isFinite)
  const now = new Date()
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())

  // Default to a 52-week window ending today if empty
  const start = dates.length ? Math.min(...dates) : todayUtc - 52 * 7 * DAY_MS
  const end = dates.length ? Math.max(...dates, todayUtc) : todayUtc
  const length = Math.max(1, Math.round((end - start) / DAY_MS) + 1)

  const counts = new Array<number>(length).fill(0)
  const amounts = new Array<number>(length).fill(0)

  props.days.forEach((day) => {
    const idx = Math.round((toUtc(day.date) - start) / DAY_MS)
    if (idx >= 0 && idx < length) {
      counts[idx] += Math.max(0, day.count)
      if (day.amount) amounts[idx] += day.amount
    }
  })

  const max = counts.reduce((a, b) => Math.max(a, b), 0)
  const bounds =
    props.thresholds ??
    ([
      Math.max(1, Math.ceil(max * 0.25)),
      Math.max(2, Math.ceil(max * 0.5)),
      Math.max(3, Math.ceil(max * 0.75)),
    ] as [number, number, number])

  const levels = counts.map((count) =>
    count <= 0
      ? 0
      : count <= bounds[0]
        ? 1
        : count <= bounds[1]
          ? 2
          : count <= bounds[2]
            ? 3
            : 4,
  )

  const startDay = new Date(start).getUTCDay()
  const lead = (startDay - props.weekStartsOn + 7) % 7
  const weeks = Math.ceil((lead + length) / 7)

  // Generate month headers
  const months: { month: number; col: number; label: string }[] = []
  for (let idx = 0; idx < length; idx++) {
    const date = new Date(start + idx * DAY_MS)
    if (idx === 0 || date.getUTCDate() === 1) {
      months.push({
        month: date.getUTCFullYear() * 12 + date.getUTCMonth(),
        col: Math.floor((lead + idx) / 7),
        label: shortMonthLabel(date, settings.intlLocale),
      })
    }
  }

  // Prevent month label overlap
  if (months.length > 1 && months[1]!.col - months[0]!.col < 3) {
    months.shift()
  }

  const perLevel = [0, 0, 0, 0, 0]
  levels.forEach((l) => perLevel[l]++)

  return {
    start,
    length,
    lead,
    weeks,
    total: counts.reduce((a, b) => a + b, 0),
    counts,
    amounts,
    levels,
    thresholds: bounds,
    months,
    perLevel,
  }
})

// Weekday indicators (Mon, Wed, Fri)
const weekdayLabelsList = computed(() => {
  // If Monday start: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  return ['Mon', '', 'Wed', '', 'Fri', '', '']
})

function formatDayTooltip(dateStr: string): string {
  try {
    return weekdayDayLabel(dateStr, settings.intlLocale)
  } catch {
    return dateStr
  }
}

function onCellEnter(event: MouseEvent, index: number) {
  const target = event.currentTarget as HTMLElement
  const rootBox = rootEl.value?.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  const dateIso = toIso(model.value.start + index * DAY_MS)

  activeTip.value = {
    date: dateIso,
    count: model.value.counts[index] ?? 0,
    amount: model.value.amounts[index],
    x: rootBox ? rect.left - rootBox.left + rect.width / 2 : rect.left,
    y: rootBox ? rect.top - rootBox.top : rect.top,
  }
}

function onCellLeave() {
  activeTip.value = null
}

function onCellClick(index: number) {
  const dateIso = toIso(model.value.start + index * DAY_MS)
  emit('selectDate', dateIso)
}

function togglePinnedLevel(level: number) {
  pinnedLevel.value = pinnedLevel.value === level ? null : level
}
</script>

<template>
  <div ref="rootEl" class="heatmap-container">
    <!-- Top Summary Line -->
    <div class="heatmap-header">
      <div class="header-summary">
        <strong class="total-count">{{ model.total }}</strong>
        <span class="period-text">
          {{ t('activity.transactionsCount', { count: model.total }) }} {{ period }}
        </span>
      </div>
      <slot name="actions" />
    </div>

    <!-- Scrollable Heatmap Grid -->
    <div class="scroller">
      <div class="canvas" :style="{ '--weeks': model.weeks }">
        <!-- Month Labels Row -->
        <div class="months-row" aria-hidden="true">
          <span
            v-for="(m, idx) in model.months"
            :key="idx"
            class="month-label"
            :style="{ '--col': m.col }"
          >
            {{ m.label }}
          </span>
        </div>

        <div class="grid-body">
          <!-- Weekday Labels Column -->
          <div class="weekdays-col" aria-hidden="true">
            <span v-for="(dayName, rIdx) in weekdayLabelsList" :key="rIdx" class="weekday-label">
              {{ dayName }}
            </span>
          </div>

          <!-- Main Day Matrix -->
          <div class="tiles-grid" role="grid" :aria-label="label">
            <div
              v-for="col in model.weeks"
              :key="col"
              class="week-column"
            >
              <template v-for="row in 7" :key="row">
                <!-- Check if valid cell in range -->
                <button
                  v-if="((col - 1) * 7 + (row - 1) - model.lead) >= 0 && ((col - 1) * 7 + (row - 1) - model.lead) < model.length"
                  type="button"
                  class="day-tile"
                  :class="[
                    'level-' + model.levels[(col - 1) * 7 + (row - 1) - model.lead],
                    {
                      'is-selected': selectedDate === toIso(model.start + ((col - 1) * 7 + (row - 1) - model.lead) * DAY_MS),
                      'is-dimmed': activeHighlight !== null && activeHighlight !== model.levels[(col - 1) * 7 + (row - 1) - model.lead],
                    }
                  ]"
                  :aria-label="`${toIso(model.start + ((col - 1) * 7 + (row - 1) - model.lead) * DAY_MS)}: ${model.counts[(col - 1) * 7 + (row - 1) - model.lead]} transactions`"
                  @mouseenter="onCellEnter($event, (col - 1) * 7 + (row - 1) - model.lead)"
                  @mouseleave="onCellLeave"
                  @click="onCellClick((col - 1) * 7 + (row - 1) - model.lead)"
                />
                <span v-else class="day-tile empty-tile" aria-hidden="true" />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="heatmap-legend">
      <span class="legend-label">{{ t('common.less', 'Less') }}</span>
      <div class="legend-swatches" role="group">
        <button
          v-for="lvl in LEVELS"
          :key="lvl"
          type="button"
          class="swatch-btn"
          :class="['level-' + lvl, { 'is-pinned': pinnedLevel === lvl }]"
          :title="`Level ${lvl}`"
          @mouseenter="previewLevel = lvl"
          @mouseleave="previewLevel = null"
          @click="togglePinnedLevel(lvl)"
        />
      </div>
      <span class="legend-label">{{ t('common.more', 'More') }}</span>
    </div>

    <!-- Floating Tooltip -->
    <Transition name="tip-fade">
      <div
        v-if="activeTip"
        class="floating-tooltip"
        :style="{ left: `${activeTip.x}px`, top: `${activeTip.y}px` }"
        aria-hidden="true"
      >
        <div class="tip-date">{{ formatDayTooltip(activeTip.date) }}</div>
        <div class="tip-content">
          <strong>{{ activeTip.count }}</strong>
          <span>{{ t('activity.transactionsCount', { count: activeTip.count }) }}</span>
          <span v-if="activeTip.amount" class="tip-amount">
            · {{ formatMoney(activeTip.amount, settings.currency, settings.intlLocale, settings.currencyPosition, settings.hideCents) }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.heatmap-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: border-color var(--duration-fast);
}

.heatmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-summary {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.total-count {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-on-surface);
  letter-spacing: var(--tracking-title);
}

.period-text {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.scroller {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: var(--space-1);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.canvas {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  min-width: 100%;
}

.months-row {
  position: relative;
  height: 16px;
  margin-left: 28px; /* space for weekday labels */
}

.month-label {
  position: absolute;
  left: calc(var(--col) * 14px);
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: capitalize;
  white-space: nowrap;
}

.grid-body {
  display: flex;
  gap: 6px;
}

.weekdays-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 22px;
  flex-shrink: 0;
}

.weekday-label {
  height: 11px;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 11px;
  color: var(--color-muted);
}

.tiles-grid {
  display: inline-flex;
  gap: 3px;
}

.week-column {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.day-tile {
  width: 11px;
  height: 11px;
  border-radius: 2.5px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring-snappy), opacity 0.15s ease, box-shadow 0.15s ease;
}

.day-tile:hover {
  transform: scale(1.35);
  z-index: 2;
}

.empty-tile {
  background: transparent;
  pointer-events: none;
}

/* Activity Tints based on theme variables */
.level-0 {
  background: var(--color-surface-container);
}

.level-1 {
  background: color-mix(in srgb, #10b981 28%, var(--color-surface-container));
}

.level-2 {
  background: color-mix(in srgb, #10b981 52%, var(--color-surface-container));
}

.level-3 {
  background: color-mix(in srgb, #10b981 78%, var(--color-surface-container));
}

.level-4 {
  background: #10b981;
  box-shadow: 0 0 5px color-mix(in srgb, #10b981 50%, transparent);
}

.is-dimmed {
  opacity: 0.22;
}

.is-selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
  transform: scale(1.3);
  z-index: 3;
}

/* Legend */
.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: 2px;
}

.legend-label {
  font-size: 0.7rem;
  color: var(--color-muted);
}

.legend-swatches {
  display: flex;
  align-items: center;
  gap: 3px;
}

.swatch-btn {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.swatch-btn:hover {
  transform: scale(1.25);
}

.swatch-btn.is-pinned {
  outline: 1.5px solid var(--color-on-surface);
}

/* Floating Tooltip */
.floating-tooltip {
  position: absolute;
  transform: translate(-50%, -130%);
  background: var(--color-on-surface);
  color: var(--color-surface);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tip-date {
  font-size: 0.65rem;
  opacity: 0.8;
}

.tip-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tip-amount {
  opacity: 0.88;
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -115%);
}
</style>
