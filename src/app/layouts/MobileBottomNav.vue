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
  <nav class="nav" :aria-label="t('nav.main')">
    <div class="nav-inner">
      <!-- Left side tabs (3 tabs) -->
      <div class="nav-side nav-side--left">
        <!-- Home tab -->
        <RouterLink
          to="/"
          class="tab"
          :class="{ 'tab--active': route.name === 'home' }"
          @click="tickFeedback()"
        >
          <Home :size="20" />
          <span>{{ t('nav.home') }}</span>
        </RouterLink>

        <!-- Activity Tab -->
        <RouterLink
          v-if="settings.showActivityTab"
          to="/activity"
          class="tab"
          :class="{ 'tab--active': route.name === 'activity' }"
          @click="tickFeedback()"
        >
          <List :size="20" />
          <span>{{ t('nav.activity') }}</span>
        </RouterLink>

        <!-- Categories Tab -->
        <RouterLink
          v-if="settings.showCategoriesTab"
          to="/categories"
          class="tab"
          :class="{ 'tab--active': route.name === 'categories' }"
          @click="tickFeedback()"
        >
          <FolderKanban :size="20" />
          <span>{{ t('nav.categories') }}</span>
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
          @click="tickFeedback()"
        >
          <HandCoins :size="20" />
          <span>{{ t('nav.debts') }}</span>
        </RouterLink>

        <!-- Budgets Tab -->
        <RouterLink
          v-if="settings.showBudgetsTab"
          to="/budgets"
          class="tab"
          :class="{ 'tab--active': route.name === 'budgets' }"
          @click="tickFeedback()"
        >
          <PiggyBank :size="20" />
          <span>{{ t('nav.budgets') }}</span>
        </RouterLink>

        <!-- Insights Tab -->
        <RouterLink
          v-if="settings.showInsightsTab"
          to="/insights"
          class="tab"
          :class="{ 'tab--active': route.name === 'insights' }"
          @click="tickFeedback()"
        >
          <ChartPie :size="20" />
          <span>{{ t('nav.insights') }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav {
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

:global(body.has-open-modal) .nav,
:global(body:has(.sheet-root)) .nav,
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
  padding: 0 4px;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  max-width: 72px;
  padding: 3px 4px;
  border-radius: var(--radius-lg);
  color: var(--color-muted);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
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

.tab--active {
  color: var(--color-primary);
  font-weight: 700;
}

.tab--active svg {
  animation: tabPop 0.35s var(--ease-spring) both;
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
