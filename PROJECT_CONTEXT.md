# PROJECT_CONTEXT.md — WhereDidItGo Project Context & Developer Reference

## 📌 Project Overview
**WhereDidItGo** is a local-first, modern personal finance tracking application designed for web, mobile (Android/iOS), and desktop. It provides instant, offline expense tracking, multi-account budgeting, subcategory breakdowns, debt management, and actionable spending analytics with Apple-inspired liquid glassmorphism design.

- **Developer / Author**: Juraev.exe
- **Repository**: [https://github.com/juraev-exe/WhereDidItGoNew](https://github.com/juraev-exe/WhereDidItGoNew)
- **Version**: 1.1.0
- **License**: ISC

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Core Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Build System** | [Vite 7](https://vitejs.dev/) |
| **State Management** | [Pinia 4](https://pinia.vuejs.org/) |
| **Routing** | [Vue Router 5](https://router.vuejs.org/) |
| **Localization** | [Vue i18n 11](https://vue-i18n.org/) (English `en`, Russian `ru`, Tajik `tj`) |
| **Persistence Layer** | Local-first IndexedDB via [Dexie.js 4](https://dexie.org/) |
| **Native Mobile Wrapper** | [Capacitor 8](https://capacitorjs.com/) (`@capacitor/android`, `@capacitor/core`, `@capawesome/capacitor-haptics`) |
| **Icons & Design Tokens** | [Lucide Vue](https://lucide.dev/), Custom Vanilla CSS Glassmorphism Design System |

---

## 🚀 Key Features

1. **Transaction Management (`QuickAddSheet`)**:
   - Expense, Income, and Account Transfer tracking.
   - Subcategories selector (e.g. `Shopping -> Electronics`).
   - Custom `DatePickerModal` and quick preset dates (`Today`, `Yesterday`).
   - Monthly recurring transaction automation.

2. **Accounts & Balances (`AccountsView`)**:
   - Cash, Checking, Savings, and Credit Cards.
   - Credit card debt tracking (amount owed vs payments).
   - Dynamic monthly account balance calculations.

3. **Subcategories & Category Form (`CategoriesView`, `CategoryFormSheet`)**:
   - Customizable category colors (`color-mix` dynamic UI styling) and icons.
   - Inline creation and management of subcategories.
   - Automatic category name suggest on icon selection.

4. **Budgets & Financial Goals (`BudgetsView`, `GoalsSection`)**:
   - Category budget caps with real-time visual progress bars.
   - Savings goals tracker with progress percentage.

5. **Debts & Loans Tracker (`DebtsView`)**:
   - "I Lent" vs "I Borrowed" tracking.
   - Partial payment recording with remaining balance calculation.

6. **Analytics & Activity Calendar (`InsightsView`)**:
   - Spending distribution charts by category.
   - Monthly spending trend comparisons.
   - Interactive activity calendar showing daily expenditure intensity.

7. **App Security & Privacy (`SecuritySettings`, `PinLockModal`)**:
   - Optional 4-digit PIN lock with biometrics (Face ID / Fingerprint).
   - Balance privacy mode toggle (hides hero monetary figures).

---

## 📂 Codebase Directory Architecture

```
wherediditgo/
├── android/                   # Capacitor native Android project
├── public/                    # Static assets (web manifest, icons)
├── src/
│   ├── app/
│   │   └── layouts/
│   │       ├── AppShell.vue          # Root shell wrapper & offline status banner
│   │       └── MobileBottomNav.vue   # Symmetric 7-slot bottom navigation bar
│   ├── components/
│   │   ├── ui/
│   │   │   ├── BottomSheet.vue       # Universal spring-animated modal sheet
│   │   │   ├── ConfirmSheet.vue      # In-app replacement for window.confirm
│   │   │   ├── DatePickerModal.vue   # Custom modal calendar picker
│   │   │   ├── HeaderActions.vue     # Top action bar (search, security)
│   │   │   ├── MoneyText.vue         # Money formatting component
│   │   │   └── TransactionRow.vue    # Transaction list item with subcategories
│   │   ├── CategoryFormSheet.vue     # Category & subcategory editor sheet
│   │   ├── PaywallModal.vue          # Pro upgrade sheet
│   │   └── PinLockModal.vue          # Security PIN code verification modal
│   ├── features/
│   │   ├── accounts/          # Accounts management
│   │   ├── activity/          # Transaction history search & filter
│   │   ├── budgets/           # Monthly budgets & goals
│   │   ├── categories/        # Category management
│   │   ├── debts/             # Debts & loans tracking
│   │   ├── home/              # Dashboard view & monthly summary
│   │   ├── insights/          # Visual charts & activity heatmaps
│   │   ├── recurring/         # Monthly repeating entries
│   │   ├── settings/          # App settings (appearance, backup, security)
│   │   └── transactions/      # QuickAddSheet transaction creator
│   ├── i18n/
│   │   └── locales/           # English (en), Russian (ru), Tajik (tj) translations
│   ├── db/
│   │   ├── index.ts           # Dexie IndexedDB schemas & migrations
│   │   └── seed.ts            # First-run categories and accounts
│   ├── lib/                   # Money parsing, date utilities, color helpers
│   │   ├── dates.ts           # Cycle-aware month helpers (see Start of month)
│   │   └── tajikDates.ts      # Tajik date names — Chromium ships no `tg` CLDR
│   ├── services/
│   │   ├── backup.ts          # JSON backup + CSV export, import sanitisation
│   │   ├── stats.ts           # Monthly stats summarizer & aggregations
│   │   └── native/haptics.ts  # Native haptic feedback triggers
│   ├── stores/                # Pinia state stores
│   │   ├── accounts.ts
│   │   ├── budgets.ts
│   │   ├── categories.ts
│   │   ├── debts.ts
│   │   ├── premium.ts
│   │   ├── recurring.ts
│   │   ├── settings.ts
│   │   ├── transactions.ts
│   │   └── ui.ts              # Global sheet & modal open/close states
│   ├── main.ts                # Application entry point
│   └── App.vue                # Root App component
├── capacitor.config.json      # Capacitor app configuration
├── vite.config.ts             # Vite build & dev server config with allowedHosts
├── package.json
└── PROJECT_CONTEXT.md
```

---

## ⚡ Development Workflow & Commands

### 1. Local Development Server
```bash
npm run dev
```
Starts the Vite dev server on `http://localhost:5173`. `vite.config.ts` has `allowedHosts: true` to support tunnels (e.g., localtunnel, ngrok).

### 2. Type Checking
```bash
npm run typecheck
```
Runs `vue-tsc --noEmit` to verify 100% TypeScript type safety.

### 3. Verification

```bash
npm run check      # typecheck + i18n key coverage + pure-logic unit checks
npm run audit      # drives every page/sheet in a real browser (dev server must be up)
npm run verify     # check + audit + backup round-trip + DB migration
```

`npm run audit` seeds a realistic database, walks every route, sheet and settings
sub-page in all three locales and both themes, and fails on any console error,
missing element, horizontal overflow or truncated navigation label. Screenshots
land in `audit-out/`.

### 4. Production Web Build
```bash
npm run build
```
Executes type checking and compiles minified production web bundles into `dist/`.

### 5. Sync & Build Android App (APK)
```bash
# 1. Build web bundle & sync to Capacitor Android project
npm run sync

# 2. Compile debug APK using Gradle
cd android
.\gradlew.bat assembleDebug
```
The output APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk` (copied to root as `WhereDidItGo-v1.1.0.apk`).

---

## 🎨 Design Tokens & Guidelines

- **Typography**: Inter / Outfit sans-serif fonts.
- **Glassmorphism**: Glass surfaces using `backdrop-filter: blur(20px) saturate(160%)` and `color-mix(in srgb, ...)`.
- **Dynamic Category Styling**: Category colors are applied dynamically using CSS custom property `--cat` and `color-mix(in srgb, var(--cat) 12%, transparent)`.
- **Bottom Navigation**: Dead-centered `+` FAB button positioned symmetrically between 3 left tabs (`Home`, `Activity`, `Categories`) and 3 right tabs (`Debts`, `Budgets`, `Insights`).

---

## 🔒 Data & Persistence Model

- **Local Storage**: IndexedDB via Dexie (`db.ts`). No backend or remote server dependency required.
- **Data Export & Import**: JSON backup export & restore available in **Settings -> Backups & Data**.

### Money units

Every monetary value is stored as an **integer in minor units** (cents). This
includes debts, which held floating-point major units until schema v5 — see the
`version(5).upgrade()` migration in `src/db/index.ts` and the `debtScale`
handling for v1 backups in `src/services/backup.ts`.

### Start of month

`Settings → Formatting → Start of month` shifts the budgeting cycle. A month key
such as `2026-08` means "the cycle that starts on the configured day in August",
so with a start day of 15 it covers 15 Aug – 14 Sep. The conversion lives in
`src/lib/dates.ts` (`setCycleStartDay`, `monthRange`, `monthKey`, `isInMonth`);
every stats function and month filter goes through those helpers. `MonthNav`
shows the concrete date span whenever the start day is not 1.

### Feature workflow

Before starting a non-trivial feature, write down the goal and any constraints
it touches (money units, cycle-aware month math, i18n key coverage) so the
work stays scoped. After changing code, run `npm run verify` — a feature is
not done until it passes, not just until it looks right in the browser. For
work large enough to span independent pieces (e.g. several unrelated screens),
prefer dispatching each piece to a fresh-context pass over extending one long
session — it keeps context from filling with earlier exploration that no
longer matters to the piece at hand.

### Scoped styles and ancestor selectors

Vue's scoped-style compiler cannot express `:global(ancestor) .scoped-child` — it
rewrites it to `ancestor, .scoped-child[data-v-…]`, applying the declarations to
the ancestor instead. Drive such cases from a bound class or a CSS custom
property declared in `tokens.css` rather than a `:global()` descendant selector.
