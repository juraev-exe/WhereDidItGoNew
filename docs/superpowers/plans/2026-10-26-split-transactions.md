# Split Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to split a single transaction across multiple categories and subcategories with real-time balance validation, split breakdown visualizations, budget attribution, and multi-language support.

**Architecture:** Add a `splits` collection to the `Transaction` domain entity. Create a dedicated `splits.ts` domain service for validation and flattening, update budget calculations and category spending analytics in `stats.ts` to attribute amounts per split, update Dexie backup/cleaning routines, and enhance `QuickAddSheet.vue` and `TransactionRow.vue` with interactive split management.

**Tech Stack:** Vue 3.5 (Composition API, `<script setup>`), TypeScript 5.9, Dexie.js (IndexedDB), Pinia, Lucide Icons, vue-i18n.

**Spec:** [docs/superpowers/specs/2026-10-26-split-transactions-spec.md](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/docs/superpowers/specs/2026-10-26-split-transactions-spec.md)

## Global Constraints

- Tech Stack: Vue 3.5, TypeScript 5.9, Pinia 4, Dexie.js 4, Vite 7.
- Currency Math: All currency values must be stored and computed as integer minor units (cents). Floating-point arithmetic on money is prohibited.
- Localization: Every user-facing label or error message must be registered across `en`, `ru`, and `tj`.
- Zero Regression: `npm run check` (typecheck, i18n-check, unit-check, autocleaning-check) must pass after every task.
- Clean Architecture: Backward compatibility must be strictly preserved; transactions without splits behave identically to existing single-category transactions.

## Review Focus

1. Split sum does not equal transaction total — UI must prevent saving and compute exact remaining minor units to allocate.
2. Negative or zero split amount — Validation must reject non-positive split values.
3. Category deletion with existing split references — `flattenTransactionSplits` and `dataCleaning.ts` must gracefully fallback to uncategorized if a category is missing.
4. Activity filter by category — Activity list must match a transaction if either its top-level `categoryId` OR any of its `splits` match the selected category.
5. Budget burn rate calculation — Spend from split transactions must accurately partition across respective category budget envelopes.

---

### Task 1: Domain Types and Split Service

**Files:**
- Modify: `src/types/finance.ts:50-80`
- Create: `src/services/splits.ts`
- Test: `scripts/unit-check.mjs`

**Interfaces:**
- Produces: `TransactionSplit`, `validateSplits(splits: TransactionSplit[], totalAmount: number)`, `flattenTransactionSplits(tx: Transaction)`

- [ ] **Step 1: Write the failing test**

Add unit test suite to `scripts/unit-check.mjs`:
```javascript
// — Split Transactions Engine —
const validSplits = [
  { id: 's1', amount: 3000, categoryId: 'cat_groceries' },
  { id: 's2', amount: 2000, categoryId: 'cat_household' },
]
assert(validateSplits(validSplits, 5000).valid === true, 'splits sum matches total')
assert(validateSplits(validSplits, 5000).remainder === 0, 'remainder is zero')
assert(validateSplits(validSplits, 6000).valid === false, 'splits sum mismatch is invalid')
assert(validateSplits(validSplits, 6000).remainder === 1000, 'calculates remaining 1000 cents')
assert(validateSplits([{ id: 's1', amount: -500, categoryId: 'cat_1' }], 500).valid === false, 'rejects negative split amount')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-check.mjs`
Expected: FAIL with "validateSplits is not defined"

- [ ] **Step 3: Implement domain types and `splits.ts`**

Update `src/types/finance.ts`:
```typescript
export interface TransactionSplit {
  id: string
  amount: number
  categoryId: string
  subcategoryId?: string
  note?: string
}
```
Add `splits?: TransactionSplit[]` to `Transaction` and `TxInput`.

