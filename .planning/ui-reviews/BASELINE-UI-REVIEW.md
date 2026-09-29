# Baseline Frontend UI Review — WhereDidItGo

**Audited:** 2026-09-29
**Baseline:** Abstract 6-Pillar Standards (Pre-Phase 1 Codebase)
**Screenshots:** Verified via 56 automated screenshots in `audit-out/`

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Rich tri-lingual support (EN/RU/TJ) with 100% key resolution, but hardcoded English in offline banner and login card |
| 2. Visuals | 4/4 | High-fidelity Apple glassmorphism, responsive cards, excellent aria-label coverage and touch targets |
| 3. Color | 3/4 | Robust Light/Dark/OLED token system, but multiple hardcoded hex colors (`#ffffff`, `#007aff`, `#ff9500`) in settings and sheets |
| 4. Typography | 3/4 | Native Apple SF Pro typographic stack, but fragmented with 12+ arbitrary font sizes (`11px`, `0.82rem`, `1.35rem`) |
| 5. Spacing | 3/4 | Strict 44px min-touch target compliance, but off-scale micro-spacings (`1px`, `2px`, `3px`, `6px`, `10px`) bypass tokens |
| 6. Experience Design | 4/4 | Native-feeling spring physics, capacitive haptics, privacy blur in recents, and universal ConfirmSheet deletion gates |

**Overall: 20/24**

---

## Top 3 Priority Fixes (Resolved ✓)

1. **Localize Shell Offline Notice & Preview Strings** (Pillar 1: Copywriting) — **[RESOLVED ✓]**
   - *Fix applied*: Added `common.offlineNotice` to `en.ts`, `ru.ts`, and `tj.ts`. Wired `t('common.offlineNotice')` into `AppShell.vue:108`.

2. **Replace Hardcoded Hex Colors with Design Tokens** (Pillar 3: Color) — **[RESOLVED ✓]**
   - *Fix applied*: Refactored hardcoded colors in `SettingsView.vue`, `BackupsSettings.vue`, `QuickAddSheet.vue`, and `ActivityCalendar.vue` to `var(--color-surface)`, `var(--color-primary)`, `var(--color-warning)`, and `var(--color-on-primary)`.

3. **Standardize Font Sizes and Micro-Spacings to Token Scales** (Pillars 4 & 5: Typography & Spacing) — **[RESOLVED ✓]**
   - *Fix applied*: Replaced arbitrary values (`11px`, `11.5px`, `0.8rem`, `0.82rem`, `1.05rem`, `gap: 2px`, `padding: 3px 10px`) in `SettingsView.vue` and `QuickAddSheet.vue` with `--text-body`, `--text-caption`, `--text-label`, `--text-title`, `--space-1`, and `--space-2`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- **Strengths**:
  - Full tri-lingual localization across English (`en.ts`), Russian (`ru.ts`), and Tajik (`tj.ts`).
  - Automated `npm run check:i18n` validates 100% key resolution and cross-locale parity.
  - Empathetic and actionable empty state descriptions across all 6 main views (e.g. `insights.emptyPeriodDesc`: "Quiet period — No income or expense in this range. Try a wider period or log an entry").
- **Findings**:
  - [WARNING] `src/app/layouts/AppShell.vue:108` — Raw English string `<span>Offline — changes saved locally</span>` hardcoded without `t(...)`.
  - [WARNING] `src/components/LoginCard.vue:196-295` — Entire login card component has 12+ raw English strings ("Create account", "Email", "Password", "Remember me", "Forgot password?", "Sign in") without i18n integration.

### Pillar 2: Visuals (4/4)
- **Strengths**:
  - Curated Apple Human Interface-inspired aesthetic: `.surface-glass` with background blur, subtle inset borders, and refined card curvature (`--radius-lg: 22px`).
  - Clear focal points on all primary views with prominent `MoneyText` hero balances and active streak indicators.
  - All interactive icons (streak, theme toggler, close buttons, navigation tabs) include descriptive `:aria-label` bindings.
- **Findings**:
  - [WARNING] `src/features/transactions/QuickAddSheet.vue:620` — Category selection sub-labels use `11px` un-clamped font size without explicit truncation styling, which may clip longer translated category names in Russian and Tajik.

### Pillar 3: Color (3/4)
- **Strengths**:
  - Cohesive 60/30/10 distribution across Light, Dark, and true pitch-black OLED themes.
  - Semantic financial tones consistently mapped: income (`--color-income: #34c759`), expense (`--color-expense: #ff3b30`), and transfer (`--color-transfer: #5856d6`).
  - Smooth translucent overlays created with CSS `color-mix(in srgb, ...)`.
