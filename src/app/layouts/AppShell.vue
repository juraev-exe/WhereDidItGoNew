<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { WifiOff } from '@lucide/vue'
import MobileBottomNav from '@/app/layouts/MobileBottomNav.vue'
import QuickAddSheet from '@/features/transactions/QuickAddSheet.vue'
import CategoryFormSheet from '@/components/CategoryFormSheet.vue'
import PaywallModal from '@/components/PaywallModal.vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { tickFeedback } from '@/services/native/haptics'
import { usePremiumStore } from '@/stores/premium'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const showNav = computed(() => route.meta.hideNav !== true)
const { isOnline } = useNetworkStatus()
const premium = usePremiumStore()
const settings = useSettingsStore()
const ui = useUiStore()

// Swipe left/right between the tabs shown in MobileBottomNav, in the same
// left-to-right order they appear there. Only active on tab routes (not
// sheets/subpages) and bails out of anything starting inside a horizontally
// scrollable element (tagged data-h-scroll) so it doesn't fight native scroll.
const TAB_ORDER: Array<{ name: string; visible: () => boolean }> = [
  { name: 'home', visible: () => true },
  { name: 'activity', visible: () => settings.showActivityTab },
  { name: 'categories', visible: () => settings.showCategoriesTab },
  { name: 'debts', visible: () => settings.showDebtsTab },
  { name: 'budgets', visible: () => settings.showBudgetsTab },
  { name: 'insights', visible: () => settings.showInsightsTab },
]

const SWIPE_MIN_DISTANCE = 60
const SWIPE_MAX_OFF_AXIS = 45
const SWIPE_DECIDE_THRESHOLD = 12

let swipeTracking = false
let swipePointerId: number | null = null
let swipeStartX = 0
let swipeStartY = 0
let swipeStartTime = 0
let swipeAxis: 'horizontal' | 'vertical' | null = null

function onMainPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (!showNav.value || ui.isAnyModalOpen) return
  if ((e.target as HTMLElement).closest('[data-h-scroll]')) return
  swipeTracking = true
  swipeAxis = null
  swipePointerId = e.pointerId
  swipeStartX = e.clientX
  swipeStartY = e.clientY
  swipeStartTime = performance.now()
}

function onMainPointerMove(e: PointerEvent) {
  if (!swipeTracking || e.pointerId !== swipePointerId || swipeAxis) return
  const dx = e.clientX - swipeStartX
  const dy = e.clientY - swipeStartY
  if (Math.abs(dx) > SWIPE_DECIDE_THRESHOLD || Math.abs(dy) > SWIPE_DECIDE_THRESHOLD) {
    swipeAxis = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'horizontal' : 'vertical'
  }
}

function onMainPointerUp(e: PointerEvent) {
  if (!swipeTracking || e.pointerId !== swipePointerId) return
  swipeTracking = false
  if (swipeAxis !== 'horizontal') return
  const dx = e.clientX - swipeStartX
  const dy = e.clientY - swipeStartY
  if (Math.abs(dy) > SWIPE_MAX_OFF_AXIS) return
  const elapsed = Math.max(performance.now() - swipeStartTime, 1)
  const velocity = Math.abs(dx) / elapsed
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE && velocity < 0.5) return

  const tabs = TAB_ORDER.filter((t) => t.visible()).map((t) => t.name)
  const currentIndex = tabs.indexOf(route.name as string)
  if (currentIndex === -1) return
  const targetName = dx < 0 ? tabs[currentIndex + 1] : tabs[currentIndex - 1]
  if (!targetName) return
  void tickFeedback()
  void router.push({ name: targetName })
}

onMounted(() => {
  ui.closeAdd()
  ui.closeCategories()
  void premium.load()
})

watch(
  () => route.path,
  () => {
    ui.closeAdd()
    ui.closeCategories()
  },
)
</script>

<template>
  <div class="shell">
    <Transition name="offline-banner">
      <div v-if="!isOnline" class="offline-bar" role="status" aria-live="polite">
        <WifiOff :size="14" />
        <span>Offline — changes saved locally</span>
      </div>
    </Transition>
    <main
      class="main"
      :class="{ 'main--nav': showNav }"
      @pointerdown="onMainPointerDown"
      @pointermove="onMainPointerMove"
      @pointerup="onMainPointerUp"
      @pointercancel="onMainPointerUp"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <Transition name="nav-slide">
      <MobileBottomNav v-if="showNav" />
    </Transition>
    <QuickAddSheet />
    <CategoryFormSheet
      :open="ui.categoriesSheetOpen"
      :category="ui.categoryToEdit"
      :default-kind="ui.categoryDefaultKind"
      @close="ui.closeCategories()"
    />
    <PaywallModal />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-tint), var(--color-background);
}

.main {
  flex: 1;
  width: min(100%, var(--content-max));
  margin: 0 auto;
  padding:
    calc(var(--space-4) + var(--safe-top))
    var(--space-4)
    var(--space-6);
}

.main--nav {
  padding-bottom: calc(
    var(--nav-height) + var(--space-3) + var(--safe-bottom) + var(--space-8)
  );
}

.page-enter-active {
  transition:
    opacity var(--duration-normal) var(--ease-emphasized),
    transform var(--duration-normal) var(--ease-emphasized),
    filter var(--duration-normal) var(--ease-emphasized);
}

.page-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard),
    filter var(--duration-fast) var(--ease-standard);
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
  filter: blur(4px);
}

.page-leave-to {
  opacity: 0;
  transform: scale(1.01) translateY(-6px);
  filter: blur(2px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: opacity var(--duration-fast) var(--ease-standard);
  }
  .page-enter-from,
  .page-leave-to {
    transform: none;
    filter: none;
  }
}

.offline-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface));
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
  color: var(--color-warning);
  font-size: var(--text-caption);
  font-weight: 600;
  text-align: center;
}

.offline-banner-enter-active {
  transition: opacity var(--duration-normal) var(--ease-standard), transform var(--duration-normal) var(--ease-drawer);
}

.offline-banner-leave-active {
  transition: opacity var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}

.offline-banner-enter-from,
.offline-banner-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

.nav-slide-enter-active,
.nav-slide-leave-active {
  transition: opacity 0.22s var(--ease-standard), transform 0.25s var(--ease-emphasized);
}

.nav-slide-enter-from,
.nav-slide-leave-to {
  opacity: 0;
  transform: translateY(120%);
}
</style>
