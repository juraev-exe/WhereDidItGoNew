<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check, Plus, X } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import IconByName from '@/components/ui/IconByName.vue'
import { db } from '@/db'
import { relocalizeSeedNames } from '@/db/seed'
import { APP_LOCALES } from '@/i18n'
import { CURRENCIES, defaultCurrencyForLocale } from '@/lib/currencies'
import { parseMoneyToMinor } from '@/lib/money'
import { CATEGORY_COLORS } from '@/lib/categoryColors'
import { tickFeedback } from '@/services/native/haptics'
import { useCategoriesStore } from '@/stores/categories'
import { useSettingsStore } from '@/stores/settings'
import type { AppLocale, Category } from '@/types/finance'

const { t } = useI18n()
const settings = useSettingsStore()
const categories = useCategoriesStore()
const router = useRouter()

type Step = 'currency' | 'accounts' | 'categories' | 'budgets'
const STEPS: Step[] = ['currency', 'accounts', 'categories', 'budgets']
const step = ref<Step>('currency')
const busy = ref(false)

const stepIndex = computed(() => STEPS.indexOf(step.value))

function goNext() {
  const i = stepIndex.value
  if (i < STEPS.length - 1) step.value = STEPS[i + 1]!
  void tickFeedback()
}

function goBack() {
  const i = stepIndex.value
  if (i > 0) step.value = STEPS[i - 1]!
  void tickFeedback()
}

/* ── Step 1: language + currency ─────────────────────────────────────────── */

const localeOptions = computed(() =>
  APP_LOCALES.map((code) => ({ value: code, label: t(`languages.${code}`) })),
)

