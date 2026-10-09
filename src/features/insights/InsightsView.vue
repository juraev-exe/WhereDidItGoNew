<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  Loader2,
  PieChart,
  PiggyBank,
  Sparkles,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from '@lucide/vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import ActivityCalendar from '@/features/insights/ActivityCalendar.vue'
import BudgetRunwayGauge from '@/features/insights/BudgetRunwayGauge.vue'
import CashFlowChart from '@/features/insights/CashFlowChart.vue'
import CategoryDistributionChart from '@/features/insights/CategoryDistributionChart.vue'
import ExecutiveKpiGrid from '@/features/insights/ExecutiveKpiGrid.vue'
import InsightHero from '@/features/insights/InsightHero.vue'
import WrappedModal from '@/features/insights/WrappedModal.vue'
import { monthKey, previousMonthKey, shortDayLabel } from '@/lib/dates'
import { exportAnalyticsReport } from '@/services/export'
import { computeWrappedData } from '@/services/wrapped'
import {
  activityHeatmap,
  buildInsightCards,
  computeBudgetRunway,
  computeExecutiveKpis,
  detailedSpendByCategoryInRange,
  formatTxDate,
  previousEquivalentRange,
  rangeForPeriod,
  selectHeroCard,
  spendSeries,
  summarizeRange,
  type InsightCard,
  type InsightsPeriod,
} from '@/services/stats'
import { tickFeedback } from '@/services/native/haptics'
import { useAccountsStore } from '@/stores/accounts'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useDebtsStore } from '@/stores/debts'
import { usePremiumStore } from '@/stores/premium'
import { useSettingsStore } from '@/stores/settings'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'

const PERIODS: InsightsPeriod[] = [
  'this_month',
  'last_month',
  'qtd',
  'ytd',
  '7d',
  '30d',
  '90d',
  'all',
]
const periodLabelKey: Record<
  InsightsPeriod,
  | 'periodThisMonth'
  | 'periodLastMonth'
  | 'periodQtd'
  | 'periodYtd'
  | 'period7d'
  | 'period30d'
  | 'period90d'
  | 'periodAll'
> = {
  this_month: 'periodThisMonth',
  last_month: 'periodLastMonth',
  qtd: 'periodQtd',
  ytd: 'periodYtd',
  '7d': 'period7d',
  '30d': 'period30d',
  '90d': 'period90d',
  all: 'periodAll',
}

const OTHER_ID = '__other__'

const { t } = useI18n()
const router = useRouter()
const transactions = useTransactionsStore()
const categories = useCategoriesStore()
const accounts = useAccountsStore()
const budgets = useBudgetsStore()
const debts = useDebtsStore()
const settings = useSettingsStore()
const premium = usePremiumStore()
const ui = useUiStore()

const wrappedModalOpen = ref(false)

const targetWrappedMonth = computed(() => {
  if (period.value === 'last_month') return previousMonthKey(monthKey())
  return monthKey()
})

const wrappedData = computed(() => {
  return computeWrappedData(
    targetWrappedMonth.value,
    transactions.transactions,
    categories.categories,
    debts.debts,
    budgets.budgets,
  )
})

const currentMonthLabel = computed(() => wrappedData.value.monthLabel)

function openWrappedModal() {
  void tickFeedback()
  wrappedModalOpen.value = true
}

const period = ref<InsightsPeriod>('this_month')
const isExporting = ref(false)
const exportFeedback = ref<string | null>(null)

const range = computed(() => rangeForPeriod(period.value))
const rangeLabel = computed(() => {
  if (period.value === 'all' || !range.value.start) return t('insights.allTime')
  return `${shortDayLabel(range.value.start, settings.intlLocale)} – ${shortDayLabel(range.value.end, settings.intlLocale)}`
})

function setPeriod(next: InsightsPeriod) {
  if (period.value === next) return
  period.value = next
  void tickFeedback()
}

