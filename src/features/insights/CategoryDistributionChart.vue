<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  X,
} from '@lucide/vue'
import IconByName from '@/components/ui/IconByName.vue'
import MoneyText from '@/components/ui/MoneyText.vue'
import TransactionRow from '@/components/ui/TransactionRow.vue'
import { tickFeedback } from '@/services/native/haptics'
import {
  transactionsForCategoryInRange,
  type DetailedCategorySpend,
  type StatsRange,
  type SubcategorySpend,
} from '@/services/stats'
import { useUiStore } from '@/stores/ui'
import type { Transaction } from '@/types/finance'

const props = defineProps<{
  title: string
  rows: DetailedCategorySpend[]
  transactions: Transaction[]
  range: StatsRange
  otherId?: string
}>()

const emit = defineEmits<{
  select: [categoryId: string]
}>()

const { t } = useI18n()
const router = useRouter()
const ui = useUiStore()

const selectedCategoryId = ref<string | null>(null)
const selectedSubcategoryId = ref<string | null>(null)
const showDrillDown = ref(false)

// Reset selection on range change
watch(
  () => props.range,
  () => {
    selectedCategoryId.value = null
    selectedSubcategoryId.value = null
    showDrillDown.value = false
  },
)

const totalAmount = computed(() =>
  props.rows.reduce((sum, r) => sum + r.amount, 0),
)

const activeCategory = computed<DetailedCategorySpend | null>(() => {
  if (!selectedCategoryId.value) return null
  return props.rows.find((r) => r.categoryId === selectedCategoryId.value) ?? null
})

const activeSubcategory = computed<SubcategorySpend | null>(() => {
  if (!activeCategory.value || !selectedSubcategoryId.value) return null
  return (
    activeCategory.value.subcategories.find(
      (s) => s.subcategoryId === selectedSubcategoryId.value,
    ) ?? null
  )
})

function selectCategory(catId: string) {
  if (selectedCategoryId.value === catId) {
    // Toggle off
    selectedCategoryId.value = null
    selectedSubcategoryId.value = null
    showDrillDown.value = false
  } else {
    selectedCategoryId.value = catId
    selectedSubcategoryId.value = null
    void tickFeedback()
  }
}

function selectSubcategory(subId: string) {
  if (selectedSubcategoryId.value === subId) {
    selectedSubcategoryId.value = null
  } else {
    selectedSubcategoryId.value = subId
    void tickFeedback()
  }
}

function openDrillDown(catId: string, subId?: string) {
  selectedCategoryId.value = catId
  selectedSubcategoryId.value = subId ?? null
  showDrillDown.value = true
  void tickFeedback()
}

function closeDrillDown() {
  showDrillDown.value = false
}

const drillDownTransactions = computed<Transaction[]>(() => {
  if (!selectedCategoryId.value) return []
  return transactionsForCategoryInRange(
    props.transactions,
    selectedCategoryId.value,
    props.range,
    selectedSubcategoryId.value || undefined,
  )
})

const drillDownAmount = computed(() =>
  drillDownTransactions.value.reduce((sum, t) => sum + t.amount, 0),
)

function navigateToActivity(categoryId: string) {
  const month = props.range.end.slice(0, 7)
  void router.push({
    name: 'activity',
    query: { month, category: categoryId },
  })
}

function onTxClick(tx: Transaction) {
  ui.openAdd(tx)
}

/* Donut Geometry Calculation */
const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface DonutSlice {
  categoryId: string
  color: string
  dashArray: string
  dashOffset: number
  percent: number
  name: string
}

const donutSlices = computed<DonutSlice[]>(() => {
  if (!props.rows.length || totalAmount.value <= 0) return []

  let accumulatedPercent = 0
  return props.rows.map((row) => {
    const fraction = row.amount / totalAmount.value
    const sliceLength = fraction * CIRCUMFERENCE
    const dashArray = `${sliceLength} ${CIRCUMFERENCE}`
    const dashOffset = -accumulatedPercent * CIRCUMFERENCE

    accumulatedPercent += fraction

    return {
      categoryId: row.categoryId,
      color: row.color,
      dashArray,
      dashOffset,
      percent: row.percent,
      name: row.name,
    }
  })
})
</script>

