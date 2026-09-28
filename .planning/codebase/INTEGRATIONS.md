# External Integrations

**Analysis Date:** 2026-09-28

## Architecture Overview

WhereDidItGo is architected as a **local-first application**. By design, 100% of user data remains on the device, meaning there is no centralized REST/GraphQL backend database or tracking telemetry server. External integrations are strictly scoped to native device capabilities and optional in-app subscriptions.

## Storage & Persistence

**Client-Side IndexedDB (`src/db/index.ts`):**
- **Library:** Dexie.js (`dexie`)
- **Database Name:** `wherediditgo`
- **Tables:** `transactions`, `accounts`, `categories`, `budgets`, `goals`, `recurring`, `debts`, `meta`
- **Migrations:** Sequential Dexie version upgrades (currently v5+ with integer minor units for debts)
- **Data Export/Import:** JSON backup export & restore, CSV export (`src/services/backup.ts`)

## Mobile & Native Integrations

**Capacitor Bridge:**
- **App Lifecycle:** `@capacitor/app` - handles app state, back button on Android
- **File System:** `@capacitor/filesystem` - reading and writing local backup files
- **Notifications:** `@capacitor/local-notifications` - recurring reminder alerts
- **Preferences:** `@capacitor/preferences` - persistent key-value store for app settings
- **Share Sheet:** `@capacitor/share` - native share dialog for data exports
- **Status Bar:** `@capacitor/status-bar` - dynamic status bar styling to match active theme
- **Haptics:** `@capawesome/capacitor-haptics` (`src/services/native/haptics.ts`) - tactile feedback on button presses, sheet opens, and tab changes

## Monetization & Payments

**RevenueCat (`@revenuecat/purchases-capacitor`):**
- **Usage:** Optional pro subscription / in-app purchase unlocking advanced features (`src/stores/premium.ts`, `src/components/PaywallModal.vue`)
- **Data Sent:** Anonymous customer app user ID and store receipt verification with Apple App Store / Google Play Store

## Web Hosting & CI/CD

- **Hosting Target:** Vercel (`vercel.json`)
- **Routing Rewrite:** Single page app rewrite (`"rewrites": [{ "source": "/(.*)", "destination": "/" }]`)

---

*Integrations analysis: 2026-09-28*
*Update after adding external services*
