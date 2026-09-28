# Architecture & System Design

**Analysis Date:** 2026-09-28

## High-Level Architecture Pattern

WhereDidItGo follows a **Local-First Reactive Architecture** built on Vue 3, Pinia, and Dexie.js. It operates completely independently of a central server, ensuring immediate UI responsiveness and privacy.

```
┌────────────────────────────────────────────────────────┐
│                        App.vue                         │
│                           │                            │
│           AppShell.vue (PIN lock, Toasts, Offline)     │
│                           │                            │
│  ┌────────────────────────┴─────────────────────────┐  │
│  ▼                                                  ▼  │
│ Router Views (Home, Activity, Insights...)  MobileBottomNav
│  │                                                     │
│  ▼                                                     │
│ Pinia Stores (transactions, categories, budgets...)   │
│  │                                                     │
│  ▼                                                     │
│ Dexie IndexedDB Storage ('wherediditgo')               │
└────────────────────────────────────────────────────────┘
```

## Architectural Layers

### 1. Presentation & Layout Layer (`src/app/layouts/`, `src/components/`)
- **`AppShell.vue`**: Top-level shell managing application viewports, safe area insets, offline indicators, and PIN verification (`PinLockModal.vue`).
- **`MobileBottomNav.vue`**: Centered 7-slot mobile navigation bar with a raised `+` Floating Action Button (FAB) for transaction creation.
- **Shared UI Components (`src/components/ui/`)**:
  - `BottomSheet.vue`: Reusable spring-animated sliding drawer for modal input flows.
  - `ConfirmSheet.vue`: Native-feeling replacement for `window.confirm`.
  - `MoneyText.vue`: Centralized currency formatting, negative/positive styling, and symbol placement.
  - `TransactionRow.vue`: Swipeable transaction list item with subcategory chips.

### 2. Feature Modules (`src/features/`)
Each domain area is self-contained:
- `transactions`: `QuickAddSheet.vue` transaction creator and editor.
- `home`: Executive overview, recent transactions, and monthly progress hero.
- `activity`: Searchable and filterable transaction ledger.
- `categories`: Category management with dynamic color mixing and icon selection.
- `budgets`: Category budget caps and savings goals with progress tracking.
- `debts`: Lent vs. borrowed loan tracking with partial payment tracking.
- `insights`: Multi-period financial analytics, activity calendar, and rhythm charts.
- `settings`: Formatting, appearance (light/dark/oled), navigation customization, backups, and security.

### 3. State Management Layer (`src/stores/`)
Pinia stores maintain reactive in-memory state hydrated directly from IndexedDB:
- `transactions.ts`, `categories.ts`, `accounts.ts`, `budgets.ts`, `debts.ts`, `recurring.ts`
- `settings.ts`: App preferences (currency, theme, locale, start-of-month cycle day).
- `ui.ts`: Global modal and sheet visibility.

### 4. Persistence & Data Service Layer (`src/db/`, `src/services/`)
- **Dexie.js Database (`src/db/index.ts`)**: Schema definitions, auto-incrementing / UUID primary keys, and version migrations.
- **Cycle-Aware Date Abstractions (`src/lib/dates.ts`)**: Implements custom pay-cycle month calculations (e.g. month beginning on the 15th). All queries respect `isInMonth()` and `monthRange()`.
- **Statistical Summarizer (`src/services/stats.ts`)**: Aggregates cash flow, category distributions, spend rhythm, and insights cards.
- **Backup & Migration Engine (`src/services/backup.ts`)**: Lossless JSON/CSV import and export with schema migration normalization.

## Core Invariants

1. **Integer Minor Units**: All monetary values are strictly stored as integers representing cents/minor units to prevent floating-point rounding errors.
2. **Cycle-Aware Math**: Any monthly analytics or transaction queries must pass through `src/lib/dates.ts` to support user-configured start-of-month dates.
3. **No External Network Dependencies**: The core features of the app must always work with zero internet connectivity.

---

*Architecture analysis: 2026-09-28*
*Update after structural changes*
