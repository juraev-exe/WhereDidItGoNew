<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Plus, Search, Trash2, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { CATEGORY_COLORS } from '@/lib/categoryColors'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { createId } from '@/lib/id'
import { confirmFeedback, errorFeedback, successFeedback, tickFeedback, warningFeedback } from '@/services/native/haptics'
import { useCategoriesStore } from '@/stores/categories'
import { useTransactionsStore } from '@/stores/transactions'
import { useBudgetsStore } from '@/stores/budgets'
import type { Category, CategoryKind, Subcategory } from '@/types/finance'

const props = withDefaults(
  defineProps<{
    open: boolean
    category?: Category | null
    defaultKind?: CategoryKind
  }>(),
  {
    category: null,
    defaultKind: 'expense',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', category: Category): void
  (e: 'deleted', id: string): void
}>()

const { t } = useI18n()
const categories = useCategoriesStore()
const transactions = useTransactionsStore()
const budgets = useBudgetsStore()

const nameInputRef = ref<HTMLInputElement | null>(null)
const name = ref('')
const kind = ref<CategoryKind>('expense')
const color = ref<string>('#e76f51')
const icon = ref<string>('shopping-bag')
const subcategories = ref<Subcategory[]>([])
const newSubcatName = ref('')
const searchQuery = ref('')
const saving = ref(false)
const errorMessage = ref('')

function addSubcategory() {
  const trimmed = newSubcatName.value.trim()
  if (!trimmed) return
  subcategories.value.push({
    id: createId('subcat'),
    name: trimmed,
  })
  newSubcatName.value = ''
  void tickFeedback()
}

function removeSubcategory(id: string) {
  subcategories.value = subcategories.value.filter((s) => s.id !== id)
  void tickFeedback()
}

const isEditing = computed(() => Boolean(props.category))
const title = computed(() =>
  isEditing.value ? t('settings.editCategory') : t('settings.newCategory'),
)

function formatIconLabel(iconName: string): string {
  const overrides: Record<string, string> = {
    'glass-water': 'Water',
    'heart-pulse': 'Pulse',
    'shopping-bag': 'Shopping',
    'shopping-cart': 'Cart',
    'gamepad-2': 'Gaming',
    'graduation-cap': 'Education',
    'book-open': 'Reading',
    'building-2': 'Building',
    'hand-coins': 'Income',
    'trending-up': 'Growth',
    'trending-down': 'Loss',
    'shield-check': 'Security',
    'circle-ellipsis': 'More',
    'plus-circle': 'Add',
    'dollar-sign': 'Dollar',
    'chart-pie': 'Charts',
    'paw-print': 'Pets',
    'flower-2': 'Flowers',
    'tree-pine': 'Nature',
    'pen-tool': 'Design',
    'file-text': 'Docs',
  }
  if (overrides[iconName]) return overrides[iconName]
  return iconName
    .replace(/-\d+$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const filteredIcons = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return CATEGORY_ICONS
  return CATEGORY_ICONS.filter(
    (ic) => ic.toLowerCase().includes(q) || formatIconLabel(ic).toLowerCase().includes(q),
  )
})

const isAutoFilledName = ref(false)

function onSelectIcon(iconName: string) {
  icon.value = iconName
  confirmFeedback()
  const formatted = formatIconLabel(iconName)
  if (!name.value.trim() || isAutoFilledName.value) {
    name.value = formatted
    isAutoFilledName.value = true
  }
}

function onNameInput() {
  isAutoFilledName.value = false
  if (errorMessage.value) errorMessage.value = ''
}

watch(
  () => [props.open, props.category, props.defaultKind] as const,
  ([isOpen, cat, defKind]) => {
    if (!isOpen) return
    errorMessage.value = ''
    searchQuery.value = ''
    newSubcatName.value = ''
    isAutoFilledName.value = false
    if (cat) {
      name.value = cat.name
      kind.value = cat.kind
      color.value = cat.color
      icon.value = cat.icon
      subcategories.value = cat.subcategories ? [...cat.subcategories] : []
    } else {
      name.value = ''
      kind.value = defKind || 'expense'
      color.value = kind.value === 'income' ? '#2a9d8f' : '#e76f51'
      icon.value = kind.value === 'income' ? 'wallet' : 'shopping-bag'
      subcategories.value = []
    }

    void nextTick(() => {
      setTimeout(() => {
        nameInputRef.value?.focus()
      }, 60)
    })
  },
  { immediate: true },
)

watch(kind, (newKind) => {
  if (!props.category) {
    if (newKind === 'income' && (color.value === '#e76f51' || color.value === '#6c757d')) {
      color.value = '#2a9d8f'
      icon.value = 'wallet'
    } else if (newKind === 'expense' && color.value === '#2a9d8f') {
      color.value = '#e76f51'
      icon.value = 'shopping-bag'
    }
  }
})

async function save() {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMessage.value = t('settings.nameRequired', 'Please enter a category name')
    nameInputRef.value?.focus()
    void errorFeedback()
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    let savedCat: Category
    if (props.category) {
      await categories.updateCategory(props.category.id, {
        name: trimmedName,
        kind: kind.value,
        color: color.value,
        icon: icon.value,
        subcategories: subcategories.value,
      })
      savedCat = {
        ...props.category,
        name: trimmedName,
        kind: kind.value,
        color: color.value,
        icon: icon.value,
        subcategories: subcategories.value,
      }
    } else {
      savedCat = await categories.addCategory({
        name: trimmedName,
        kind: kind.value,
        color: color.value,
        icon: icon.value,
        subcategories: subcategories.value,
      })
    }
    void successFeedback()
    emit('saved', savedCat)
    emit('close')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : t('quickAdd.saveFail')
    void errorFeedback()
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.category) return
  const id = props.category.id
  const catName = props.category.name
  const used = transactions.transactions.some((tx) => tx.categoryId === id)
  if (used) {
    window.alert(t('settings.categoryInUse', { name: catName }))
    return
  }
  const ok = window.confirm(t('settings.deleteCategoryConfirm', { name: catName }))
  if (!ok) return

  void warningFeedback()
  await categories.removeCategory(id)
  const related = budgets.budgets.filter((b) => b.categoryId === id)
  await Promise.all(related.map((b) => budgets.removeBudget(b.id)))

  emit('deleted', id)
  emit('close')
}
</script>