const currencyOptions = computed(() =>
  CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${t(`currencies.${c.nameKey}`)}` })),
)

const selected = ref(settings.currency || defaultCurrencyForLocale(settings.locale))
/** Stop auto-suggesting a currency once the user has chosen one deliberately. */
let currencyTouched = false

async function onLocale(code: string) {
  const locale = code as AppLocale
  await settings.setLocale(locale)
  // The starter categories and accounts were seeded in the previous language.
  await relocalizeSeedNames(locale)
  if (!currencyTouched) selected.value = defaultCurrencyForLocale(locale)
  void tickFeedback()
}

function onCurrency(code: string) {
  currencyTouched = true
  selected.value = code
}

/* ── Step 2: starting accounts ───────────────────────────────────────────── */

const starters = ref<Array<{ id: string; name: string; balanceStr: string }>>([])

onMounted(async () => {
  const rows = await db.accounts.toArray()
  starters.value = rows
    .filter((a) => !a.archived)
    .slice(0, 2)
    .map((a) => ({
      id: a.id,
      name: a.name,
      balanceStr: a.balance ? (a.balance / 100).toFixed(2) : '0',
    }))
})

// Keep the editable names in step with a language switch.
watch(
  () => settings.locale,
  async () => {
    const rows = await db.accounts.toArray()
    starters.value = starters.value.map((row) => ({
      ...row,
      name: rows.find((a) => a.id === row.id)?.name ?? row.name,
    }))
  },
)

/* ── Step 3: which categories to keep ────────────────────────────────────── */

const dropped = ref(new Set<string>())
const newCategoryName = ref('')

function toggleCategory(cat: Category) {
  const next = new Set(dropped.value)
  if (next.has(cat.id)) next.delete(cat.id)
  else next.add(cat.id)
  dropped.value = next
  void tickFeedback()
}

const keptExpense = computed(() => categories.expense.filter((c) => !dropped.value.has(c.id)))

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  await categories.addCategory({
    name,
    kind: 'expense',
    icon: 'tag',
    color: CATEGORY_COLORS[categories.expense.length % CATEGORY_COLORS.length]?.hex ?? '#6c757d',
  })
  newCategoryName.value = ''
  void tickFeedback()
}

/* ── Step 4: optional starter budgets ────────────────────────────────────── */

const budgetSlots = ref([
  { categoryId: '', amountStr: '' },
  { categoryId: '', amountStr: '' },
])

const expenseOptions = computed(() =>
  keptExpense.value.map((c) => ({ value: c.id, label: c.name })),
)

// Default the budget rows to categories that survived step 3.
watch(
  keptExpense,
  (list) => {
    for (const [i, slot] of budgetSlots.value.entries()) {
      const stillValid = list.some((c) => c.id === slot.categoryId)
      if (!stillValid) slot.categoryId = list[i]?.id ?? ''
    }
  },
  { immediate: true, deep: true },
)

async function finish(skipBudgets = false) {
  busy.value = true
  try {
    const seen = new Set<string>()
    const budgets = skipBudgets
      ? []
      : budgetSlots.value
          .map((slot) => ({
            categoryId: slot.categoryId,
            limitAmount: parseMoneyToMinor(slot.amountStr),
          }))
          .filter((b) => {
            if (!b.categoryId || b.limitAmount <= 0 || seen.has(b.categoryId)) return false
            seen.add(b.categoryId)
            return true
          })
          .slice(0, 2)

    await settings.completeOnboarding({
      currency: selected.value,
      accounts: starters.value.map((a) => ({
        id: a.id,
        name: a.name,
        balance: Math.max(0, parseMoneyToMinor(a.balanceStr)),
      })),
      budgets,
      removeCategoryIds: [...dropped.value],
    })
    await router.replace('/')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="onboarding">
    <div class="hero">
      <div class="hero-top">
        <button
          v-if="stepIndex > 0"
          type="button"
          class="back-btn"
          :aria-label="t('common.back')"
          @click="goBack"
        >
          <ArrowLeft :size="20" />
        </button>
        <p class="brand">{{ t('onboarding.brand') }}</p>
      </div>
      <div class="steps-wrapper" role="status" aria-live="polite">
        <p class="steps" aria-hidden="true">
          <span
            v-for="(s, i) in STEPS"
            :key="s"
            :class="{ active: stepIndex === i, on: stepIndex >= i }"
          />
        </p>
        <span class="step-label">
          {{ t('onboarding.stepOf', { current: stepIndex + 1, total: STEPS.length }) }}
        </span>
      </div>
      <h1 v-if="step === 'currency'">{{ t('onboarding.title') }}</h1>
      <h1 v-else-if="step === 'accounts'">{{ t('onboarding.accountsTitle') }}</h1>
      <h1 v-else-if="step === 'categories'">{{ t('onboarding.categoriesTitle') }}</h1>
      <h1 v-else>{{ t('onboarding.budgetsTitle') }}</h1>
      <p class="lede">
        <template v-if="step === 'currency'">{{ t('onboarding.lede') }}</template>
        <template v-else-if="step === 'accounts'">{{ t('onboarding.accountsLede') }}</template>
        <template v-else-if="step === 'categories'">{{ t('onboarding.categoriesLede') }}</template>
        <template v-else>{{ t('onboarding.budgetsLede') }}</template>
      </p>
    </div>

    <!-- Step 1 — language and currency -->
    <template v-if="step === 'currency'">
      <label class="field">
        <span>{{ t('settings.language') }}</span>
        <AppSelect
          :model-value="settings.locale"
          :options="localeOptions"
          :aria-label="t('settings.language')"
          @update:model-value="onLocale"
        />
      </label>
      <label class="field">
        <span>{{ t('onboarding.yourCurrency') }}</span>
        <AppSelect
          :model-value="selected"
          :options="currencyOptions"
          :aria-label="t('onboarding.yourCurrency')"
          @update:model-value="onCurrency"
        />
      </label>
      <AppButton block size="lg" @click="goNext">{{ t('common.next') }}</AppButton>
    </template>

    <!-- Step 2 — starting accounts -->
    <template v-else-if="step === 'accounts'">
      <div v-for="acc in starters" :key="acc.id" class="card">
        <label class="field">
          <span>{{ t('accounts.name') }}</span>
          <input v-model="acc.name" type="text" maxlength="40" />
        </label>
        <label class="field">
          <span>{{ t('onboarding.balance') }}</span>
          <input
            v-model="acc.balanceStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
          />
        </label>
      </div>
      <AppButton block size="lg" @click="goNext">{{ t('common.next') }}</AppButton>
    </template>

    <!-- Step 3 — pick the categories to keep, add your own -->
    <template v-else-if="step === 'categories'">
      <div class="cat-picker">
        <button
          v-for="cat in categories.expense"
          :key="cat.id"
          type="button"
          class="cat-pill"
          :class="{ 'cat-pill--off': dropped.has(cat.id) }"
          :style="{ '--cat': cat.color }"
          :aria-pressed="!dropped.has(cat.id)"
          @click="toggleCategory(cat)"
        >
          <span class="cat-icon">
            <IconByName :name="cat.icon" :size="16" />
          </span>
          <span class="cat-name">{{ cat.name }}</span>
          <Check v-if="!dropped.has(cat.id)" :size="14" class="cat-mark" />
          <X v-else :size="14" class="cat-mark" />
        </button>
      </div>

      <form class="add-row" @submit.prevent="addCategory">
        <input
          v-model="newCategoryName"
          type="text"
          maxlength="30"
          :placeholder="t('onboarding.addCategoryPlaceholder')"
          :aria-label="t('settings.addCategory')"
        />
        <button
          type="submit"
          class="add-btn"
          :disabled="!newCategoryName.trim()"
          :aria-label="t('settings.addCategory')"
        >
          <Plus :size="18" />
        </button>
      </form>

      <p class="hint">{{ t('onboarding.categoriesHint', { count: keptExpense.length }) }}</p>

      <AppButton block size="lg" :disabled="!keptExpense.length" @click="goNext">
        {{ t('common.next') }}
      </AppButton>
    </template>

    <!-- Step 4 — optional starter budgets -->
    <template v-else>
      <div v-for="(slot, i) in budgetSlots" :key="i" class="card">
        <label class="field">
          <span>{{ t('onboarding.budgetCategory') }}</span>
          <AppSelect
            v-model="slot.categoryId"
            :options="expenseOptions"
            :aria-label="t('onboarding.budgetCategory')"
          />
        </label>
        <label class="field">
          <span>{{ t('onboarding.budgetLimit') }}</span>
          <input
            v-model="slot.amountStr"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="t('common.optional')"
          />
        </label>
      </div>
      <AppButton block size="lg" :disabled="busy" @click="finish(false)">
        {{ busy ? t('onboarding.settingUp') : t('onboarding.finish') }}
      </AppButton>
      <AppButton variant="ghost" block :disabled="busy" @click="finish(true)">
        {{ t('common.skip') }}
      </AppButton>
    </template>
  </div>
</template>

<style scoped>
.hero-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.back-btn {
  width: 36px;
  height: 36px;
  margin-left: calc(var(--space-2) * -1);
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
  transition: background var(--duration-fast) var(--ease-standard);
}

.back-btn:hover {
  background: var(--color-surface-container);
}

.onboarding {
  min-height: calc(100vh - var(--safe-top) - var(--safe-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-6);
  padding: var(--space-2) 0 var(--space-8);
}

.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.02em;
}

.steps-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: 2px;
}

.steps {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
}

.steps span {
  width: 20px;
  height: 5px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-outline) 25%, transparent);
  transition:
    width var(--duration-normal) var(--ease-spring-snappy),
    background-color var(--duration-normal) var(--ease-standard),
    box-shadow var(--duration-normal) var(--ease-standard);
}

.steps span.on {
  background: color-mix(in srgb, var(--color-primary) 60%, var(--color-surface-container-high));
}

.steps span.active {
  width: 38px;
  background: var(--color-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 45%, transparent);
}

.step-label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-muted);
  letter-spacing: 0.02em;
}

h1 {
  font-size: clamp(2rem, 8vw, 2.75rem);
  max-width: 14ch;
}

.lede {
  color: var(--color-on-surface-variant);
  max-width: 34ch;
  font-size: 1.0625rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field span {
  font-size: var(--text-label);
  font-weight: 600;
  color: var(--color-muted);
}

.field input {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.cat-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 1.5px solid color-mix(in srgb, var(--cat) 55%, transparent);
  background: color-mix(in srgb, var(--cat) 16%, var(--color-surface));
  color: var(--color-on-surface);
  font-size: var(--text-label);
  font-weight: 600;
  transition:
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard);
}

.cat-pill:active {
  transform: scale(0.97);
}

.cat-pill--off {
  border-color: var(--color-outline-variant);
  background: var(--color-surface-container);
  color: var(--color-muted);
  opacity: 0.6;
}

.cat-pill--off .cat-name {
  text-decoration: line-through;
}

.cat-icon {
  display: grid;
  place-items: center;
  color: var(--cat);
}

.cat-pill--off .cat-icon {
  color: var(--color-muted);
}

.cat-mark {
  opacity: 0.75;
}

.add-row {
  display: flex;
  gap: var(--space-2);
}

.add-row input {
  flex: 1;
  min-width: 0;
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.add-btn {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-primary-container);
  color: var(--color-primary);
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hint {
  font-size: var(--text-caption);
  color: var(--color-muted);
}
</style>
