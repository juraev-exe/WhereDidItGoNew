<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Toaster, toast } from 'vue-sonner'
import 'vue-sonner/style.css'
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import AppShell from '@/app/layouts/AppShell.vue'
import PinLockModal from '@/components/PinLockModal.vue'
import { db } from '@/db'
import { monthKey } from '@/lib/dates'
import { hideSplash } from '@/services/native/chrome'
import { initDeepLinks } from '@/services/native/deepLinks'
import { scheduleRecurringReminders } from '@/services/native/notifications'
import { updateBalanceWidget } from '@/services/native/widget'
import { summarizeMonth } from '@/services/stats'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useGoalsStore } from '@/stores/goals'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import { isNative } from '@/lib/platform'

const { t } = useI18n()
const settings = useSettingsStore()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const budgets = useBudgetsStore()
const goals = useGoalsStore()
const recurring = useRecurringStore()
const transactions = useTransactionsStore()
const ui = useUiStore()
const router = useRouter()

let backHandle: PluginListenerHandle | undefined
let appStateHandle: PluginListenerHandle | undefined
let removeDeepLinks: (() => void) | undefined

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365]

async function checkStreakMilestone(current: number) {
  const milestone = [...STREAK_MILESTONES].reverse().find((m) => current >= m)
  if (!milestone) return
  const row = await db.meta.get('lastCelebratedStreak')
  const lastCelebrated = Number(row?.value ?? 0)
  if (milestone <= lastCelebrated) return
  await db.meta.put({ key: 'lastCelebratedStreak', value: String(milestone) })
  toast.success(t('streak.milestone', { count: milestone }))
}

async function runForegroundJobs() {
  await recurring.postDue()
  const copied = await budgets.carryForwardIfNeeded()
  if (copied === 'copied') ui.notifyBudgetCopied(monthKey())
  const summary = summarizeMonth(transactions.transactions, budgets.budgets)
  void updateBalanceWidget({
    monthSpend: summary.expense,
    monthIncome: summary.income,
    currencySymbol: settings.currencySymbol,
  })
  void scheduleRecurringReminders(recurring.items, categories.categories)
}

const isObscured = ref(false)

function onVisibility() {
  if (document.visibilityState === 'visible') {
    isObscured.value = false
    void runForegroundJobs()
  } else if (document.visibilityState === 'hidden') {
    if (settings.hideInRecents) {
      isObscured.value = true
    }
    settings.lockApp()
  }
}

onMounted(async () => {
  await settings.load()
  accounts.start()
  categories.start()
  budgets.start()
  goals.start()
  transactions.start()
  recurring.start()
  await runForegroundJobs()

  if (!settings.onboardingDone && router.currentRoute.value.name !== 'onboarding') {
    await router.replace('/onboarding')
  }

  await hideSplash()

  if (isNative()) {
    removeDeepLinks = await initDeepLinks(() => ui.openAdd())
    appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        isObscured.value = false
        void runForegroundJobs()
      } else {
        if (settings.hideInRecents) {
          isObscured.value = true
        }
        settings.lockApp()
      }
    })
    backHandle = await App.addListener('backButton', () => {
      if (ui.addSheetOpen) {
        ui.closeAdd()
        return
      }
      if (ui.categoriesSheetOpen) {
        ui.closeCategories()
        return
      }
      if (ui.settingsSubpage !== 'root') {
        ui.setSettingsSubpage('root')
        return
      }
      // Capacitor's own `canGoBack` tracks the native WebView history list, which
      // often lags or misreports for a client-side-routed SPA. Vue Router's own
      // history entry (set by createWebHistory on every navigation) is the
      // reliable signal for "is there a previous in-app screen to go back to".
      const hasRouterHistory = (window.history.state as { back?: string | null } | null)?.back != null
      if (hasRouterHistory && router.currentRoute.value.name !== 'home') {
        router.back()
        return
      }
      if (router.currentRoute.value.name !== 'home' && router.currentRoute.value.name !== 'onboarding') {
        void router.replace('/')
        return
      }
      void App.exitApp()
    })
  }

  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  void backHandle?.remove()
  void appStateHandle?.remove()
  removeDeepLinks?.()
  document.removeEventListener('visibilitychange', onVisibility)
  accounts.stop()
  categories.stop()
  budgets.stop()
  goals.stop()
  transactions.stop()
  recurring.stop()
})

watch(
  () => settings.onboardingDone,
  (done) => {
    if (!done && router.currentRoute.value.name !== 'onboarding') {
      void router.replace('/onboarding')
    }
  },
)

watch(
  () => transactions.streak.current,
  (current) => void checkStreakMilestone(current),
)
</script>

<template>
  <div v-if="!settings.ready" class="boot" aria-busy="true" :aria-label="t('common.loading')">
    <p class="brand">WhereDidItGo</p>
  </div>
  <div v-else class="app-root" :class="{ 'app-obscured': isObscured && settings.hideInRecents }">
    <Toaster
      :theme="settings.resolvedTheme === 'oled' ? 'dark' : settings.resolvedTheme"
      position="top-center"
      rich-colors
    />
    <PinLockModal
      v-if="settings.pinEnabled && !settings.isUnlocked"
      mode="unlock"
      @success="settings.unlockApp()"
    />
    <AppShell v-else />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100%;
  transition: filter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-root.app-obscured {
  filter: blur(28px) brightness(0.65);
  pointer-events: none;
  user-select: none;
}

.boot {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: var(--space-8);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--text-headline);
  font-weight: 700;
  color: var(--color-primary);
}
</style>