async function handleExportReport() {
  if (!premium.isPremiumUser) {
    premium.openPaywall(t('premium.limitExport', 'Analytics export is a Pro feature.'))
    return
  }
  if (isExporting.value) return
  isExporting.value = true
  void tickFeedback()
  try {
    await exportAnalyticsReport({
      transactions: transactions.transactions,
      categories: categories.categories,
      accounts: accounts.accounts,
      range: range.value,
      rangeLabel: rangeLabel.value,
      period: period.value,
      kpis: executiveKpis.value,
      detailedCategories: detailedCategories.value,
      currency: settings.currency,
      locale: settings.intlLocale,
    })
    exportFeedback.value = t('insights.exportSuccess')
    setTimeout(() => {
      exportFeedback.value = null
    }, 3000)
  } catch (err: unknown) {
    exportFeedback.value = t('insights.exportError')
    setTimeout(() => {
      exportFeedback.value = null
    }, 3000)
  } finally {
    isExporting.value = false
  }
}

function openCategory(categoryId: string) {
  void router.push({
    name: 'activity',
    query: { month: range.value.end.slice(0, 7), category: categoryId },
  })
}

const summary = computed(() => summarizeRange(transactions.transactions, range.value))
const priorRange = computed(() => previousEquivalentRange(range.value))
const executiveKpis = computed(() =>
  computeExecutiveKpis(
    transactions.transactions,
    categories.categories,
    range.value,
    priorRange.value,
  ),
)
const detailedCategories = computed(() =>
  detailedSpendByCategoryInRange(
    transactions.transactions,
    categories.categories,
    range.value,
  ),
)
const seriesBucket = computed(() => {
  if (period.value === 'all') return 'month' as const
  if (period.value === '90d') return 'week' as const
  return 'day' as const
})
const series = computed(() =>
  spendSeries(transactions.transactions, range.value, seriesBucket.value, settings.intlLocale),
)
const heatmap = computed(() => activityHeatmap(transactions.transactions, settings.intlLocale))
const cards = computed(() =>
  buildInsightCards(
    transactions.transactions,
    categories.categories,
    budgets.budgets,
    range.value,
    series.value,
    monthKey(),
  ),
)
const heroCard = computed(() => selectHeroCard(cards.value))
const budgetRunway = computed(() =>
  computeBudgetRunway(
    transactions.transactions,
    budgets.budgets,
    categories.categories,
  ),
)
const supportCard = computed(
  () => cards.value.find((card) => card.kind === 'categoryDrop' || card.kind === 'categoryRise') ?? null,
)

const hasAnyTx = computed(() => transactions.transactions.length > 0)
const hasActivity = computed(() => summary.value.expense > 0 || summary.value.income > 0)
const isEmpty = computed(() => !hasAnyTx.value)

const heroTone = computed(() => heroCard.value?.tone ?? 'neutral')
const heroTitle = computed(() => titleForHero(heroCard.value))
const heroSub = computed(() => subForHero(heroCard.value))
const heroSupport = computed(() => {
  const support = supportCard.value
  if (!support?.categoryName) return ''
  if (heroCard.value?.kind === 'firstStretch') return ''
  if (support.kind === 'categoryDrop') {
    return t('insights.heroSupportDrop', { category: support.categoryName })
  }
  return t('insights.heroSupportRise', { category: support.categoryName })
})
const heroFigure = computed(() => {
  const card = heroCard.value
  if (!card || !hasActivity.value) return null
  if (card.kind === 'spentLess' || card.kind === 'spentMore' || card.kind === 'keptIncome' || card.kind === 'topShare') {
    return { type: 'pct' as const, value: Math.round(card.pct ?? 0) }
  }
  if (card.kind === 'spentSame' || card.kind === 'firstStretch' || card.kind === 'outspentIncome') {
    return { type: 'amount' as const, value: card.amount ?? 0, signed: card.kind === 'outspentIncome' ? 'expense' as const : null }
  }
  return null
})


const stories = computed(() => {
  const heroKind = heroCard.value?.kind
  const supportKind = supportCard.value?.kind
  return cards.value
    .filter((card) => {
      if (card.kind === heroKind) return false
      if (card.kind === supportKind) return false
      if (card.kind === 'firstStretch' || card.kind === 'spentSame') return false
      if (card.kind === 'spentLess' || card.kind === 'spentMore') return false
      return true
    })
    .slice(0, 4)
    .map(toStory)
})