Create `src/services/splits.ts` exporting:
- `validateSplits(splits: TransactionSplit[] | undefined, totalAmount: number): { valid: boolean; remainder: number; error?: string }`
- `flattenTransactionSplits(tx: Transaction): Array<{ categoryId: string; subcategoryId?: string; amount: number; note: string }>`

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-check.mjs`
Expected: PASS with "All unit checks passed."

- [ ] **Step 5: Commit**

```bash
git add src/types/finance.ts src/services/splits.ts scripts/unit-check.mjs
git commit -m "feat(domain): add TransactionSplit type and splits validation service"
```

---

### Task 2: Store Support & Budget/Stats Split Attribution

**Files:**
- Modify: `src/stores/transactions.ts:95-170`
- Modify: `src/services/stats.ts:115-275`
- Test: `scripts/unit-check.mjs`

**Interfaces:**
- Consumes: `flattenTransactionSplits` from `@/services/splits`
- Produces: Multi-category budget attribution in `monthSpendByBudget` and `categorySpendBreakdown`

- [ ] **Step 1: Write the failing test**

Add unit test to `scripts/unit-check.mjs`:
```javascript
const splitTx = {
  id: 'tx_split_1',
  amount: 10000,
  type: 'expense',
  accountId: 'acc_1',
  date: '2026-10-15',
  splits: [
    { id: 'sp_1', amount: 6000, categoryId: 'cat_groceries' },
    { id: 'sp_2', amount: 4000, categoryId: 'cat_entertainment' },
  ],
  note: 'Target Run',
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-10-15T10:00:00Z',
}
const catBreakdown = categorySpendBreakdown([splitTx], { start: '2026-10-01', end: '2026-10-31' }, { cat_groceries: { name: 'Groceries' }, cat_entertainment: { name: 'Entertainment' } })
assert(catBreakdown.find(c => c.categoryId === 'cat_groceries')?.amount === 6000, 'groceries allocated 6000 cents')
assert(catBreakdown.find(c => c.categoryId === 'cat_entertainment')?.amount === 4000, 'entertainment allocated 4000 cents')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-check.mjs`
Expected: FAIL because `categorySpendBreakdown` currently groups solely by `tx.categoryId`.

- [ ] **Step 3: Update `src/stores/transactions.ts` and `src/services/stats.ts`**

In `src/stores/transactions.ts`:
- Validate splits if present: `if (input.splits?.length) { const v = validateSplits(input.splits, input.amount); if (!v.valid) throw new Error(v.error) }`
- Assign `splits: input.splits` when saving transaction to Dexie.

In `src/services/stats.ts`:
- Import `flattenTransactionSplits` from `@/services/splits`.
- In `monthSpendByBudget()`: Iterate over `flattenTransactionSplits(t)` instead of single `t.amount` so each split amount is charged to its matching budget.
- In `categorySpendBreakdown()`: Iterate over `flattenTransactionSplits(t)` to accumulate category and subcategory amounts accurately.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-check.mjs`
Expected: PASS with "All unit checks passed."

- [ ] **Step 5: Commit**

```bash
git add src/stores/transactions.ts src/services/stats.ts scripts/unit-check.mjs
git commit -m "feat(stats): integrate split transactions into budget pacing and category metrics"
```

---

### Task 3: Backup Sanitization and Data Quality Diagnostics

**Files:**
- Modify: `src/services/backup.ts:120-150`
- Modify: `src/services/dataCleaning.ts:100-250`
- Test: `scripts/data-autocleaning-check.mjs`

**Interfaces:**
- Consumes: `TransactionSplit` from `@/types/finance`
- Produces: Safe JSON serialization/deserialization of `splits` and anomaly detection

- [ ] **Step 1: Write the failing test**

Add test to `scripts/data-autocleaning-check.mjs`:
```javascript
const badSplitTx = {
  id: 'tx_bad_split',
  amount: 5000,
  type: 'expense',
  accountId: 'acc_1',
  splits: [
    { id: 's1', amount: 3000, categoryId: 'cat_valid' },
    { id: 's2', amount: 1000, categoryId: 'cat_valid' }, // sum is 4000 != 5000
  ],
  date: '2026-10-01',
}
const anomalies = auditTransactionSplits(badSplitTx)
assert(anomalies.length > 0, 'detects split sum mismatch anomaly')
assert(anomalies[0].type === 'split_sum_mismatch', 'anomaly type is split_sum_mismatch')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run check:autocleaning`
Expected: FAIL with "auditTransactionSplits is not defined"

