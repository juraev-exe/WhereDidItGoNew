# Split Transactions Specification

## Overview

WhereDidItGo allows users to track expenses, income, and transfers. In real-world finance tracking, a single payment at a merchant (e.g., Walmart, Target, supermarket, department store) often spans multiple budget categories (e.g., $75 Groceries, $25 Household Cleaning, $15 Electronics). 

Currently, transactions in WhereDidItGo only support a single `categoryId` and single `subcategoryId`. The Split Transactions feature allows dividing a single transaction into two or more distinct category/subcategory splits while preserving the single ledger debit/credit against the account balance.

## Requirements

### 1. Domain Modeling
- Each split has:
  - `id`: unique split identifier (string)
  - `amount`: integer minor units (cents > 0)
  - `categoryId`: target category ID (required)
  - `subcategoryId`: optional subcategory ID
  - `note`: optional per-split description
- Transaction entity gets an optional `splits?: TransactionSplit[]`.
- Invariant: `sum(splits.map(s => s.amount)) === transaction.amount`.
- A transaction with an empty or undefined `splits` array behaves exactly as a standard single-category transaction.

### 2. Pacing & Budget Calculations
- In budget progress and pacing calculations (`stats.ts` and `analytics.ts`):
  - Each split amount counts toward its designated category's monthly budget.
  - Overall monthly spend remains unchanged (equals `tx.amount`).
- In category spending breakdown charts:
  - Each category receives its partitioned share from the splits.
  - Drill-down views list split transactions under each category they touch.

### 3. QuickAdd UI & Split Builder
- Inside `QuickAddSheet.vue`, when adding/editing an expense (or income):
  - User can tap "Split into multiple categories".
  - The form displays split rows with category selector, amount input, and remove button.
  - A real-time allocator indicator shows remaining amount to be assigned.
  - An "Allocate Remaining" shortcut button fills the unassigned balance into a new or selected split.
  - The form prevents submission until remaining balance is exactly 0.

### 4. Activity & Transaction Rows
- In `TransactionRow.vue`, split transactions display:
  - A dedicated `Split` icon or category badge.
  - Subtitle summarizes the categories involved (e.g., "Groceries ($75.00), Household ($25.00)").
- In `ActivityView.vue`:
  - Filtering by a specific category includes transactions where that category appears as either the primary category or one of the splits.

### 5. Backup, Storage & Diagnostics
- Backups (`backup.ts`): `splits` are serialized to JSON and sanitized on restore.
- Autocleaning (`dataCleaning.ts`): Validates that split sums equal transaction amount, and flags/repairs orphaned categories.
- Localization: All UI strings, badges, and validation messages are localized in `en`, `ru`, and `tj`.