interface StoryView {
  id: string
  tone: InsightCard['tone']
  title: string
  sub: string
  amount?: number
  categoryId?: string
  categoryName?: string
  icon: Component
}

function categoryLabel(card: InsightCard) {
  return card.categoryName || t('insights.uncategorizedHit')
}

function titleForHero(card: InsightCard | null) {
  if (!hasActivity.value) return t('insights.heroQuiet')
  if (!card) return t('insights.heroQuiet')
  switch (card.kind) {
    case 'spentLess':
      return t('insights.heroSpentLess')
    case 'spentMore':
      return t('insights.heroSpentMore')
    case 'spentSame':
      return t('insights.heroSpentSame')
    case 'firstStretch':
      return t('insights.heroFirst')
    case 'keptIncome':
      return t('insights.heroKept')
    case 'outspentIncome':
      return t('insights.heroOverspent')
    case 'topShare':
      return t('insights.heroTop', { category: categoryLabel(card) })
    case 'unusualSpend':
      return t('insights.heroUnusual', { category: categoryLabel(card) })
    default:
      return t('insights.heroQuiet')
  }
}

function subForHero(card: InsightCard | null) {
  if (!hasActivity.value || !card) return ''
  switch (card.kind) {
    case 'spentLess':
    case 'spentMore':
      return t('insights.heroVsPrev')
    case 'spentSame':
      return t('insights.heroVsPrevSame')
    case 'firstStretch':
      return t('insights.heroFirstSub')
    case 'keptIncome':
      return t('insights.heroOfIncome')
    case 'outspentIncome':
      return t('insights.heroOverIncome')
    case 'topShare':
      return t('insights.heroTopSub')
    case 'unusualSpend':
      return t('insights.heroUnusualSub')
    default:
      return ''
  }
}

function toStory(card: InsightCard): StoryView {
  const pct = Math.round(card.pct ?? 0)
  const category = categoryLabel(card)
  const title = (() => {
    switch (card.kind) {
      case 'keptIncome':
        return t('insights.storyKept', { pct })
      case 'outspentIncome':
        return t('insights.storyOverspent')
      case 'topShare':
        return t('insights.storyTopShare', { category, pct })
      case 'weekendSkew':
        return t('insights.storyWeekend', { pct })
      case 'weekdaySkew':
        return t('insights.storyWeekday', { pct })
      case 'largest':
        return t('insights.storyLargest', { category })
      case 'budgetOver':
        return t('insights.storyBudgetOver', { category })
      case 'peakBucket':
        return t('insights.storyPeak', { when: card.label ?? '' })
      case 'categoryRise':
        return t('insights.storyCategoryRise', { category })
      case 'categoryDrop':
        return t('insights.storyCategoryDrop', { category })
      case 'unusualSpend':
        return t('insights.storyUnusualSpend', { category })
      default:
        return category
    }
  })()

  const sub = (() => {
    if (card.kind === 'largest' || card.kind === 'unusualSpend') {
      const date = card.date ? formatTxDate(card.date, settings.intlLocale) : ''
      return [date, card.note].filter(Boolean).join(' · ')
    }
    return ''
  })()

  return {
    id: card.kind,
    tone: card.tone,
    title,
    sub,
    amount: card.amount,
    categoryId: card.categoryId,
    categoryName: card.categoryName,
    icon: iconFor(card.kind),
  }
}

function iconFor(kind: InsightCard['kind']): Component {
  switch (kind) {
    case 'spentLess':
    case 'categoryDrop':
      return TrendingDown
    case 'spentMore':
    case 'categoryRise':
    case 'peakBucket':
      return TrendingUp
    case 'keptIncome':
      return PiggyBank
    case 'outspentIncome':
    case 'budgetOver':
    case 'unusualSpend':
      return TriangleAlert
    case 'topShare':
      return PieChart
    case 'weekendSkew':
    case 'weekdaySkew':
      return CalendarDays
    case 'largest':
      return ArrowUpRight
    default:
      return Sparkles
  }
}

import HeaderActions from '@/components/ui/HeaderActions.vue'

function onStory(story: StoryView) {
  if (story.categoryId) openCategory(story.categoryId)
}
</script>

