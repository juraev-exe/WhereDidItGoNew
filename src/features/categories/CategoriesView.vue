<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Edit2, FolderKanban, Plus, Search, Trash2 } from '@lucide/vue'
import ConfirmSheet from '@/components/ui/ConfirmSheet.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { tickFeedback, warningFeedback } from '@/services/native/haptics'
import { useBudgetsStore } from '@/stores/budgets'
import { useCategoriesStore } from '@/stores/categories'
import { useRecurringStore } from '@/stores/recurring'
import { useTransactionsStore } from '@/stores/transactions'
import { useUiStore } from '@/stores/ui'
import HeaderActions from '@/components/ui/HeaderActions.vue'
import type { Category, CategoryKind } from '@/types/finance'

const { t } = useI18n()
const router = useRouter()
const categoriesStore = useCategoriesStore()
const transactionsStore = useTransactionsStore()
const budgetsStore = useBudgetsStore()
const recurringStore = useRecurringStore()
const ui = useUiStore()

const filter = ref<'all' | CategoryKind>('all')
const searchQuery = ref('')

function setFilter(next: 'all' | CategoryKind) {
  if (filter.value === next) return
  filter.value = next
  void tickFeedback()
}

const expenseCount = computed(
  () => categoriesStore.categories.filter((c) => c.kind === 'expense').length,
)
const incomeCount = computed(
  () => categoriesStore.categories.filter((c) => c.kind === 'income').length,
)

const filteredCategories = computed(() => {
  let list = categoriesStore.categories
  if (filter.value !== 'all') {
    list = list.filter((c) => c.kind === filter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter((c) => c.name.toLowerCase().includes(q))
  }
  return list
})

function openCategoryActivity(cat: Category) {
  void tickFeedback()
  void router.push({
    name: 'activity',
    query: { category: cat.id },
  })
}

function openAddCategory() {
  void tickFeedback()
  const defKind: CategoryKind = filter.value === 'income' ? 'income' : 'expense'
  ui.openCategories(null, defKind)
}

function openEditCategory(cat: Category) {
  void tickFeedback()
  ui.openCategories(cat)
}

const pendingDelete = ref<Category | null>(null)
const blockedCategory = ref<Category | null>(null)

function askDeleteCategory(cat: Category) {
  const used =
    transactionsStore.transactions.some((tx) => tx.categoryId === cat.id) ||
    recurringStore.items.some((r) => r.categoryId === cat.id)
  if (used) {
    blockedCategory.value = cat
    void warningFeedback()
    return
  }
  pendingDelete.value = cat
}

async function confirmDeleteCategory() {
  const cat = pendingDelete.value
  if (!cat) return
  pendingDelete.value = null
  void warningFeedback()
  await categoriesStore.removeCategory(cat.id)
  const relatedBudgets = budgetsStore.budgets.filter((b) => b.categoryId === cat.id)
  await Promise.all(relatedBudgets.map((b) => budgetsStore.removeBudget(b.id)))
}
</script>

<template>
  <div class="categories-page">
    <!-- Header with Title & Filter Pills -->
    <header class="header">
      <div class="header-title-row">
        <h1>{{ t('nav.categories') }}</h1>
        <HeaderActions />
      </div>

      <!-- Segmented Control Tabs -->
      <div class="seg" role="tablist" :aria-label="t('nav.categories')">
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'all' }"
          :aria-selected="filter === 'all'"
          @click="setFilter('all')"
        >
          {{ t('insights.periodAll') }} ({{ categoriesStore.categories.length }})
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'expense' }"
          :aria-selected="filter === 'expense'"
          @click="setFilter('expense')"
        >
          {{ t('settings.expense') }} ({{ expenseCount }})
        </button>
        <button
          type="button"
          role="tab"
          :class="{ active: filter === 'income' }"
          :aria-selected="filter === 'income'"
          @click="setFilter('income')"
        >
          {{ t('settings.income') }} ({{ incomeCount }})
        </button>
      </div>
    </header>

    <!-- Search Input Bar -->
    <div class="search-box">
      <Search :size="16" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('activity.searchPlaceholder')"
        class="search-input"
      />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="!filteredCategories.length"
      :title="t('settings.categoriesEmptyTitle')"
      :description="t('settings.categoriesEmptyDesc')"
      :action-label="t('settings.addCategory')"
      @action="openAddCategory"
    >
      <template #icon>
        <FolderKanban :size="28" />
      </template>
    </EmptyState>

    <!-- Categories List Grid -->
    <div v-else class="cat-grid">
      <div
        v-for="cat in filteredCategories"
        :key="cat.id"
        class="cat-card"
        :style="{ '--cat-color': cat.color }"
        @click="openCategoryActivity(cat)"
      >
        <div class="cat-left">
          <div class="icon-badge" :style="{ backgroundColor: cat.color }">
            <IconByName :name="cat.icon" :size="20" />
          </div>
          <div class="cat-info">
            <span class="cat-name">{{ cat.name }}</span>
            <div class="cat-meta">
              <span
                class="kind-pill"
                :class="cat.kind === 'income' ? 'pill-income' : 'pill-expense'"
              >
                {{ cat.kind === 'income' ? t('settings.income') : t('settings.expense') }}
              </span>
              <span v-if="cat.subcategories?.length" class="subcat-badge">
                {{ t('settings.subcategoriesCount', { count: cat.subcategories.length }) }}
              </span>
            </div>
            <div v-if="cat.subcategories?.length" class="card-subcats">
              <span
                v-for="sub in cat.subcategories.slice(0, 3)"
                :key="sub.id"
                class="card-subcat-chip"
              >
                {{ sub.name }}
              </span>
              <span v-if="cat.subcategories.length > 3" class="card-subcat-more">
                +{{ cat.subcategories.length - 3 }}
              </span>
            </div>
          </div>
        </div>

        <div class="cat-actions" @click.stop>
          <button
            type="button"
            class="action-icon edit-icon"
            :title="t('common.edit')"
            @click.stop.prevent="openEditCategory(cat)"
          >
            <Edit2 :size="16" />
          </button>
          <button
            type="button"
            class="action-icon delete-icon"
            :title="t('common.delete')"
            @click.stop.prevent="askDeleteCategory(cat)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <section v-if="filteredCategories.length" class="section">
      <div class="chips">
        <button type="button" class="chip" @click="openAddCategory">
          <Plus :size="16" />
          {{ t('settings.addCategory') }}
        </button>
      </div>
    </section>

    <ConfirmSheet
      :open="Boolean(pendingDelete)"
      :title="t('common.delete')"
      :message="t('settings.deleteCategoryConfirm', { name: pendingDelete?.name ?? '' })"
      :confirm-label="t('common.delete')"
      destructive
      @confirm="confirmDeleteCategory"
      @close="pendingDelete = null"
    />

    <ConfirmSheet
      :open="Boolean(blockedCategory)"
      :title="t('common.delete')"
      :message="t('settings.categoryInUse', { name: blockedCategory?.name ?? '' })"
      acknowledge-only
      @confirm="blockedCategory = null"
      @close="blockedCategory = null"
    />
  </div>
