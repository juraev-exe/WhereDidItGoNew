<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday as checkIsToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Check } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { dayKey, parseLocalDay, todayISO, yesterdayISO, weekdayLabels } from '@/lib/dates'
import { confirmFeedback, tickFeedback } from '@/services/native/haptics'
import { useSettingsStore } from '@/stores/settings'

const props = withDefaults(
  defineProps<{
    open: boolean
    modelValue: string // YYYY-MM-DD
    title?: string
  }>(),
  {
    title: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'close'): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const selectedDateStr = ref(props.modelValue || todayISO())
const currentViewDate = ref(parseLocalDay(selectedDateStr.value))

watch(
  () => [props.open, props.modelValue] as const,
  ([isOpen, val]) => {
    if (isOpen) {
      selectedDateStr.value = val || todayISO()
      currentViewDate.value = parseLocalDay(selectedDateStr.value)
    }
  },
  { immediate: true },
)

const monthTitle = computed(() => {
  try {
    return new Intl.DateTimeFormat(settings.intlLocale, { month: 'long', year: 'numeric' }).format(
      currentViewDate.value,
    )
  } catch {
    return format(currentViewDate.value, 'MMMM yyyy')
  }
})

const daysOfWeek = computed(() => {
  const allLabels = weekdayLabels(settings.intlLocale, 'short') // Sunday (0) to Saturday (6)
  if (settings.firstDayOfWeek === 1) {
    return [...allLabels.slice(1), allLabels[0]!]
  }
  return allLabels
})

const calendarDays = computed(() => {
  const startMonth = startOfMonth(currentViewDate.value)
  const endMonth = endOfMonth(currentViewDate.value)
  const startGrid = startOfWeek(startMonth, { weekStartsOn: settings.firstDayOfWeek })
  const endGrid = endOfWeek(endMonth, { weekStartsOn: settings.firstDayOfWeek })

  const days = eachDayOfInterval({ start: startGrid, end: endGrid })
  const currentMonthNum = currentViewDate.value.getMonth()

  return days.map((d) => {
    const iso = dayKey(d)
    return {
      date: d,
      iso,
      dayNum: d.getDate(),
      isCurrentMonth: d.getMonth() === currentMonthNum,
      isToday: checkIsToday(d),
      isSelected: iso === selectedDateStr.value,
    }
  })
})

function prevMonth() {
  currentViewDate.value = subMonths(currentViewDate.value, 1)
  void tickFeedback()
}

function nextMonth() {
  currentViewDate.value = addMonths(currentViewDate.value, 1)
  void tickFeedback()
}

function selectDay(iso: string) {
  selectedDateStr.value = iso
  void confirmFeedback()
}

function pickPreset(iso: string) {
  selectedDateStr.value = iso
  currentViewDate.value = parseLocalDay(iso)
  void confirmFeedback()
}

function confirmDate() {
  emit('update:modelValue', selectedDateStr.value)
  emit('close')
}

const isTodaySelected = computed(() => selectedDateStr.value === todayISO())
const isYesterdaySelected = computed(() => selectedDateStr.value === yesterdayISO())
</script>

<template>
  <BottomSheet :open="open" :title="title || t('quickAdd.date')" contain @close="emit('close')">
    <div class="date-picker-content">
      <!-- Quick Presets Bar -->
      <div class="presets-bar">
        <button
          type="button"
          class="preset-chip"
          :class="{ 'preset-chip--active': isTodaySelected }"
          @click="pickPreset(todayISO())"
        >
          {{ t('quickAdd.today') }}
        </button>
        <button
          type="button"
          class="preset-chip"
          :class="{ 'preset-chip--active': isYesterdaySelected }"
          @click="pickPreset(yesterdayISO())"
        >
          {{ t('quickAdd.yesterday') }}
        </button>
        <button
          type="button"
          class="preset-chip"
          @click="pickPreset(dayKey(subDays(new Date(), 7)))"
        >
          1 Week Ago
        </button>
      </div>

      <!-- Month Navigation Header -->
      <div class="month-nav-header">
        <button
          type="button"
          class="nav-arrow-btn"
          :aria-label="t('monthNav.previous')"
          @click="prevMonth"
        >
          <ChevronLeft :size="20" />
        </button>
        <span class="month-label-text">{{ monthTitle }}</span>
        <button
          type="button"
          class="nav-arrow-btn"
          :aria-label="t('monthNav.next')"
          @click="nextMonth"
        >
          <ChevronRight :size="20" />
        </button>
      </div>

      <!-- Days of Week Header -->
      <div class="days-of-week-grid">
        <span v-for="dow in daysOfWeek" :key="dow" class="dow-cell">{{ dow }}</span>
      </div>

      <!-- Calendar Days Grid -->
      <div class="days-grid">
        <button
          v-for="day in calendarDays"
          :key="day.iso"
          type="button"
          class="day-cell"
          :class="{
            'day-cell--other-month': !day.isCurrentMonth,
            'day-cell--today': day.isToday,
            'day-cell--selected': day.isSelected,
          }"
          @click="selectDay(day.iso)"
        >
          <span class="day-num">{{ day.dayNum }}</span>
        </button>
      </div>

      <!-- Actions Footer -->
      <div class="date-picker-footer">
        <AppButton block size="lg" @click="confirmDate">
          <Check :size="18" />
          <span>{{ t('common.save') }}</span>
        </AppButton>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.date-picker-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Presets Bar */
.presets-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: 2px;
}

.preset-chip {
  min-height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  border: 1.5px solid var(--color-outline-variant);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-on-surface-variant);
  white-space: nowrap;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .preset-chip:hover {
    background: var(--color-surface-container-high);
    color: var(--color-on-surface);
    transform: translateY(-1px);
  }
}

.preset-chip:active {
  transform: scale(0.95) translateY(0);
}

.preset-chip--active {
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface));
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 700;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 22%, transparent);
}

/* Month Navigation */
.month-nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-1);
}

.month-label-text {
  font-size: var(--text-title);
  font-family: var(--font-display);
  font-weight: 650;
  color: var(--color-on-surface);
}

.nav-arrow-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border: none;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-spring-snappy);
}

@media (hover: hover) and (pointer: fine) {
  .nav-arrow-btn:hover {
    background: var(--color-surface-container-high);
    transform: scale(1.08);
  }
}

.nav-arrow-btn:active {
  transform: scale(0.92);
}

/* Days of Week */
.days-of-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}

.dow-cell {
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-muted);
}

/* Days Grid */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  background: var(--color-surface-container);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  user-select: none;
}

.day-num {
  font-size: var(--text-body);
  font-weight: 550;
  color: var(--color-on-surface);
}

.day-cell--other-month {
  opacity: 0.35;
}

.day-cell--today {
  border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
}

.day-cell--today .day-num {
  font-weight: 700;
  color: var(--color-primary);
}

.day-cell:hover:not(.day-cell--selected) {
  background: var(--color-surface-container-high);
  transform: scale(1.08);
}

.day-cell:active {
  transform: scale(0.94);
}

.day-cell--selected {
  background: var(--color-primary) !important;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--color-primary) 40%, transparent);
  transform: scale(1.06);
  animation: tabPop 0.28s var(--ease-spring) both;
}

.day-cell--selected .day-num {
  color: #ffffff !important;
  font-weight: 700;
}

.date-picker-footer {
  padding-top: var(--space-2);
}
</style>
