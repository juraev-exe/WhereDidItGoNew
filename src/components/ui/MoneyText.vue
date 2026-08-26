<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NumberFlow from '@number-flow/vue'
import { formatMoney, getCurrencySymbol } from '@/lib/money'
import { useSettingsStore } from '@/stores/settings'
import type { TransactionType } from '@/types/finance'

const props = withDefaults(
  defineProps<{
    amount?: number
    /** Preformatted string (e.g. a percent) instead of a money value. */
    text?: string
    signed?: TransactionType | null
    size?: 'sm' | 'md' | 'hero'
    animated?: boolean
  }>(),
  {
    amount: 0,
    text: '',
    signed: null,
    size: 'md',
    animated: false,
  },
)

const { t } = useI18n()
const settings = useSettingsStore()
const hidden = computed(() => settings.hideAmounts)

// NumberFlow renders the magnitude; the sign lives in the prefix.
const numericValue = computed(() => Math.abs(props.amount ?? 0) / 100)

/**
 * NumberFlow animates a plain number, so the currency has to be supplied as
 * affixes — otherwise the animated hero would ignore the currency-position
 * setting and the custom symbols that `formatMoney` applies.
 */
const formatOptions = computed(() => ({
  minimumFractionDigits: settings.hideCents ? 0 : 2,
  maximumFractionDigits: settings.hideCents ? 0 : 2,
}))

const symbol = computed(() => getCurrencySymbol(settings.currency, settings.intlLocale))

const sign = computed(() => {
  if (props.signed === 'income') return '+'
  if (props.signed === 'expense') return '−'
  return (props.amount ?? 0) < 0 ? '−' : ''
})

const prefix = computed(() => {
  if (settings.currencyPosition === 'after') return sign.value
  const sym = symbol.value
  return `${sign.value}${sym}${sym.endsWith('.') ? ' ' : ''}`
})

const suffix = computed(() =>
  settings.currencyPosition === 'after' ? ` ${symbol.value}` : '',
)

const display = computed(() => {
  if (props.text) return props.text
  const formatted = formatMoney(
    props.amount,
    settings.currency,
    settings.intlLocale,
    settings.currencyPosition,
    settings.hideCents,
  )
  if (props.signed === 'income') return `+${formatted}`
  if (props.signed === 'expense') return `−${formatted}`
  return formatted
})
</script>

<template>
  <span
    class="money"
    :class="[`money--${size}`, { 'money--hidden': hidden }]"
    :aria-label="hidden ? t('home.hiddenAmount') : undefined"
  >
    <span class="money-value" :aria-hidden="hidden">
      <NumberFlow
        v-if="!text && (size === 'hero' || animated)"
        :value="numericValue"
        :format="formatOptions"
        :locales="settings.intlLocale"
        :prefix="prefix"
        :suffix="suffix"
      />
      <template v-else>{{ display }}</template>
    </span>
  </span>
</template>

<style scoped>
.money {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  vertical-align: baseline;
  color: inherit;
}

.money--hidden {
  filter: blur(max(10px, 0.42em));
  user-select: none;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .money {
    transition: filter 180ms var(--ease-standard);
  }
}
</style>