- [ ] **Step 3: Update `src/services/backup.ts` and `src/services/dataCleaning.ts`**

In `src/services/backup.ts`:
- In `sanitizeTransaction()`: If `raw.splits` is an array, map and sanitize each split (`id`, integer `amount`, trimmed strings for `categoryId`, `subcategoryId`, `note`).
In `src/services/dataCleaning.ts`:
- In `profileDataQuality()`: Flag anomalies when `tx.splits` sum does not equal `tx.amount` or when `split.categoryId` does not exist in categories table.
- In `cleanAndSanitizeData()`: Auto-clean orphaned category IDs in splits to uncategorized and normalize integer split amounts.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run check:autocleaning`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/backup.ts src/services/dataCleaning.ts scripts/data-autocleaning-check.mjs
git commit -m "feat(data): add split sanitization and data quality diagnostic auditing"
```

---

### Task 4: Localization for Split Transactions

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/ru.ts`
- Modify: `src/i18n/locales/tj.ts`
- Test: `scripts/i18n-check.mjs`

**Interfaces:**
- Produces: `splits.*` i18n keys across all locales

- [ ] **Step 1: Write the failing test**

Run: `npm run check:i18n`
Verify current pass status before making changes.

- [ ] **Step 2: Add localization keys**

Add `splits` block to `en.ts`, `ru.ts`, and `tj.ts`:
```typescript
// In en.ts
splits: {
  splitExpense: 'Split into multiple categories',
  splitTitle: 'Split Transaction',
  addSplit: 'Add another split',
  removeSplit: 'Remove split',
  amountRequired: 'Split amount required',
  totalToAllocate: 'Total to allocate',
  allocated: 'Allocated',
  remaining: 'Remaining',
  fillRemaining: 'Allocate Remaining',
  mismatchError: 'Splits must equal total amount ({remainder} left)',
  badge: 'Split',
  details: '{count} splits',
}

// In ru.ts
splits: {
  splitExpense: 'Разделить на несколько категорий',
  splitTitle: 'Разделение транзакции',
  addSplit: 'Добавить категорию',
  removeSplit: 'Удалить категорию',
  amountRequired: 'Укажите сумму',
  totalToAllocate: 'Всего к распределению',
  allocated: 'Распределено',
  remaining: 'Осталось',
  fillRemaining: 'Остаток сюда',
  mismatchError: 'Сумма частей должна быть равна итогу (осталось {remainder})',
  badge: 'Разделено',
  details: '{count} кат.',
}