<template>
  <section class="panel surface-glass" :aria-label="title">
    <div class="header">
      <div>
        <h2>{{ title }}</h2>
        <p class="lede">{{ t('insights.distributionLede') }}</p>
      </div>
    </div>

    <!-- Donut Ring & Center Stats -->
    <div v-if="rows.length" class="donut-section">
      <div class="donut-wrapper">
        <svg
          viewBox="0 0 140 140"
          class="donut-svg"
          role="img"
          :aria-label="t('insights.categoryDistribution')"
        >
          <!-- Background track -->
          <circle
            cx="70"
            cy="70"
            :r="RADIUS"
            class="donut-track"
          />
          <!-- Slices -->
          <circle
            v-for="slice in donutSlices"
            :key="slice.categoryId"
            cx="70"
            cy="70"
            :r="RADIUS"
            class="donut-slice"
            :class="{ active: selectedCategoryId === slice.categoryId }"
            :stroke="slice.color"
            :stroke-dasharray="slice.dashArray"
            :stroke-dashoffset="slice.dashOffset"
            @click="selectCategory(slice.categoryId)"
          >
            <title>{{ slice.name }}: {{ slice.percent.toFixed(1) }}%</title>
          </circle>
        </svg>

        <!-- Donut Center Text -->
        <div class="donut-center" @click="selectedCategoryId = null">
          <template v-if="activeCategory">
            <span class="center-pill" :style="{ background: activeCategory.color }">
              <IconByName :name="activeCategory.icon || 'pie-chart'" :size="12" />
            </span>
            <span class="center-label">{{ activeCategory.name }}</span>
            <strong class="center-val">
              <MoneyText :amount="activeCategory.amount" />
            </strong>
            <span class="center-sub">{{ activeCategory.percent.toFixed(0) }}%</span>
          </template>
          <template v-else>
            <span class="center-label">{{ t('insights.allCategories') }}</span>
            <strong class="center-val">
              <MoneyText :amount="totalAmount" />
            </strong>
            <span class="center-hint">{{ t('insights.tapToInspect') }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Category Rows List -->
    <ul v-if="rows.length" class="categories-list">
      <li
        v-for="row in rows"
        :key="row.categoryId"
        class="cat-item"
        :class="{ active: selectedCategoryId === row.categoryId }"
      >
        <button
          type="button"
          class="cat-row"
          :aria-expanded="selectedCategoryId === row.categoryId"
          @click="selectCategory(row.categoryId)"
        >
          <span class="cat-dot" :style="{ background: row.color }">
            <IconByName :name="row.icon || 'circle'" :size="14" />
          </span>

          <div class="cat-meta">
            <div class="name-line">
              <span class="cat-name">{{ row.name }}</span>
              <span v-if="row.subcategories.length" class="sub-pill">
                <Layers :size="10" />
                {{ row.subcategories.length }}
              </span>
            </div>
            <div class="cat-bar" aria-hidden="true">
              <span
                class="cat-bar-fill"
                :style="{ width: `${Math.min(row.percent, 100)}%`, background: row.color }"
              />
            </div>
          </div>

          <div class="cat-figures">
            <strong class="cat-amt"><MoneyText :amount="row.amount" /></strong>
            <span class="cat-pct">{{ row.percent.toFixed(0) }}%</span>
          </div>

          <span class="cat-arrow" aria-hidden="true">
            <ChevronDown v-if="selectedCategoryId === row.categoryId" :size="16" />
            <ChevronRight v-else :size="16" />
          </span>
        </button>

        <!-- Expanded Category Details & Subcategories -->
        <div v-if="selectedCategoryId === row.categoryId" class="cat-expanded">
          <!-- Subcategory Breakdown if any -->
          <div v-if="row.subcategories.length" class="subs-container">
            <span class="subs-header">{{ t('insights.subcategoriesTitle') }}:</span>
            <div class="subs-list">
              <button
                v-for="sub in row.subcategories"
                :key="sub.subcategoryId"
                type="button"
                class="sub-item"
                :class="{ active: selectedSubcategoryId === sub.subcategoryId }"
                @click.stop="selectSubcategory(sub.subcategoryId)"
              >
                <div class="sub-info">
                  <span class="sub-name">{{ sub.name }}</span>
                  <span class="sub-pct">{{ sub.percent.toFixed(0) }}%</span>
                </div>
                <strong class="sub-amt"><MoneyText :amount="sub.amount" /></strong>
              </button>
            </div>
          </div>

          <!-- Quick Action Buttons: Drill Down or View in Activity -->
          <div class="actions-row">
            <button
              type="button"
              class="btn-drilldown"
              @click.stop="openDrillDown(row.categoryId, selectedSubcategoryId || undefined)"
            >
              <Sparkles :size="14" />
              {{ t('insights.drillDownTitle', { category: activeSubcategory?.name || row.name, count: activeSubcategory?.txCount || row.txCount }) }}
            </button>

            <button
              v-if="row.categoryId !== otherId"
              type="button"
              class="btn-activity"
              :title="t('insights.viewAllInActivity')"
              @click.stop="navigateToActivity(row.categoryId)"
            >
              <ExternalLink :size="14" />
              {{ t('insights.viewAllInActivity') }}
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- In-Place Drill-Down Transactions Drawer / Sheet -->
    <transition name="drill">
      <div v-if="showDrillDown && activeCategory" class="drilldown-sheet surface-glass">
        <div class="drilldown-header">
          <div class="drilldown-title-group">
            <span class="drilldown-badge" :style="{ background: activeCategory.color }">
              <IconByName :name="activeCategory.icon || 'pie-chart'" :size="14" />
            </span>
            <div>
              <h3>
                {{ activeSubcategory ? `${activeCategory.name} · ${activeSubcategory.name}` : activeCategory.name }}
              </h3>
              <p class="drilldown-sub">
                {{ drillDownTransactions.length }} {{ t('insights.txCount') }} ·
                <MoneyText :amount="drillDownAmount" />
              </p>
            </div>
          </div>

          <button
            type="button"
            class="btn-close"
            :aria-label="t('insights.drillDownClose')"
            @click="closeDrillDown"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Subcategory Filter Pills if multiple subs -->
        <div v-if="activeCategory.subcategories.length" class="sub-filters">
          <button
            type="button"
            class="filter-pill"
            :class="{ active: selectedSubcategoryId === null }"
            @click="selectedSubcategoryId = null"
          >
            {{ t('insights.allCategories') }} ({{ activeCategory.txCount }})
          </button>
          <button
            v-for="sub in activeCategory.subcategories"
            :key="sub.subcategoryId"
            type="button"
            class="filter-pill"
            :class="{ active: selectedSubcategoryId === sub.subcategoryId }"
            @click="selectedSubcategoryId = sub.subcategoryId"
          >
            {{ sub.name }} ({{ sub.txCount }})
          </button>
        </div>

        <!-- Transactions List -->
        <div class="drilldown-list">
          <TransactionRow
            v-for="tx in drillDownTransactions"
            :key="tx.id"
            :transaction="tx"
            @select="onTxClick(tx)"
          />
          <div v-if="!drillDownTransactions.length" class="drilldown-empty">
            <p>{{ t('insights.noTransactions') }}</p>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<style scoped>
.panel {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.header h2 {
  font-size: var(--text-title);
  font-weight: 700;
  letter-spacing: -0.01em;
}

.lede {
  font-size: var(--text-body);
  color: var(--color-muted);
  margin-top: 2px;
}

/* Donut */
.donut-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-2) 0;
}

