<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check, ChevronRight } from '@lucide/vue'
import { getCurrencySymbol } from '@/lib/money'
import { CURRENCIES } from '@/lib/currencies'
import { useSettingsStore } from '@/stores/settings'
import { usePremiumStore } from '@/stores/premium'
import { tickFeedback } from '@/services/native/haptics'
import type { CurrencyPosition } from '@/types/finance'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const premium = usePremiumStore()

const currencyModalOpen = ref(false)
const startOfMonthModalOpen = ref(false)
const searchQuery = ref('')

const currencyList = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const list = CURRENCIES.map((c) => ({
    code: c.code,
    name: t(`currencies.${c.nameKey}`),
    symbol: getCurrencySymbol(c.code),
  }))
  if (!q) return list
  return list.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
  )
})

const selectedCurrencyName = computed(() => {
  const found = CURRENCIES.find((c) => c.code === settings.currency)
  return found ? `${t(`currencies.${found.nameKey}`)} (${found.code})` : settings.currency
})

const formatPreview = computed(() => {
  const sym = settings.currencySymbol
  if (settings.currencyPosition === 'before') {
    return settings.hideCents ? `${sym} 1,234,567` : `${sym} 1,234,567.89`
  }
  return settings.hideCents ? `1,234,567 ${sym}` : `1,234,567.89 ${sym}`
})

async function onSelectCurrency(code: string) {
  await settings.setCurrency(code)
  currencyModalOpen.value = false
  void tickFeedback()
  emit('notify', t('settings.currencyUpdated', 'Currency updated'))
}

async function onTogglePosition() {
  const next: CurrencyPosition = settings.currencyPosition === 'before' ? 'after' : 'before'
  await settings.setCurrencyPosition(next)
  void tickFeedback()
}

async function onToggleHideCents() {
  if (!premium.isPremiumUser && !settings.hideCents) {
    premium.openPaywall(t('premium.limitHideCents', 'Hide cents is a Pro feature.'))
    return
  }
  await settings.setHideCents(!settings.hideCents)
  void tickFeedback()
}

async function onSelectStartDay(day: number) {
  if (!premium.isPremiumUser && day !== 1) {
    premium.openPaywall(t('premium.limitStartOfMonth', 'Custom month start date is a Pro feature.'))
    return
  }
  await settings.setStartOfMonth(day)
  startOfMonthModalOpen.value = false
  void tickFeedback()
}

async function onToggleFirstDayOfWeek() {
  const next = settings.firstDayOfWeek === 1 ? 0 : 1
  await settings.setFirstDayOfWeek(next)
  void tickFeedback()
}
</script>