<template>
  <BottomSheet :open="open" :title="title" contain @close="emit('close')">
    <div class="category-form">
      <!-- Category Kind Segmented Control -->
      <div v-if="!isEditing" class="type-seg" role="tablist" :aria-label="t('quickAdd.category')">
        <button
          type="button"
          role="tab"
          class="type-btn"
          :class="{ 'type-btn--active': kind === 'expense' }"
          :aria-selected="kind === 'expense'"
          @click="kind = 'expense'; confirmFeedback()"
        >
          {{ t('settings.expense') }}
        </button>
        <button
          type="button"
          role="tab"
          class="type-btn"
          :class="{ 'type-btn--active': kind === 'income' }"
          :aria-selected="kind === 'income'"
          @click="kind = 'income'; confirmFeedback()"
        >
          {{ t('settings.income') }}
        </button>
      </div>

      <div class="form-scroll-body">
        <!-- Category Name with Live Dynamic Icon Badge -->
        <div class="field">
          <label class="field-label" for="cat-name-input">{{ t('settings.name') }}</label>
          <div class="input-badge-wrapper" :style="{ '--cat-theme-color': color }">
            <div class="badge-icon" :style="{ backgroundColor: color }">
              <IconByName :name="icon" :size="20" />
            </div>
            <input
              id="cat-name-input"
              ref="nameInputRef"
              v-model="name"
              type="text"
              maxlength="40"
              :placeholder="t('settings.namePlaceholder')"
              @input="onNameInput"
              @keydown.enter.prevent="save"
            />
          </div>
        </div>

        <!-- Subcategories Section -->
        <div class="field">
          <div class="field-head">
            <span class="field-label">Subcategories</span>
            <span v-if="subcategories.length" class="subcat-count-badge">{{ subcategories.length }}</span>
          </div>

          <div class="subcat-input-row">
            <input
              v-model="newSubcatName"
              type="text"
              placeholder="Add subcategory (e.g. Electronics)"
              class="subcat-input"
              @keydown.enter.prevent="addSubcategory"
            />
            <button
              type="button"
              class="subcat-add-btn"
              :disabled="!newSubcatName.trim()"
              @click="addSubcategory"
            >
              <Plus :size="16" />
            </button>
          </div>

          <div v-if="subcategories.length" class="subcats-chips">
            <div
              v-for="sub in subcategories"
              :key="sub.id"
              class="subcat-chip"
              :style="{ '--subcat-color': color }"
            >
              <span>{{ sub.name }}</span>
              <button
                type="button"
                class="subcat-del-btn"
                @click="removeSubcategory(sub.id)"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- Color Palette -->
        <div class="field">
          <div class="field-head">
            <span class="field-label">{{ t('settings.color') }}</span>
            <span class="color-hex-tag">{{ color.toUpperCase() }}</span>
          </div>
          <div class="color-swatches-grid">
            <button
              v-for="c in CATEGORY_COLORS"
              :key="c.hex"
              type="button"
              class="swatch-item"
              :class="{ 'swatch-item--active': color.toLowerCase() === c.hex.toLowerCase() }"
              :style="{ backgroundColor: c.hex }"
              :aria-label="c.name"
              @click="color = c.hex; confirmFeedback()"
            >
              <Check v-if="color.toLowerCase() === c.hex.toLowerCase()" :size="14" class="swatch-check" />
            </button>

            <!-- Custom native color picker -->
            <label class="custom-color-swatch" :title="t('settings.color')">
              <input v-model="color" type="color" class="native-color-input" />
              <span class="custom-color-plus">+</span>
            </label>
          </div>
        </div>

        <!-- Icon Grid with Filter Search -->
        <div class="field">
          <div class="field-head">
            <span class="field-label">{{ t('settings.icon') }}</span>
            <div class="icon-search-bar">
              <Search :size="14" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search..."
                class="search-input"
              />
            </div>
          </div>
          <div class="icon-grid" role="listbox" :aria-label="t('settings.icon')">
            <button
              v-for="iconName in filteredIcons"
              :key="iconName"
              type="button"
              role="option"
              class="icon-tile"
              :class="{ 'icon-tile--active': icon === iconName }"
              :aria-selected="icon === iconName"
              :aria-label="formatIconLabel(iconName)"
              @click="onSelectIcon(iconName)"
            >
              <IconByName :name="iconName" :size="20" class="tile-icon" />
              <span class="tile-label">{{ formatIconLabel(iconName) }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="form-footer">
        <p v-if="errorMessage" class="error-msg" role="alert">{{ errorMessage }}</p>
        <AppButton block size="lg" :disabled="saving" @click="save">
          {{ saving ? t('quickAdd.saving') : isEditing ? t('settings.saveCategory') : t('settings.addCategoryBtn') }}
        </AppButton>
        <AppButton v-if="isEditing" variant="ghost" block class="btn-delete-animated" :disabled="saving" @click="remove">
          <Trash2 :size="16" class="delete-icon" />
          <span>{{ t('common.delete') }}</span>
        </AppButton>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.category-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex: 1;
  min-height: 0;
  width: 100%;
}