.donut-wrapper {
  position: relative;
  width: 170px;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-track {
  fill: none;
  stroke: var(--color-surface-container-high);
  stroke-width: 13;
}

.donut-slice {
  fill: none;
  stroke-width: 13;
  cursor: pointer;
  stroke-linecap: round;
  transition: all var(--duration-fast) var(--ease-standard);
}

.donut-slice:hover {
  stroke-width: 16;
}

.donut-slice.active {
  stroke-width: 17;
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.25));
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: auto;
  cursor: pointer;
  width: 100px;
}

.center-pill {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 2px;
}

.center-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.center-val {
  font-size: 0.9375rem;
  font-weight: 750;
  letter-spacing: -0.01em;
}

.center-sub {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-primary);
}

.center-hint {
  font-size: 0.5625rem;
  color: var(--color-muted);
  opacity: 0.8;
}

/* Category List */
.categories-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cat-item {
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: all var(--duration-fast);
}

.cat-item.active {
  background: var(--color-surface-container);
  border-color: var(--color-outline-variant);
}

.cat-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--touch-min);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  text-align: left;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.cat-row:hover {
  background: var(--color-surface-container-low);
}

.cat-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.cat-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--color-surface-container-high);
  color: var(--color-muted);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.cat-bar {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  overflow: hidden;
  width: 100%;
}

.cat-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width var(--duration-slow) var(--ease-emphasized);
}

.cat-figures {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}

.cat-amt {
  font-size: 0.875rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.cat-pct {
  font-size: 0.6875rem;
  color: var(--color-muted);
}

.cat-arrow {
  color: var(--color-muted);
  display: flex;
  align-items: center;
}

/* Expanded Subcategories */
.cat-expanded {
  padding: 0 var(--space-3) var(--space-3) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px dashed var(--color-outline-variant);
  margin-top: var(--space-1);
  padding-top: var(--space-3);
}

.subs-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.subs-header {
  font-size: 0.75rem;
  font-weight: 650;
  color: var(--color-muted);
}

.subs-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-2);
}

.sub-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-container-high);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: all var(--duration-fast);
}

.sub-item:hover {
  background: var(--color-surface-container-highest);
}

.sub-item.active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

.sub-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.sub-name {
  font-weight: 550;
  color: var(--color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-pct {
  color: var(--color-muted);
  font-size: 0.6875rem;
}

.sub-amt {
  font-size: 0.8125rem;
  font-weight: 650;
}

/* Action buttons */
.actions-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.btn-drilldown,
.btn-activity {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 650;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.btn-drilldown {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn-drilldown:hover {
  filter: brightness(1.1);
}

.btn-activity {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.btn-activity:hover {
  background: var(--color-surface-container-highest);
}

/* Drilldown sheet */
.drilldown-sheet {
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
}

.drilldown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drilldown-title-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.drilldown-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.drilldown-header h3 {
  font-size: 0.9375rem;
  font-weight: 700;
  margin: 0;
}

.drilldown-sub {
  font-size: 0.75rem;
  color: var(--color-muted);
  margin-top: 1px;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}

.sub-filters {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-pill {
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  white-space: nowrap;
  cursor: pointer;
}

.filter-pill.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.drilldown-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}

.drilldown-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-muted);
  font-size: 0.8125rem;
}

/* Transitions */
.drill-enter-active,
.drill-leave-active {
  transition: all var(--duration-medium) var(--ease-emphasized);
}

.drill-enter-from,
.drill-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
