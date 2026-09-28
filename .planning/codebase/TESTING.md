# Testing & Verification Practices

**Analysis Date:** 2026-09-28

## Test Infrastructure & Workflow

WhereDidItGo utilizes a multi-layered verification strategy combining static type checking, i18n parity testing, pure-logic unit checks, and full headless browser audit walks powered by Playwright.

```
┌────────────────────────────────────────────────────────┐
│                   npm run verify                       │
│  ┌────────────────────────┬─────────────────────────┐  │
│  ▼                        ▼                         ▼  │
│ Typecheck (vue-tsc)   i18n Parity (tsx)    Unit Logic (tsx)
│  │                                                     │
│  └────────────────────────┬────────────────────────────┘
│                           ▼                            
│          Browser Audits via Playwright (Vite)          │
│  ┌─────────────────┬──────────────────┬─────────────┐  │
│  ▼                 ▼                  ▼             ▼  │
│ Route & UI Walk  Onboarding Walk  Backup Test  Migration
└────────────────────────────────────────────────────────┘
```

## Test Commands

| Command | Target | Execution Speed |
| :--- | :--- | :--- |
| `npm run typecheck` | Static TypeScript validation (`vue-tsc --noEmit`) | ~5-8s |
| `npm run check:i18n` | Asserts exact key parity across `en`, `ru`, `tj` | ~1s |
| `npm run check:unit` | Unit checks for money parser, cycle dates, clamped math | ~1s |
| `npm run check` | Combined: `typecheck` + `check:i18n` + `check:unit` | ~8s |
| `npm run audit` | Headless Playwright walk of all views, themes, and sheets | ~20-30s |
| `npm run audit:backup` | Validates lossless JSON backup export and restore | ~5s |
| `npm run audit:migration`| Verifies Dexie IndexedDB schema upgrades | ~3s |
| `npm run verify` | Full verification pipeline with automated Vite dev server | ~45-60s |

## Key Test Suites (`scripts/`)

1. **Unit Checks (`scripts/unit-check.mjs`):**
   - Tests `src/lib/money.ts`: currency symbol positioning, negative signs, decimal points, running-sum expressions (`12+8`), subtraction, and error handling.
   - Tests `src/lib/dates.ts`: standard month cycles (start day 1), custom pay cycles (e.g., 15th of the month), short-month clamping (Feb 28/29), and timezone offset safety.

2. **UI & Route Audit (`scripts/audit.mjs`):**
   - Seeds a realistic dataset into IndexedDB.
   - Visits all 8 main routes (`/`, `/activity`, `/categories`, `/budgets`, `/debts`, `/insights`, `/accounts`, `/settings`).
   - Asserts bottom sheets paint with valid dimensions and no blank bodies.
   - Validates write path: adding, editing, and deleting a transaction through the real UI.
   - Asserts zero horizontal overflow on mobile viewports.
   - Tests theme switching (`light`, `oled`, `dark`) and locale changes (`ru`, `tj`, `en`).

3. **Backup & Migration Integrity (`scripts/backup-check.mjs`, `scripts/migration-check.mjs`):**
   - Asserts all entities (subcategories, debts, budgets, recurring entries) survive export/import without loss.
   - Tests migration from floating-point debt figures to integer minor units.

---

*Testing analysis: 2026-09-28*
*Update after adding new tests or audit scripts*
