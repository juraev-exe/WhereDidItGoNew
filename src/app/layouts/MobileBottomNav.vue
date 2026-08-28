<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChartPie, FolderKanban, HandCoins, Home, List, PiggyBank, Plus } from '@lucide/vue'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { tickFeedback } from '@/services/native/haptics'

const { t } = useI18n()
const route = useRoute()
const ui = useUiStore()
const settings = useSettingsStore()

function toggleAdd() {
  if (ui.addSheetOpen) {
    ui.closeAdd()
  } else {
    ui.openAdd()
  }
}
</script>

<template>
  <nav
    class="nav"
    :class="{ 'nav--hidden': ui.isAnyModalOpen, 'nav--icons-only': settings.navLabelStyle === 'icons' }"
    :aria-label="t('nav.main')"
  >
    <div class="nav-inner">
      <!-- Left side tabs (3 tabs) -->
      <div class="nav-side nav-side--left">
        <!-- Home tab -->
        <RouterLink
          to="/"
          class="tab"
          :class="{ 'tab--active': route.name === 'home' }"
          :aria-label="t('nav.home')"
          @click="tickFeedback()"
        >
          <Home :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.home') }}</span>
        </RouterLink>

        <!-- Activity Tab -->
        <RouterLink
          v-if="settings.showActivityTab"
          to="/activity"
          class="tab"
          :class="{ 'tab--active': route.name === 'activity' }"
          :aria-label="t('nav.activity')"
          @click="tickFeedback()"
        >
          <List :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.activity') }}</span>
        </RouterLink>

        <!-- Categories Tab -->
        <RouterLink
          v-if="settings.showCategoriesTab"
          to="/categories"
          class="tab"
          :class="{ 'tab--active': route.name === 'categories' }"
          :aria-label="t('nav.categories')"
          @click="tickFeedback()"
        >
          <FolderKanban :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.categories') }}</span>
        </RouterLink>
      </div>

      <!-- Dead-Center FAB Button -->
      <div class="nav-center-slot">
        <button type="button" class="fab" :aria-label="t('nav.addTransaction')" @click="toggleAdd">
          <Plus :size="24" :stroke-width="2.5" />
        </button>
      </div>

      <!-- Right side tabs (3 tabs) -->
      <div class="nav-side nav-side--right">
        <!-- Debts Tab -->
        <RouterLink
          v-if="settings.showDebtsTab"
          to="/debts"
          class="tab"
          :class="{ 'tab--active': route.name === 'debts' }"
          :aria-label="t('nav.debts')"
          @click="tickFeedback()"
        >
          <HandCoins :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.debts') }}</span>
        </RouterLink>

        <!-- Budgets Tab -->
        <RouterLink
          v-if="settings.showBudgetsTab"
          to="/budgets"
          class="tab"
          :class="{ 'tab--active': route.name === 'budgets' }"
          :aria-label="t('nav.budgets')"
          @click="tickFeedback()"
        >
          <PiggyBank :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.budgets') }}</span>
        </RouterLink>

        <!-- Insights Tab -->
        <RouterLink
          v-if="settings.showInsightsTab"
          to="/insights"
          class="tab"
          :class="{ 'tab--active': route.name === 'insights' }"
          :aria-label="t('nav.insights')"
          @click="tickFeedback()"
        >
          <ChartPie :size="20" />
          <span v-if="settings.navLabelStyle === 'labels'">{{ t('nav.insights') }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  container-type: inline-size;
  container-name: nav;
  position: fixed;
  left: 0;
  right: 0;
  margin-inline: auto;
  bottom: calc(var(--space-3) + var(--safe-bottom));
  z-index: 40;
  width: min(
    calc(100% - (var(--space-4) * 2) - var(--safe-left) - var(--safe-right)),
    var(--content-max)
  );
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid color-mix(in srgb, var(--color-outline-variant) 90%, transparent);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  padding: 4px 8px;
  transition: opacity 0.28s var(--ease-standard), transform 0.32s var(--ease-emphasized), visibility 0.32s;
}

.nav--hidden {
  opacity: 0 !important;
  transform: translateY(140%) scale(0.94) !important;
  pointer-events: none !important;
  visibility: hidden !important;
}

.nav-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: calc(var(--nav-height) - 4px);
  width: 100%;
}

.nav-side {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  min-width: 0;
}

.nav-side--right {
  justify-self: end;
  width: 100%;
}

.nav-center-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0 2px;
}

/* Content-sized rather than equal-width: short labels give their slack to long
   ones, which is what keeps Russian/Tajik names from truncating. */
.tab {
  flex: 0 1 auto;
  min-width: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  max-width: 84px;
  padding: 3px 1px;
  border-radius: var(--radius-lg);
  color: var(--color-muted);
  /* Scales down on narrow screens so Russian/Tajik labels stay readable. */
  font-size: clamp(0.5625rem, 2.55vw, 0.6875rem);
  font-weight: 600;
  letter-spacing: 0;
  transition: color var(--duration-fast) var(--ease-standard),
              background var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-spring-snappy);
  text-decoration: none;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.tab:focus,
.tab:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

@media (hover: hover) and (pointer: fine) {
  .tab:hover {
    color: var(--color-on-surface);
    transform: translateY(-1px);
  }
}

.tab:active {
  transform: scale(0.92) translateY(0);
}

.tab span {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* When the bar itself doesn't have room for six labels — a small/older phone,
   a split-screen layout, a resized preview panel — drop to icon-only rather
   than truncating labels into unreadable fragments ("Cat", "Act"...). This is
   a fallback independent of the user's own icon/label choice in Settings,
   which still governs everything above this width. */
@container nav (max-width: 300px) {
  .tab span {
    display: none;
  }

  .tab {
    min-width: 36px;
    max-width: 48px;
    padding: 6px 2px;
  }
}

.tab--active {
  color: var(--color-primary);
  font-weight: 700;
}

.tab--active svg {
  animation: tabPop 0.35s var(--ease-spring) both;
}

/* Icon-only nav style: tabs shrink to circular hit targets and the whole
   pill no longer needs to stretch to fit six labels, so it feels roomier
   instead of cramped on narrower phones. */
.nav--icons-only .tab {
  min-width: 44px;
  max-width: 52px;
  padding: 8px;
}

.nav--icons-only .tab--active {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.fab {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 42%, transparent);
  display: grid;
  place-items: center;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              box-shadow var(--duration-fast) var(--ease-standard);
  cursor: pointer;
  border: none;
  animation: popIn 0.45s var(--ease-spring) both;
  animation-delay: 350ms;
}

.fab:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-primary) 55%, transparent);
}

.fab:active {
  transform: scale(0.92) translateY(0);
}
</style>
