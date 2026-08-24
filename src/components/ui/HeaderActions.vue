<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Flame, Moon, Settings, Sun, Wallet, Zap } from '@lucide/vue'
import { toggleOffFeedback, toggleOnFeedback } from '@/services/native/haptics'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'

const { t } = useI18n()
const settings = useSettingsStore()
const transactions = useTransactionsStore()
const spinning = ref(false)

async function toggleTheme() {
  spinning.value = true
  const modes: ('light' | 'dark' | 'oled')[] = ['light', 'dark', 'oled']
  const idx = modes.indexOf(settings.resolvedTheme)
  const nextMode = modes[(idx + 1) % modes.length]!
  await settings.setTheme(nextMode)
  if (nextMode === 'dark' || nextMode === 'oled') void toggleOnFeedback()
  else void toggleOffFeedback()
  setTimeout(() => { spinning.value = false }, 400)
}
</script>

<template>
  <div class="header-actions">
    <!-- Streak Day Indicator -->
    <RouterLink
      to="/insights"
      class="streak-btn"
      :class="{ 'streak-active': transactions.streak.current > 0, 'streak-today': transactions.streak.activeToday }"
      :aria-label="t('streak.label', { count: transactions.streak.current }, `${transactions.streak.current} day streak`)"
      :title="transactions.streak.current > 0 ? `${transactions.streak.current} day streak!` : 'Log today to start your streak!'"
    >
      <Flame :size="17" class="streak-flame" />
      <span class="streak-count">{{ transactions.streak.current }}</span>
    </RouterLink>

    <!-- Theme Toggle -->
    <button
      type="button"
      class="icon-btn"
      :class="{ 'icon-spinning': spinning }"
      :aria-label="t('settings.appearance')"
      @click="toggleTheme"
    >
      <Zap v-if="settings.resolvedTheme === 'oled'" :size="19" />
      <Sun v-else-if="settings.resolvedTheme === 'dark'" :size="19" />
      <Moon v-else :size="19" />
    </button>

    <!-- Accounts -->
    <RouterLink to="/accounts" class="icon-btn" :aria-label="t('home.accounts')">
      <Wallet :size="19" />
    </RouterLink>

    <!-- Settings -->
    <RouterLink to="/settings" class="icon-btn" :aria-label="t('home.settings')">
      <Settings :size="19" />
    </RouterLink>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* Streak Pill Button */
.streak-btn {
  height: var(--touch-min);
  padding: 0 10px 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-full);
  color: var(--color-muted);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  border: 1px solid var(--color-outline-variant);
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
  animation: fadeSlideUp 0.35s var(--ease-emphasized) both;
}

.streak-flame {
  color: var(--color-muted);
  transition: transform var(--duration-fast) var(--ease-spring), color var(--duration-fast);
}

.streak-count {
  font-size: 0.8125rem;
  font-weight: 700;
  font-family: var(--font-body);
  font-variant-numeric: tabular-nums;
  color: var(--color-muted);
  line-height: 1;
}

.streak-active {
  background: color-mix(in srgb, #ff9500 12%, var(--color-surface));
  border-color: color-mix(in srgb, #ff9500 35%, transparent);
  box-shadow: 0 2px 8px color-mix(in srgb, #ff9500 15%, transparent);
}

.streak-active .streak-flame {
  color: #ff9500;
  fill: #ff9500;
  animation: flamePulse 2s ease-in-out infinite;
}

.streak-active .streak-count {
  color: var(--color-on-surface);
}

.streak-btn:hover {
  background: var(--color-surface-container-high);
}

.streak-btn:active {
  transform: scale(0.93);
}

@keyframes flamePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}

/* Icon Buttons */
.icon-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  transition:
    background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
  text-decoration: none;
  border: none;
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.icon-btn:active {
  transform: scale(0.94);
}

.icon-spinning {
  animation: iconSpin 0.4s var(--ease-spring) both;
}

.header-actions .icon-btn:nth-child(2) {
  animation: fadeSlideUp 0.35s var(--ease-emphasized) both;
  animation-delay: 50ms;
}
.header-actions .icon-btn:nth-child(3) {
  animation: fadeSlideUp 0.35s var(--ease-emphasized) both;
  animation-delay: 100ms;
}
.header-actions .icon-btn:nth-child(4) {
  animation: fadeSlideUp 0.35s var(--ease-emphasized) both;
  animation-delay: 150ms;
}
</style>