</template>

<style scoped>
.categories-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-6);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

h1 {
  font-size: var(--text-headline);
  font-family: var(--font-display);
  font-weight: 600;
  line-height: var(--leading-tight);
  margin: 0;
  color: var(--color-on-surface);
}

h1 {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: var(--text-label);
  font-weight: 600;
  transition: background var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}

.chip:hover {
  background: var(--color-surface-container-high);
}

.chip:active {
  transform: scale(0.97);
}

.seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
}

.seg button {
  min-height: 36px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-caption);
  color: var(--color-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-standard);
}

.seg button:active {
  transform: scale(0.95);
}

.seg button.active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-lg);
  color: var(--color-muted);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-body);
  color: var(--color-on-surface);
  outline: none;
}

.search-box {
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
  animation-delay: 80ms;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.cat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--cat-color) 8%, var(--color-surface));
  border: 1.5px solid color-mix(in srgb, var(--cat-color) 18%, transparent);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  animation: scaleSpring var(--duration-entrance) var(--ease-emphasized) both;
}

.cat-card:nth-child(1) { animation-delay: 60ms; }
.cat-card:nth-child(2) { animation-delay: 110ms; }
.cat-card:nth-child(3) { animation-delay: 160ms; }
.cat-card:nth-child(4) { animation-delay: 210ms; }
.cat-card:nth-child(5) { animation-delay: 260ms; }
.cat-card:nth-child(6) { animation-delay: 310ms; }
.cat-card:nth-child(n+7) { animation-delay: 360ms; }

@media (hover: hover) and (pointer: fine) {
  .cat-card:hover {
    transform: translateY(-2px);
    background: color-mix(in srgb, var(--cat-color) 16%, var(--color-surface-container-high));
    border-color: color-mix(in srgb, var(--cat-color) 45%, transparent);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--cat-color) 20%, transparent);
  }
}

.cat-card:active {
  transform: scale(0.97) translateY(0);
}

.cat-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.icon-badge {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  color: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-sm);
}

.cat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cat-name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.subcat-badge {
  font-size: 11px;
  font-weight: 550;
  color: var(--color-muted);
}

.card-subcats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.card-subcat-chip {
  font-size: 10.5px;
  font-weight: 550;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--cat-color) 12%, var(--color-surface-container));
  border: 1px solid color-mix(in srgb, var(--cat-color) 24%, transparent);
  color: var(--color-on-surface);
}

.card-subcat-more {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-muted);
}

.kind-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  letter-spacing: 0.04em;
  width: fit-content;
}

.pill-expense {
  background: color-mix(in srgb, var(--color-expense) 14%, transparent);
  color: var(--color-expense);
}

.pill-income {
  background: color-mix(in srgb, var(--color-income) 14%, transparent);
  color: var(--color-income);
}

.cat-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.action-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}

.edit-icon:hover {
  background: var(--color-surface-container);
  color: var(--color-primary);
}

.delete-icon:hover {
  background: color-mix(in srgb, var(--color-error) 15%, transparent);
  color: var(--color-error);
}
</style>
