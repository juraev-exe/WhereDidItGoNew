<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settings'
import { usePremiumStore } from '@/stores/premium'
import { tickFeedback } from '@/services/native/haptics'
import type { PrivacyMode } from '@/types/finance'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const premium = usePremiumStore()

async function onToggleHideInRecents() {
  if (!premium.isPremiumUser && !settings.hideInRecents) {
    premium.openPaywall(t('premium.limitHideInRecents', 'Recent apps privacy guard is a Pro feature.'))
    return
  }
  await settings.setHideInRecents(!settings.hideInRecents)
  void tickFeedback()
}

async function onSelectPrivacyMode(mode: PrivacyMode) {
  if (!premium.isPremiumUser && mode !== 'none') {
    premium.openPaywall(t('premium.limitPrivacy', 'Custom privacy mode is a Pro feature.'))
    return
  }
  await settings.setPrivacyMode(mode)
  void tickFeedback()
}
</script>

<template>
  <div class="subpage">
    <div class="header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.privacyTitle', 'Privacy') }}</h2>
    </div>

    <div class="grouped-section">
      <!-- Hide Preview in Recents Toggle -->
      <div class="row-toggle" @click="onToggleHideInRecents">
        <div class="row-label">
          <div class="title-with-badge">
            <span class="title">{{ t('settings.hideInRecents', 'Hide preview in recents') }}</span>
            <span v-if="!premium.isPremiumUser" class="pro-badge">Pro</span>
          </div>
          <span class="subtitle">
            {{ t('settings.hideInRecentsDesc', 'Hides the app content in the recent apps list. This also protects screenshots.') }}
          </span>
        </div>
        <label class="switch" @click.stop>
          <input type="checkbox" :checked="settings.hideInRecents" @change="onToggleHideInRecents" />
          <span class="slider" />
        </label>
      </div>
    </div>

    <h3 class="section-title">{{ t('settings.hiddenValuesTitle', 'Hidden values after activation') }}</h3>

    <div class="grouped-section">
      <!-- Privacy Mode: None -->
      <button
        type="button"
        class="row-btn"
        :class="{ active: settings.privacyMode === 'none' }"
        @click="onSelectPrivacyMode('none')"
      >
        <div class="row-label">
          <span class="title">{{ t('settings.privacyNone', 'Show all values') }}</span>
          <span class="subtitle">{{ t('settings.privacyNoneDesc', 'All balances and transactions are visible') }}</span>
        </div>
        <Check v-if="settings.privacyMode === 'none'" :size="18" class="check-icon" />
      </button>

      <div class="divider" />

      <!-- Privacy Mode: Hero only -->
      <button
        type="button"
        class="row-btn"
        :class="{ active: settings.privacyMode === 'hero' }"
        @click="onSelectPrivacyMode('hero')"
      >
        <div class="row-label">
          <div class="title-with-badge">
            <span class="title">{{ t('settings.privacyHero', 'Hide total balance only') }}</span>
            <span v-if="!premium.isPremiumUser" class="pro-badge">Pro</span>
          </div>
          <span class="subtitle">{{ t('settings.privacyHeroDesc', 'Blurs top hero card but shows transactions') }}</span>
        </div>
        <Check v-if="settings.privacyMode === 'hero'" :size="18" class="check-icon" />
      </button>

      <div class="divider" />

      <!-- Privacy Mode: All -->
      <button
        type="button"
        class="row-btn"
        :class="{ active: settings.privacyMode === 'all' }"
        @click="onSelectPrivacyMode('all')"
      >
        <div class="row-label">
          <div class="title-with-badge">
            <span class="title">{{ t('settings.privacyAll', 'Hide all values') }}</span>
            <span v-if="!premium.isPremiumUser" class="pro-badge">Pro</span>
          </div>
          <span class="subtitle">{{ t('settings.privacyAllDesc', 'Hides and blurs all amounts across the entire app') }}</span>
        </div>
        <Check v-if="settings.privacyMode === 'all'" :size="18" class="check-icon" />
      </button>
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

.section-title {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
  margin-top: var(--space-2);
  margin-left: var(--space-2);
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
  max-width: 85%;
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
  line-height: 1.35;
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

.check-icon {
  color: var(--color-primary);
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
  flex-shrink: 0;
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
</style>