.type-seg {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-container);
  border-radius: var(--radius-full);
  animation: fadeSlideUp var(--duration-entrance) var(--ease-emphasized) both;
}

.type-btn {
  min-height: 38px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-label);
  color: var(--color-muted);
  transition: background var(--duration-normal) var(--ease-emphasized),
              color var(--duration-normal) var(--ease-emphasized),
              box-shadow var(--duration-normal) var(--ease-emphasized),
              transform var(--duration-fast) var(--ease-standard);
}

.type-btn:active {
  transform: scale(0.96);
}

.type-btn--active {
  background: var(--color-surface);
  color: var(--color-on-surface);
  box-shadow: var(--shadow-sm);
}

.form-scroll-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-right: 4px;
  scrollbar-width: none;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.color-hex-tag {
  font-size: var(--text-caption);
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  color: var(--color-muted);
  opacity: 0.8;
}

/* Integrated Input with Dynamic Icon Badge */
.input-badge-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-outline-variant);
  background: var(--color-surface);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.input-badge-wrapper:focus-within {
  border-color: var(--cat-theme-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cat-theme-color) 25%, transparent);
}

.badge-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  color: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-sm);
}

.input-badge-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-body);
  font-weight: 550;
  color: var(--color-on-surface);
  outline: none;
  min-height: 36px;
}

.input-badge-wrapper input::placeholder {
  color: var(--color-muted);
  font-weight: 400;
}

/* Subcategories Styles */
.subcat-count-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  color: var(--color-muted);
}

.subcat-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.subcat-input {
  flex: 1;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-outline-variant);
  background: var(--color-surface);
  font-size: var(--text-label);
  font-weight: 550;
  color: var(--color-on-surface);
  outline: none;
  transition: border-color var(--duration-fast);
}

.subcat-input:focus {
  border-color: var(--color-primary);
}