<template>
  <div class="insights">
    <header>
      <div class="title-row">
        <h1>{{ t('insights.title') }}</h1>
        <HeaderActions />
      </div>
      <div class="seg-scroll" role="radiogroup" :aria-label="t('insights.periodAria')">
        <button
          v-for="p in PERIODS"
          :key="p"
          type="button"
          role="radio"
          :aria-checked="period === p"
          :class="{ active: period === p }"
          @click="setPeriod(p)"
        >
          {{ t(`insights.${periodLabelKey[p]}`) }}
        </button>
      </div>

      <div class="period-action-bar">
        <span class="range-pill">{{ rangeLabel }}</span>
        <button
          type="button"
          class="export-btn"
          :disabled="isExporting"
          :aria-label="t('insights.exportReport')"
          @click="handleExportReport"
        >
          <Loader2 v-if="isExporting" :size="14" class="spin" />
          <Download v-else :size="14" />
          <span>{{ isExporting ? t('insights.exportingReport') : t('insights.exportReport') }}</span>
        </button>
      </div>

      <transition name="toast-fade">
        <div v-if="exportFeedback" class="export-toast surface-glass">
          <Check :size="15" class="toast-icon-ok" />
          <span>{{ exportFeedback }}</span>
        </div>
      </transition>
    </header>

    <EmptyState
      v-if="isEmpty"
      :title="t('insights.emptyTitle')"
      :description="t('insights.emptyDesc')"
      :action-label="t('nav.addTransaction')"
      @action="ui.openAdd()"
    >
      <template #icon>
        <Sparkles :size="28" />
      </template>
    </EmptyState>

    <template v-else>
      <template v-if="hasActivity">
        <!-- WhereDidItGo Wrapped Banner -->
        <section class="wrapped-launch-banner surface-glass" @click="openWrappedModal">
          <div class="wrapped-launch-left">
            <div class="wrapped-icon-sparkle">
              <Sparkles :size="20" class="text-amber-300" />
            </div>
            <div>
              <h3>{{ t('insights.wrappedBannerTitle', { month: currentMonthLabel }) }}</h3>
              <p>{{ t('insights.wrappedBannerSub') }}</p>
            </div>
          </div>
          <div class="wrapped-launch-btn">
            <span>{{ t('insights.wrappedWatchBtn') }}</span>
            <ArrowUpRight :size="16" />
          </div>
        </section>

        <InsightHero
          :tone="heroTone"
          :range-label="rangeLabel"
          :title="heroTitle"
          :sub="heroSub"
          :support="heroSupport"
          :income="summary.income"
          :expense="summary.expense"
          :net="summary.net"
          :income-label="t('insights.income')"
          :expense-label="t('insights.expenses')"
          :net-label="t('insights.net')"
        >
          <template v-if="heroFigure" #figure>
            <template v-if="heroFigure.type === 'pct'">{{ heroFigure.value }}%</template>
            <MoneyText
              v-else
              :amount="heroFigure.value"
              :signed="heroFigure.signed"
            />
          </template>
        </InsightHero>

        <ExecutiveKpiGrid :kpis="executiveKpis" />

        <ul v-if="stories.length" class="stories">
          <li v-for="story in stories" :key="story.id">
            <button
              v-if="story.categoryId"
              type="button"
              class="story surface-glass"
              :class="`story--${story.tone}`"
              :aria-label="t('insights.seeCategory', { category: story.categoryName || story.title })"
              @click="onStory(story)"
            >
              <span class="story-icon" aria-hidden="true">
                <component :is="story.icon" :size="18" />
              </span>
              <div class="story-copy">
                <p>{{ story.title }}</p>
                <p v-if="story.sub" class="story-sub">{{ story.sub }}</p>
              </div>
              <strong v-if="story.amount != null" class="story-amt">
                <MoneyText :amount="story.amount" />
              </strong>
            </button>
            <div v-else class="story surface-glass" :class="`story--${story.tone}`">
              <span class="story-icon" aria-hidden="true">
                <component :is="story.icon" :size="18" />
              </span>
              <div class="story-copy">
                <p>{{ story.title }}</p>
                <p v-if="story.sub" class="story-sub">{{ story.sub }}</p>
              </div>
              <strong v-if="story.amount != null" class="story-amt">
                <MoneyText :amount="story.amount" />
              </strong>
            </div>
          </li>
        </ul>

        <CashFlowChart
          :transactions="transactions.transactions"
          :range="range"
          :suggested-bucket="seriesBucket"
        />

        <CategoryDistributionChart
          v-if="detailedCategories.length"
          :title="t('insights.categoryDistribution')"
          :rows="detailedCategories"
          :transactions="transactions.transactions"
          :range="range"
          :other-id="OTHER_ID"
        />

        <BudgetRunwayGauge
          v-if="budgetRunway.categories.length"
          :runway="budgetRunway"
        />
      </template>

      <EmptyState
        v-else
        :title="t('insights.emptyPeriodTitle')"
        :description="t('insights.emptyPeriodDesc')"
        :action-label="t('nav.addTransaction')"
        @action="ui.openAdd()"
      >
        <template #icon>
          <Sparkles :size="28" />
        </template>
      </EmptyState>

      <ActivityCalendar :heatmap="heatmap" />
    </template>

    <WrappedModal
      :open="wrappedModalOpen"
      :data="wrappedData"
      @close="wrappedModalOpen = false"
    />
  </div>
