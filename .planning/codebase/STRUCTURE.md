# Directory Structure & Organization

**Analysis Date:** 2026-09-28

## High-Level Repository Layout

```
wherediditgo/
├── android/                   # Capacitor native Android Gradle project
├── ios/                       # Capacitor native iOS Xcode project
├── electron/                  # Electron desktop wrapper scripts
├── public/                    # Static web assets (manifest, favicon, logo)
├── scripts/                   # Audits, verification, unit checks, and migration tests
├── src/                       # Application source code
│   ├── app/                   # Shell layout and root router configuration
│   ├── components/            # Shared UI components and modal sheets
│   ├── db/                    # Dexie IndexedDB schemas and seed data
│   ├── features/              # Feature modules (views and sub-components)
│   ├── i18n/                  # Localization files (en, ru, tj)
│   ├── lib/                   # Utility libraries (money math, date calculations)
│   ├── services/              # Domain services (backup, stats, haptics)
│   ├── stores/                # Pinia state stores
│   ├── styles/                # CSS design system (tokens, themes, animations)
│   └── types/                 # TypeScript interfaces and type definitions
├── capacitor.config.json      # Capacitor native configuration
├── package.json               # NPM scripts and dependencies
├── tsconfig.json              # TypeScript compilation settings
└── vite.config.ts             # Vite build and dev server config
```

## Key Source Directories (`src/`)

### `src/features/`
- `accounts/`: Multi-account list, account creation sheet, and balance breakdowns.
- `activity/`: Transaction ledger, search, filters by category/account/month.
- `budgets/`: Category spending limits, recurring expenses, and financial goals.
- `categories/`: Category cards, icon selectors, color picker, and subcategories.
- `debts/`: Lent and borrowed debt cards, payment tracking modals.
- `home/`: Monthly budget overview hero, balance privacy toggle, recent activity.
- `insights/`: Spending analytics, category share distributions, rhythm charts, activity heatmap.
- `onboarding/`: First-launch wizard (currency, starter accounts, starter categories).
- `recurring/`: Automation for repeating subscriptions and bills.
- `settings/`: Formatting preferences, appearance (themes), security PIN, data backup/export.
- `transactions/`: `QuickAddSheet.vue` unified transaction form with inline calculator.

### `src/components/ui/`
- `BottomSheet.vue`: Accessible, spring-animated bottom sheet.
- `ConfirmSheet.vue`: Custom confirmation sheet.
- `DatePickerModal.vue`: Modal calendar for transaction date selection.
- `HeaderActions.vue`: Standardized top-right action buttons.
- `MoneyText.vue`: Visual money formatting with custom currency symbols and signage.
- `TransactionRow.vue`: Interactive transaction row with swipe actions.

### `src/lib/` & `src/services/`
- `src/lib/dates.ts`: Cycle-aware month calculations and formatting.
- `src/lib/money.ts`: Expression evaluator and minor-unit converter.
- `src/lib/tajikDates.ts`: Fallback CLDR date shims for Tajik (`tg`) locale.
- `src/services/stats.ts`: Analytics aggregation and insights card generators.
- `src/services/backup.ts`: JSON/CSV export, import sanitization, and DB migration validation.

---

*Structure analysis: 2026-09-28*
*Update after directory reorganizations*