.subcat-add-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-primary);
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: opacity var(--duration-fast), transform var(--duration-fast);
}

.subcat-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.subcat-add-btn:not(:disabled):hover {
  transform: scale(1.05);
}

.subcats-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: 4px;
}

.subcat-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--subcat-color, var(--color-primary)) 12%, var(--color-surface-container));
  border: 1px solid color-mix(in srgb, var(--subcat-color, var(--color-primary)) 28%, transparent);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-on-surface);
}

.subcat-del-btn {
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 2px;
  border-radius: 50%;
  transition: color var(--duration-fast);
}

.subcat-del-btn:hover {
  color: #ef4444;
}

/* Color Swatches Grid */
.color-swatches-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.swatch-item {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy), box-shadow var(--duration-fast);
}

.swatch-item:hover {
  transform: scale(1.18);
}

.swatch-item:active {
  transform: scale(0.95);
}

.swatch-item--active {
  transform: scale(1.18);
  box-shadow: 0 0 0 2.5px var(--color-surface), 0 0 0 5px var(--color-primary), 0 4px 12px rgba(0,0,0,0.25);
}

.swatch-check {
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
  animation: popSpring 0.28s var(--ease-spring) both;
}

.custom-color-swatch {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px dashed var(--color-outline);
  display: grid;
  place-items: center;
  cursor: pointer;
  background: var(--color-surface-container);
  transition: border-color var(--duration-fast), transform var(--duration-fast) var(--ease-spring);
}

.custom-color-swatch:hover {
  border-color: var(--color-primary);
  transform: scale(1.1);
}

.native-color-input {
  position: absolute;
  inset: -10px;
  width: 50px;
  height: 50px;
  opacity: 0;
  cursor: pointer;
}

.custom-color-plus {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-muted);
  pointer-events: none;
}

/* Icon Grid Search & Icons */
.icon-search-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px var(--space-3);
  border-radius: var(--radius-full);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
  color: var(--color-muted);
}

.search-input {
  border: none !important;
  background: transparent !important;
  font-size: var(--text-caption) !important;
  color: var(--color-on-surface) !important;
  outline: none !important;
  padding: 0 !important;
  width: 90px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: var(--space-2);
  padding: var(--space-3);
  max-height: 270px;
  overflow-y: auto;
  border-radius: var(--radius-xl);
  background: var(--color-surface-container);
  border: 1px solid var(--color-outline-variant);
}

.icon-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 4px 8px;
  min-height: 64px;
  border-radius: var(--radius-lg);
  border: 1.5px solid transparent;
  color: var(--color-on-surface-variant);
  background: var(--color-surface);
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-spring-snappy),
              background var(--duration-fast) var(--ease-standard),
              border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  user-select: none;
}

.tile-icon {
  flex-shrink: 0;
  color: var(--color-on-surface-variant);
  transition: transform var(--duration-fast), color var(--duration-fast);
}

.tile-label {
  font-size: 10.5px;
  font-weight: 550;
  line-height: 1.1;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-muted);
  transition: color var(--duration-fast);
}

@media (hover: hover) and (pointer: fine) {
  .icon-tile:hover {
    background: var(--color-surface-container-high);
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  .icon-tile:hover .tile-icon {
    color: var(--color-primary);
    transform: scale(1.12);
  }

  .icon-tile:hover .tile-label {
    color: var(--color-on-surface);
  }
}

.icon-tile:active {
  transform: scale(0.95);
}

.icon-tile--active {
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent), 0 4px 14px color-mix(in srgb, var(--color-primary) 20%, transparent);
  transform: scale(1.04);
}

.icon-tile--active .tile-icon {
  color: var(--color-primary);
  animation: tabPop 0.3s var(--ease-spring) both;
}

.icon-tile--active .tile-label {
  color: var(--color-primary);
  font-weight: 700;
}

.form-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-outline-variant);
}

.btn-delete-animated {
  color: var(--color-on-surface-variant);
  transition:
    color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-delete-animated .delete-icon {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-delete-animated:hover:not(:disabled) {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.btn-delete-animated:hover:not(:disabled) .delete-icon {
  transform: scale(1.18) rotate(-8deg);
}

.btn-delete-animated:active:not(:disabled) {
  transform: scale(0.96);
  background-color: rgba(239, 68, 68, 0.18);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
}

.error-msg {
  color: var(--color-error);
  font-size: var(--text-label);
}
</style>