</template>

<style scoped>
.insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

h1 {
  font-size: var(--text-headline);
  margin-bottom: var(--space-3);
}

.seg-scroll {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.seg-scroll::-webkit-scrollbar {
  display: none;
}

.seg-scroll button {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--color-muted);
  white-space: nowrap;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-spring-snappy);
}

.seg-scroll button:active {
  transform: scale(0.95);
}

.seg-scroll button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.seg-scroll button:focus-visible,
button.story:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.period-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: 0 var(--space-1);
}

.range-pill {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-muted);
}

.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-outline-variant);
  background: color-mix(in srgb, var(--color-surface-container) 80%, transparent);
  color: var(--color-on-surface);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
}

.export-btn:hover:not(:disabled) {
  background: var(--color-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.export-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.export-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--space-2);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid var(--color-outline-variant);
  box-shadow: var(--shadow-sm);
  animation: fadeSlideUp var(--duration-fast) var(--ease-emphasized) both;
}

.toast-icon-ok {
  color: var(--color-success);
  flex-shrink: 0;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.stories {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.story {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  min-height: var(--touch-min);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  text-align: left;
  transition: transform var(--duration-fast) var(--ease-spring), box-shadow var(--duration-fast) var(--ease-standard), background var(--duration-fast);
}

button.story {
  cursor: pointer;
}

button.story:hover {
  transform: translateY(-1px);
  background: var(--color-surface-container);
  box-shadow: var(--shadow-sm);
}

button.story:active {
  transform: scale(0.98) translateY(0);
}

.story-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  background: var(--color-surface-container);
  color: var(--color-on-surface-variant);
  transition: transform var(--duration-fast) var(--ease-spring);
}

button.story:hover .story-icon {
  transform: scale(1.08);
}

.story--good .story-icon {
  background: color-mix(in srgb, var(--color-income) 18%, transparent);
  color: var(--color-income);
}

.story--warn .story-icon {
  background: color-mix(in srgb, var(--color-tertiary) 22%, transparent);
  color: var(--color-tertiary);
}

.story-copy {
  min-width: 0;
}

.story-copy p {
  font-weight: 600;
}

.story-sub {
  margin-top: 2px;
  font-size: var(--text-label);
  font-weight: 450;
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-amt {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  color: var(--color-muted);
}

.wrapped-launch-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.95rem 1.15rem;
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-2);
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(168, 85, 247, 0.15));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.12);
  cursor: pointer;
  transition: transform var(--duration-fast), box-shadow var(--duration-fast);
}

.wrapped-launch-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.22);
}

.wrapped-launch-banner:active {
  transform: scale(0.98);
}

.wrapped-launch-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wrapped-icon-sparkle {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(236, 72, 153, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wrapped-launch-left h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0;
}

.wrapped-launch-left p {
  font-size: 0.76rem;
  color: var(--color-muted);
  margin: 0.15rem 0 0;
}

.wrapped-launch-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-on-surface);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
