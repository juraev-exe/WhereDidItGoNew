<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ChartPie, FolderKanban, HandCoins, List, PiggyBank } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'notify', msg: string): void
}>()

const { t } = useI18n()
const settings = useSettingsStore()

async function toggleTab(
  tabKey:
    | 'showActivityTab'
    | 'showCategoriesTab'
    | 'showDebtsTab'
    | 'showBudgetsTab'
    | 'showInsightsTab',
) {
  if (tabKey === 'showActivityTab') await settings.setShowActivityTab(!settings.showActivityTab)
  else if (tabKey === 'showCategoriesTab')
    await settings.setShowCategoriesTab(!settings.showCategoriesTab)
  else if (tabKey === 'showDebtsTab') await settings.setShowDebtsTab(!settings.showDebtsTab)
  else if (tabKey === 'showBudgetsTab') await settings.setShowBudgetsTab(!settings.showBudgetsTab)
  else if (tabKey === 'showInsightsTab')
    await settings.setShowInsightsTab(!settings.showInsightsTab)
}
</script>

<template>
  <div class="subpage">
    <div class="subpage-header">
      <button type="button" class="back-btn" :aria-label="t('common.back')" @click="emit('back')">
        <ArrowLeft :size="22" />
      </button>
      <h2>{{ t('settings.navigationTabs', 'Bottom Navigation') }}</h2>
    </div>

    <section class="card" aria-labelledby="nav-style-title">
    <div class="header">
      <h2 id="nav-style-title" class="section-title">{{ t('settings.navStyle') }}</h2>
      <p class="section-desc">{{ t('settings.navStyleDesc') }}</p>
    </div>

    <div class="segmented" role="radiogroup" :aria-label="t('settings.navStyle')">
      <button
        type="button"
        role="radio"
        class="seg-btn"
        :class="{ 'seg-btn--on': settings.navLabelStyle === 'labels' }"
        :aria-checked="settings.navLabelStyle === 'labels'"
        @click="settings.setNavLabelStyle('labels')"
      >
        {{ t('settings.navStyleLabels') }}
      </button>
      <button
        type="button"
        role="radio"
        class="seg-btn"
        :class="{ 'seg-btn--on': settings.navLabelStyle === 'icons' }"
        :aria-checked="settings.navLabelStyle === 'icons'"
        @click="settings.setNavLabelStyle('icons')"
      >
        {{ t('settings.navStyleIcons') }}
      </button>
    </div>
    </section>

    <section class="card" aria-labelledby="nav-tabs-title">
    <div class="header">
      <h2 id="nav-tabs-title" class="section-title">{{ t('settings.navigationTabs') }}</h2>
      <p class="section-desc">{{ t('settings.navigationTabsDesc') }}</p>
    </div>

    <div class="tab-options">
      <!-- Activity Tab Toggle -->
      <div class="tab-option">
        <div class="tab-info">
          <div class="tab-title-row">
            <List :size="18" class="tab-icon" />
            <span class="tab-name">{{ t('nav.activity') }}</span>
          </div>
          <span class="tab-desc">{{ t('settings.tabActivityDesc') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.showActivityTab }"
          role="switch"
          :aria-checked="settings.showActivityTab"
          :aria-label="t('nav.activity')"
          @click="toggleTab('showActivityTab')"
        />
      </div>

      <!-- Categories Tab Toggle -->
      <div class="tab-option">
        <div class="tab-info">
          <div class="tab-title-row">
            <FolderKanban :size="18" class="tab-icon" />
            <span class="tab-name">{{ t('nav.categories') }}</span>
          </div>
          <span class="tab-desc">{{ t('settings.tabCategoriesDesc') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.showCategoriesTab }"
          role="switch"
          :aria-checked="settings.showCategoriesTab"
          :aria-label="t('nav.categories')"
          @click="toggleTab('showCategoriesTab')"
        />
      </div>

      <!-- Debts Tab Toggle -->
      <div class="tab-option">
        <div class="tab-info">
          <div class="tab-title-row">
            <HandCoins :size="18" class="tab-icon" />
            <span class="tab-name">{{ t('nav.debts') }}</span>
          </div>
          <span class="tab-desc">{{ t('settings.tabDebtsDesc') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.showDebtsTab }"
          role="switch"
          :aria-checked="settings.showDebtsTab"
          :aria-label="t('nav.debts')"
          @click="toggleTab('showDebtsTab')"
        />
      </div>

      <!-- Budgets Tab Toggle -->
      <div class="tab-option">
        <div class="tab-info">
          <div class="tab-title-row">
            <PiggyBank :size="18" class="tab-icon" />
            <span class="tab-name">{{ t('nav.budgets') }}</span>
          </div>
          <span class="tab-desc">{{ t('settings.tabBudgetsDesc') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.showBudgetsTab }"
          role="switch"
          :aria-checked="settings.showBudgetsTab"
          :aria-label="t('nav.budgets')"
          @click="toggleTab('showBudgetsTab')"
        />
      </div>

      <!-- Insights Tab Toggle -->
      <div class="tab-option">
        <div class="tab-info">
          <div class="tab-title-row">
            <ChartPie :size="18" class="tab-icon" />
            <span class="tab-name">{{ t('nav.insights') }}</span>
          </div>
          <span class="tab-desc">{{ t('settings.tabInsightsDesc') }}</span>
        </div>
        <button
          type="button"
          class="switch"
          :class="{ 'switch--on': settings.showInsightsTab }"
          role="switch"
          :aria-checked="settings.showInsightsTab"
          :aria-label="t('nav.insights')"
          @click="toggleTab('showInsightsTab')"
        />
      </div>
    </div>
    </section>
  </div>
</template>

<style scoped>
.subpage {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.subpage-header {
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

.subpage-header h2 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.section-title {
  font-size: var(--text-title);
  color: var(--color-on-surface);
}

.section-desc {
  font-size: var(--text-label);
  color: var(--color-muted);
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg-btn {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-spring-snappy);
}

.seg-btn:active {
  transform: scale(0.95);
}

.seg-btn--on {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tab-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.tab-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tab-icon {
  color: var(--color-primary);
}

.tab-name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
}

.tab-desc {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.switch {
  width: 48px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-highest);
  position: relative;
  transition: background var(--duration-fast) var(--ease-standard);
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-standard);
}

.switch--on {
  background: var(--color-primary);
}

.switch--on::after {
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}
</style>