// In tj.ts
splits: {
  splitExpense: 'Тақсим ба чанд категория',
  splitTitle: 'Тақсими амалиёт',
  addSplit: 'Иловаи категория',
  removeSplit: 'Нест кардани бахш',
  amountRequired: 'Маблағро ворид кунед',
  totalToAllocate: 'Ҳамагӣ барои тақсим',
  allocated: 'Тақсим шуд',
  remaining: 'Боқимонда',
  fillRemaining: 'Боқимонда ба ин ҷо',
  mismatchError: 'Маблағ бояд пурра мувофиқ бошад ({remainder} монд)',
  badge: 'Тақсимшуда',
  details: '{count} бахш',
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run check:i18n`
Expected: PASS with "All i18n keys resolve."

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.ts src/i18n/locales/ru.ts src/i18n/locales/tj.ts
git commit -m "feat(i18n): add split transactions localization keys across en, ru, and tj"
```

---

### Task 5: Interactive Split Management in QuickAddSheet

**Files:**
- Modify: `src/features/transactions/QuickAddSheet.vue`
- Test: `scripts/unit-check.mjs`

**Interfaces:**
- Consumes: `TransactionSplit` from `@/types/finance`, `validateSplits` from `@/services/splits`
- Produces: Interactive split row list, remaining balance indicator, auto-fill remainder button

- [ ] **Step 1: Write verification test for form state**

Add test in `scripts/unit-check.mjs` validating split composition logic:
```javascript
const splitsInput = [
  { id: '1', amount: 2500, categoryId: 'c1' },
  { id: '2', amount: 7500, categoryId: 'c2' },
]
assert(validateSplits(splitsInput, 10000).valid === true, 'quick add splits form matches')
```

- [ ] **Step 2: Run test to verify it fails/passes**

Run: `node scripts/unit-check.mjs`

- [ ] **Step 3: Implement split editor in `QuickAddSheet.vue`**

In `src/features/transactions/QuickAddSheet.vue`:
1. Add toggle state: `const isSplit = ref(false)`
2. Add split rows state: `const splitRows = ref<Array<{ id: string; amountStr: string; categoryId: string; subcategoryId?: string; note?: string }>>([])`
3. Add helper methods:
   - `toggleSplitMode()`: initializes 2 split rows with evenly divided amounts or remainder.
   - `addSplitRow()`: appends a row with category and remaining unallocated amount.
   - `removeSplitRow(index)`: removes row and recalculates remainder.
   - `autoFillRemaining(index)`: sets row's amount to current unallocated balance.
4. Add template markup inside the category selection block:
   - "Split into multiple categories" toggle pill.
   - Dynamic split rows with category selector, amount input, and delete icon.
   - Remaining balance pill (`Remaining: $X.XX` or `✓ Fully Allocated`).
   - Prevent save if `isSplit` is true and `validateSplits().valid` is false.
5. Populate `input.splits` when saving transaction to store.

- [ ] **Step 4: Run typecheck and unit check**

Run: `npm run typecheck && npm run check:unit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/transactions/QuickAddSheet.vue
git commit -m "feat(ui): add interactive split transaction builder to QuickAddSheet"
```

---

### Task 6: Display Splits in TransactionRow and Activity Filter

**Files:**
- Modify: `src/components/ui/TransactionRow.vue`
- Modify: `src/features/activity/ActivityView.vue`
- Test: `npm run check`

**Interfaces:**
- Consumes: `Transaction.splits`
- Produces: `[Split]` badge, multi-category summary, and multi-category activity filtering

- [ ] **Step 1: Write filter test**

Add unit test in `scripts/unit-check.mjs`:
```javascript
const txWithSplits = {
  id: 'tx_s',
  amount: 5000,
  type: 'expense',
  accountId: 'a1',
  date: '2026-10-10',
  splits: [
    { id: 'sp1', amount: 2000, categoryId: 'cat_groceries' },
    { id: 'sp2', amount: 3000, categoryId: 'cat_utilities' },
  ],
  note: '',
  createdAt: '2026-10-10T10:00:00Z',
  updatedAt: '2026-10-10T10:00:00Z',
}
const matchesGroceries = txWithSplits.splits.some(s => s.categoryId === 'cat_groceries')
const matchesUtilities = txWithSplits.splits.some(s => s.categoryId === 'cat_utilities')
const matchesDining = txWithSplits.splits.some(s => s.categoryId === 'cat_dining')
assert(matchesGroceries === true, 'matches first split category')
assert(matchesUtilities === true, 'matches second split category')
assert(matchesDining === false, 'does not match unincluded category')
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node scripts/unit-check.mjs`

- [ ] **Step 3: Update `TransactionRow.vue` and `ActivityView.vue`**

In `TransactionRow.vue`:
- Import `Split` from `@lucide/vue`.
- When `props.transaction.splits?.length`:
  - Show split icon.
  - Subtitle displays formatted split summary: `Groceries ($20.00), Utilities ($30.00)`.
  - Display subtle `Split` badge.

In `ActivityView.vue`:
- Update `filtered` computed:
  ```typescript
  if (categoryFilter.value !== 'all') {
    const matchesTop = tx.categoryId === categoryFilter.value
    const matchesSplit = tx.splits?.some((s) => s.categoryId === categoryFilter.value)
    if (!matchesTop && !matchesSplit) return false
  }
  ```

- [ ] **Step 4: Run full check suite**

Run: `npm run check`
Expected: PASS (all 4 check scripts succeed).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TransactionRow.vue src/features/activity/ActivityView.vue scripts/unit-check.mjs
git commit -m "feat(ui): display split indicators and filter activity by split categories"
```
