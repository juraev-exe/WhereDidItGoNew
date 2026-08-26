<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { format, parse, addMonths } from 'date-fns'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { monthLabel, monthRange, shortDayLabel } from '@/lib/dates'
import { tickFeedback } from '@/services/native/haptics'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  modelValue: string
  labelAsHeading?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { t } = useI18n()
const settings = useSettingsStore()

/** With a custom cycle start the month name alone is ambiguous — show the span. */
const cycleSpan = computed(() => {
  if (settings.startOfMonth <= 1) return ''
  const { start, end } = monthRange(props.modelValue)
  return `${shortDayLabel(start, settings.intlLocale)} – ${shortDayLabel(end, settings.intlLocale)}`
})

function shift(delta: number) {
  const d = parse(`${props.modelValue}-01`, 'yyyy-MM-dd', new Date())
  emit('update:modelValue', format(addMonths(d, delta), 'yyyy-MM'))
  void tickFeedback()
}
</script>

<template>
  <div class="month-nav" role="group" :aria-label="t('monthNav.selectMonth')">
    <button type="button" class="nav-btn" :aria-label="t('monthNav.previous')" @click="shift(-1)">
      <ChevronLeft :size="22" />
    </button>
    <div class="label-wrap">
      <component :is="labelAsHeading ? 'h1' : 'p'" class="label">
        {{ monthLabel(modelValue, settings.intlLocale) }}
      </component>
      <p v-if="cycleSpan" class="cycle-span">{{ cycleSpan }}</p>
    </div>
    <button type="button" class="nav-btn" :aria-label="t('monthNav.next')" @click="shift(1)">
      <ChevronRight :size="22" />
    </button>
  </div>
</template>

<style scoped>
.month-nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
}

.nav-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-on-surface-variant);
}

.label-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.cycle-span {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.label {
  margin: 0;
  text-align: center;
  font-family: var(--font-display);
  font-size: var(--text-headline);
  font-weight: 600;
  line-height: var(--leading-tight);
}
</style>
