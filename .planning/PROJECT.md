# WhereDidItGo (WDG)

## What This Is

WhereDidItGo is a local-first personal finance tracker designed for mobile (Android/iOS), desktop, and web. It gives users immediate, private financial clarity through multi-account budgeting, subcategory expense tracking, lent/borrowed debt management, and rich liquid glassmorphic visualizations without requiring cloud backends or account logins.

## Core Value

100% private, local-first financial tracking with instant offline responsiveness and zero data loss.

## Business Context

- **Customer**: Privacy-conscious individuals and mobile users seeking fast, offline expense and budget tracking.
- **Revenue model**: Optional one-time or subscription Pro tier via RevenueCat for premium customization and features.
- **Success metric**: 100% verification pass rate (`npm run verify`), zero data loss on backup round-trips, and zero latency on writes.

## Current State
- **Shipped Version:** v1.1.0 (Advanced Analytics & Reporting Milestone)
- **Status:** All core analytics, E2E auditing, E2E data consistency, and UI features for v1.1 are implemented and verified.

## Next Milestone Goals
*(Pending discovery and /gsd-new-milestone)*

<details>
<summary>Archived v1.0 / v1.1.0 Requirements</summary>

### Validated

- ✓ Local-first persistence via Dexie.js IndexedDB with schema migrations — v1.0
- ✓ Multi-account management (Cash, Savings, Checking, Credit Card) with balance tracking — v1.0
- ✓ Transaction ledger with inline running-sum calculator and custom subcategories — v1.0
- ✓ Symmetrical 7-slot mobile bottom navigation with central QuickAdd FAB — v1.0
- ✓ Category budgets with real-time visual progress and savings goals — v1.0
- ✓ Lent and borrowed debt tracker with partial payment recording — v1.0
- ✓ Tri-lingual internationalization (English, Russian, Tajik with CLDR date shims) — v1.0
- ✓ In-app security PIN code and biometrics lock with balance privacy toggle — v1.0
- ✓ Lossless JSON/CSV data backup export and restore — v1.0
- ✓ **ANLY-01**: Executive Financial KPI Cards (Net Savings Rate, Daily Burn Rate, Period Forecast, Essential vs. Discretionary ratio) — v1.1.0
- ✓ **ANLY-02**: Interactive Cash Flow Comparison Chart (Inflow vs. Outflow with day/week/month buckets) — v1.1.0
- ✓ **ANLY-03**: Interactive Category & Subcategory Drill-Down Breakdown with transaction inspection — v1.1.0
- ✓ **ANLY-04**: Budget Burn-Rate & Runway Gauge comparing spending pace against elapsed days in cycle — v1.1.0
- ✓ **ANLY-05**: Custom Reporting Date Ranges (This Month, Last Month, QTD, YTD, 7d, 30d, 90d, All Time) — v1.1.0
- ✓ **ANLY-06**: Direct CSV/JSON Financial Analytics Report Export — v1.1.0

### Out of Scope

- Centralized cloud sync / multi-device sync servers — violates core local-first privacy architecture; deferred to future encrypted peer-to-peer / CRDT roadmap.
- Bank API integrations (Plaid/Yodlee) — requires external servers and credential storage; out of scope.
</details>

## Context

- The codebase is clean, fully type-checked (`vue-tsc`), and verified with Playwright end-to-end audits.
- All monetary amounts are stored strictly as integers in minor units (cents) to avoid floating-point issues.
- User-configured start-of-month pay cycles (e.g. 15th of month) require all date logic to route through `src/lib/dates.ts`.

## Constraints

- **Tech Stack**: Vue 3.5 (Composition API, `<script setup>`), TypeScript 5.9, Vite 7, Pinia 4, Dexie.js 4, Capacitor 8.
- **Design Tokens**: Apple-inspired liquid glassmorphism, vanilla CSS custom properties in `tokens.css`.
- **Localization**: Every new user-facing string must be translated into `en`, `ru`, and `tj`.
- **Verification**: `npm run verify` must pass cleanly without regressions.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first with Dexie.js | Full privacy, zero server hosting costs, instant offline launch | ✓ Good |
| Minor units (cents) for all currency | Eliminates JavaScript floating-point arithmetic defects | ✓ Good |
| Centralized Start-of-Month Cycle Math (`dates.ts`) | Accommodates users who get paid mid-month (e.g. 15th) | ✓ Good |
| Playwright-driven CI Audits (`scripts/audit.mjs`) | Catches viewport overflows, paint defects, and console errors | ✓ Good |

---
*Last updated: 2026-09-28 after codebase mapping*
