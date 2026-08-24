<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Delete } from '@lucide/vue'
import { amountHasExpression, parseMoneyToMinor } from '@/lib/money'
import { tapFeedback } from '@/services/native/haptics'
import type { CurrencyPosition } from '@/types/finance'

const props = withDefaults(
  defineProps<{
    modelValue: string
    currencySymbol?: string
    currencyPosition?: CurrencyPosition
  }>(),
  {
    currencySymbol: '$',
    currencyPosition: 'before',
  },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()
const { t } = useI18n()

const hasExpression = computed(() => amountHasExpression(props.modelValue))
const preview = computed(() => {
  const minor = parseMoneyToMinor(props.modelValue)
  const n = (Math.abs(minor) / 100).toFixed(2)
  const sign = minor < 0 ? '−' : ''
  const symbol = props.currencySymbol
  const prefix = symbol.endsWith('.') ? `${symbol} ` : symbol
  return props.currencyPosition === 'after'
    ? `${sign}${n} ${symbol}`
    : `${sign}${prefix}${n}`
})

function lastOperand(value: string): string {
  const normalized = value.replace(/[−–—]/g, '-')
  const idx = Math.max(normalized.lastIndexOf('+'), normalized.lastIndexOf('-'))
  if (idx === -1) return value
  if (idx === value.length - 1) return ''
  return value.slice(idx + 1)
}

function push(digit: string) {
  void tapFeedback()
  let next = props.modelValue

  if (digit === '+' || digit === '-') {
    if (!next || next === '-' || next === '+') return
    if (next.endsWith('+') || next.endsWith('-')) next = `${next.slice(0, -1)}${digit}`
    else next = `${next}${digit}`
    emit('update:modelValue', next)
    return
  }

  if (digit === '00') {
    if (!next || next === '0') {
      emit('update:modelValue', '0')
      return
    }
    const operand = lastOperand(next)
    const [, dec] = operand.split('.')
    if (dec != null) return
    next = `${next}00`
    emit('update:modelValue', next)
    return
  }

  if (digit === '.') {
    const operand = lastOperand(next)
    if (operand.includes('.')) return
    next = !next || next.endsWith('+') || next.endsWith('-') ? `${next}0.` : `${next}.`
    emit('update:modelValue', next)
    return
  }

  const operand = lastOperand(next)
  const [, dec] = operand.split('.')
  if (dec && dec.length >= 2) return
  if (operand === '0') next = `${next.slice(0, -1)}${digit}`
  else next = `${next}${digit}`
  emit('update:modelValue', next)
}

function backspace() {
  void tapFeedback()
  emit('update:modelValue', props.modelValue.slice(0, -1))
}

function clear() {
  void tapFeedback()
  emit('update:modelValue', '')
}

type Key = { id: string; label: string; kind: 'digit' | 'op' | 'back' | 'clear' }

const keys: Key[] = [
  { id: '1', label: '1', kind: 'digit' },
  { id: '2', label: '2', kind: 'digit' },
  { id: '3', label: '3', kind: 'digit' },
  { id: '+', label: '+', kind: 'op' },
  { id: '4', label: '4', kind: 'digit' },
  { id: '5', label: '5', kind: 'digit' },
  { id: '6', label: '6', kind: 'digit' },
  { id: '-', label: '−', kind: 'op' },
  { id: '7', label: '7', kind: 'digit' },
  { id: '8', label: '8', kind: 'digit' },
  { id: '9', label: '9', kind: 'digit' },
  { id: 'back', label: '', kind: 'back' },
  { id: 'clear', label: 'C', kind: 'clear' },
  { id: '0', label: '0', kind: 'digit' },
  { id: '00', label: '00', kind: 'digit' },
  { id: '.', label: '.', kind: 'digit' },
]

function onKey(key: Key) {
  if (key.kind === 'back') backspace()
  else if (key.kind === 'clear') clear()
  else push(key.id)
}

function ariaFor(key: Key) {
  if (key.kind === 'back') return t('quickAdd.backspace')
  if (key.kind === 'clear') return t('quickAdd.clear')
  if (key.id === '+') return t('quickAdd.addOp')
  if (key.id === '-') return t('quickAdd.subOp')
  if (key.id === '.') return t('quickAdd.decimal')
  return key.label
}
</script>

<template>
  <div class="keypad">
    <div class="amount-display" aria-live="polite">
      <div class="expr">
        <span v-if="currencyPosition === 'before' && !hasExpression" class="currency">{{
          currencySymbol
        }}</span>
        <span class="value">{{ modelValue || '0' }}</span>
        <span v-if="currencyPosition === 'after' && !hasExpression" class="currency">{{
          currencySymbol
        }}</span>
      </div>
      <p v-if="hasExpression" class="sum">= {{ preview }}</p>
    </div>
    <div class="keys" role="group" :aria-label="t('quickAdd.amountKeypad')">
      <button
        v-for="k in keys"
        :key="k.id"
        type="button"
        class="key"
        :class="{
          'key--op': k.kind === 'op',
        }"
        :aria-label="ariaFor(k)"
        @click="onKey(k)"
      >
        <Delete v-if="k.kind === 'back'" :size="18" />
        <template v-else>{{ k.label }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.keypad {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-1) 0;
}

.amount-display {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: var(--space-2) 0;
  font-family: var(--font-display);
  min-height: 3.5rem;
}

.expr {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-2);
  max-width: 100%;
}

.currency {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
  opacity: 0.8;
}

.value {
  font-size: clamp(2rem, 8vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  overflow-x: auto;
  max-width: 100%;
  text-align: center;
  color: var(--color-on-surface);
}

.sum {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  background: var(--color-surface-container);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

.keys {
  flex: 1;
  min-height: 0;
  max-height: 22rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, minmax(42px, 1fr));
  gap: 8px;
}

.key {
  min-height: 42px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-outline) 14%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, #000 6%, transparent);
  font-size: clamp(1.1rem, 4.5vw, 1.35rem);
  font-weight: 600;
  color: var(--color-on-surface);
  display: grid;
  place-items: center;
  padding: 4px;
  touch-action: manipulation;
  transition:
    transform var(--duration-fast) var(--ease-spring-snappy),
    background var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
  user-select: none;
}

.key:hover {
  background: var(--color-surface-container-high);
  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, #000 12%, transparent);
}

.key:active {
  transform: scale(0.92) translateY(0);
  background: var(--color-surface-container-highest);
  box-shadow: none;
}

.key--wide {
  grid-column: span 2;
}

.key--op {
  background: color-mix(in srgb, var(--color-primary-container) 80%, var(--color-surface));
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  font-weight: 700;
}

.key--op:hover {
  background: var(--color-primary-container);
  border-color: var(--color-primary);
}

.key--op:active {
  background: color-mix(in srgb, var(--color-primary-container) 60%, var(--color-primary));
  color: var(--color-on-primary);
}
</style>