<template>
  <div class="subpage">
    <div class="header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.formattingTitle', 'Formatting') }}</h2>
    </div>

    <div class="grouped-section">
      <!-- Main Currency -->
      <button type="button" class="row-btn" @click="currencyModalOpen = true">
        <div class="row-label">
          <span class="title">{{ t('settings.currency', 'Main currency') }}</span>
          <span class="subtitle">{{ selectedCurrencyName }}</span>
        </div>
        <ChevronRight :size="18" class="chevron" />
      </button>

      <div class="divider" />

      <!-- Currency Format Preview / Position -->
      <button type="button" class="row-btn" @click="onTogglePosition">
        <div class="row-label">
          <span class="title">{{ t('settings.currencyFormat', 'Currency format') }}</span>
          <span class="subtitle value-accent">{{ formatPreview }}</span>
        </div>
        <ChevronRight :size="18" class="chevron" />
      </button>

      <div class="divider" />

      <!-- Hide Cents Toggle -->
      <div class="row-toggle" @click="onToggleHideCents">
        <div class="row-label">
          <div class="title-with-badge">
            <span class="title">{{ t('settings.hideCents', 'Hide cents') }}</span>
            <span v-if="!premium.isPremiumUser" class="pro-badge">Pro</span>
          </div>
          <span class="subtitle">{{ t('settings.hideCentsDesc', 'Round numbers without decimal fractions') }}</span>
        </div>
        <label class="switch" @click.stop>
          <input type="checkbox" :checked="settings.hideCents" @change="onToggleHideCents" />
          <span class="slider" />
        </label>
      </div>

      <div class="divider" />

      <!-- Start of Month -->
      <button type="button" class="row-btn" @click="startOfMonthModalOpen = true">
        <div class="row-label">
          <div class="title-with-badge">
            <span class="title">{{ t('settings.startOfMonth', 'Start of month') }}</span>
            <span v-if="!premium.isPremiumUser" class="pro-badge">Pro</span>
          </div>
          <span class="subtitle value-accent">{{ settings.startOfMonth }}</span>
        </div>
        <ChevronRight :size="18" class="chevron" />
      </button>

      <div class="divider" />

      <!-- First Day of Week -->
      <button type="button" class="row-btn" @click="onToggleFirstDayOfWeek">
        <div class="row-label">
          <span class="title">{{ t('settings.firstDayOfWeek', 'First day of week') }}</span>
          <span class="subtitle value-accent">
            {{ settings.firstDayOfWeek === 1 ? t('settings.monday', 'Monday') : t('settings.sunday', 'Sunday (System default)') }}
          </span>
        </div>
        <ChevronRight :size="18" class="chevron" />
      </button>
    </div>

    <!-- Currency Selection Modal -->
    <div v-if="currencyModalOpen" class="modal-backdrop" @click="currencyModalOpen = false">
      <div class="modal-content surface-glass" @click.stop>
        <div class="modal-head">
          <h3>{{ t('settings.selectCurrency', 'Select Currency') }}</h3>
          <button type="button" class="modal-close" @click="currencyModalOpen = false">✕</button>
        </div>
        <input
          v-model="searchQuery"
          type="search"
          class="search-input"
          :placeholder="t('common.search', 'Search…')"
        />
        <div class="modal-list">
          <button
            v-for="c in currencyList"
            :key="c.code"
            type="button"
            class="currency-item"
            :class="{ active: settings.currency === c.code }"
            @click="onSelectCurrency(c.code)"
          >
            <div class="currency-info">
              <span class="code">{{ c.code }}</span>
              <span class="name">{{ c.name }}</span>
            </div>
            <span class="symbol">{{ c.symbol }}</span>
            <Check v-if="settings.currency === c.code" :size="18" class="check-icon" />
          </button>
        </div>
      </div>
    </div>

    <!-- Start of Month Modal -->
    <div v-if="startOfMonthModalOpen" class="modal-backdrop" @click="startOfMonthModalOpen = false">
      <div class="modal-content surface-glass modal-days" @click.stop>
        <div class="modal-head">
          <h3>{{ t('settings.startOfMonth', 'Start of Month') }}</h3>
          <button type="button" class="modal-close" @click="startOfMonthModalOpen = false">✕</button>
        </div>
        <p class="modal-sub">{{ t('settings.startOfMonthDesc', 'Set the starting day for monthly budget and cycle tracking') }}</p>
        <div class="days-grid">
          <button
            v-for="d in 28"
            :key="d"
            type="button"
            class="day-btn"
            :class="{ active: settings.startOfMonth === d }"
            @click="onSelectStartDay(d)"
          >
            {{ d }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy);
}

.back-btn:active {
  transform: scale(0.92);
}

h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.grouped-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-outline);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.row-btn,
.row-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-4) var(--space-5);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast);
}

.row-btn:active {
  background: color-mix(in srgb, var(--color-outline) 8%, transparent);
}

.row-label {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.subtitle {
  font-size: 0.84rem;
  color: var(--color-muted);
}

.value-accent {
  color: var(--color-primary);
  font-weight: 500;
}

.pro-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  letter-spacing: 0.02em;
}

.chevron {
  color: var(--color-muted);
}

.divider {
  height: 1px;
  background: var(--color-outline-variant);
  margin-left: var(--space-5);
}

/* iOS Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-surface-container-high);
  transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: fadeIn 0.2s ease both;
}

.modal-content {
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-outline);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-head h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.modal-close {
  background: var(--color-surface-container);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  cursor: pointer;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline);
  color: var(--color-on-surface);
}

.modal-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 360px;
}

.currency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.currency-item:active,
.currency-item.active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.currency-info {
  display: flex;
  flex-direction: column;
}

.currency-info .code {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-on-surface);
}

.currency-info .name {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.symbol {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-muted);
  margin-left: auto;
  margin-right: var(--space-3);
}

.check-icon {
  color: var(--color-primary);
}

.modal-sub {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding-top: var(--space-2);
}

.day-btn {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  background: var(--color-surface-container);
  border: 1px solid transparent;
  color: var(--color-on-surface);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast) var(--ease-spring-snappy);
}

.day-btn:active,
.day-btn.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
</style>