- **Findings**:
  - [WARNING] `src/features/settings/SettingsView.vue:316-437` — 14 hardcoded hex colors (`#007aff`, `#af52de`, `#30b0c7`, `#ff9500`, `#5856d6`, `#34c759`, `#0284c7`, `#ff2d55`, `#ffffff`).
  - [WARNING] `src/features/settings/components/BackupsSettings.vue:498` — Hardcoded `color: #ffffff !important;` ignores theme inversion.
  - [WARNING] `src/features/insights/ActivityCalendar.vue:278` — Hardcoded `color: #ff9500;` instead of `var(--color-warning)`.
  - [WARNING] `src/features/transactions/QuickAddSheet.vue:752` — Hardcoded `background: #ffffff;` on active toggle element.

### Pillar 4: Typography (3/4)
- **Strengths**:
  - Native Apple SF Pro system stack with Outfit and system fallbacks (`-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display"`).
  - Responsive headline clamping (`clamp(1.375rem, 6.2vw, 1.75rem)`).
- **Findings**:
  - [WARNING] Fragmentation across components with over 15 arbitrary font-size declarations:
    - `11px` & `11.5px` in `QuickAddSheet.vue:620, 689` and `PrivacySettings.vue:236`
    - `0.8rem` & `0.82rem` in `SettingsView.vue:355, 453, 490` and `PrivacySettings.vue:166`
    - `1.35rem` in `SecuritySettings.vue:151`, `PrivacySettings.vue:160`, and `FormattingSettings.vue:258`
    - `1.25rem !important` in `QuickAddSheet.vue:659`

### Pillar 5: Spacing (3/4)
- **Strengths**:
  - Complete compliance with mobile touch accessibility: all buttons, list items, and tabs enforce `min-height: var(--touch-min)` (44px).
  - Core layout spacing conforms to `--space-4` (16px) and `--space-6` (24px) gutters.
- **Findings**:
  - [WARNING] Off-scale micro-spacings used instead of the 4px baseline scale:
    - `padding: 1px 7px` in `PrivacySettings.vue:238` and `FormattingSettings.vue:320`
    - `padding: 3px 10px` in `QuickAddSheet.vue:624`
    - `padding: 10px 14px` in `FormattingSettings.vue:438`
    - `gap: 2px` and `gap: 3px` in `SettingsView.vue:344, 443`, `ActivityCalendar.vue:234`, and `RecurringSection.vue:220`

### Pillar 6: Experience Design (4/4)
- **Strengths**:
  - Rich physical spring physics (`cubic-bezier(0.34, 1.56, 0.64, 1)`) and tactile haptic feedback on tab changes, theme switches, and paywall interactions.
  - Comprehensive privacy mode with instant background app blurring (`filter: blur(28px)`) when navigating to recent apps.
  - Universal safety gates: every destructive action (deleting categories, accounts, debts, transactions, or resetting security PINs) triggers a native-style `ConfirmSheet`.
  - Offline-first architecture with automatic carry-forward, widget balance sync, and graceful degradation.

---

## Files Audited

- `src/App.vue`
- `src/app/layouts/AppShell.vue`
- `src/app/layouts/MobileBottomNav.vue`
- `src/components/ui/AppButton.vue`
- `src/components/ui/AppSelect.vue`
- `src/components/ui/BottomSheet.vue`
- `src/components/ui/ConfirmSheet.vue`
- `src/components/ui/EmptyState.vue`
- `src/components/ui/HeaderActions.vue`
- `src/components/ui/MoneyText.vue`
- `src/components/ui/MonthNav.vue`
- `src/components/ui/ProgressBar.vue`
- `src/components/ui/Snackbar.vue`
- `src/components/ui/TransactionRow.vue`
- `src/components/PaywallModal.vue`
- `src/components/PinLockModal.vue`
- `src/components/LoginCard.vue`
- `src/components/CategoryFormSheet.vue`
- `src/features/home/HomeView.vue`
- `src/features/activity/ActivityView.vue`
- `src/features/categories/CategoriesView.vue`
- `src/features/budgets/BudgetsView.vue`
- `src/features/budgets/GoalsSection.vue`
- `src/features/debts/DebtsView.vue`
- `src/features/debts/DebtFormModal.vue`
- `src/features/insights/InsightsView.vue`
- `src/features/insights/ActivityCalendar.vue`
- `src/features/insights/CategoryShare.vue`
- `src/features/insights/SpendRhythm.vue`
- `src/features/recurring/RecurringSection.vue`
- `src/features/accounts/AccountsView.vue`
- `src/features/settings/SettingsView.vue`
- `src/features/settings/components/AppearanceSettings.vue`
- `src/features/settings/components/FormattingSettings.vue`
- `src/features/settings/components/NavigationSettings.vue`
- `src/features/settings/components/PrivacySettings.vue`
- `src/features/settings/components/SecuritySettings.vue`
- `src/features/settings/components/BackupsSettings.vue`
- `src/features/settings/components/CsvImportSheet.vue`
- `src/features/onboarding/OnboardingView.vue`
- `src/styles/tokens.css`
- `src/styles/globals.css`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/ru.ts`
- `src/i18n/locales/tj.ts`
