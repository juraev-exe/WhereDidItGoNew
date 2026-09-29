# Phase 1 — UI Review: Executive Financial KPIs & Pacing Engine

**Audited:** 2026-09-29  
**Baseline:** Abstract 6-pillar standards & Apple Human Interface Guidelines  
**Screenshots:** Captured (.planning/ui-reviews/01-kpi/mobile-insights.png, desktop-insights.png, tablet-insights.png)  

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | 100% localized across EN/RU/TJ; precise financial nomenclature with zero generic strings |
| 2. Visuals | 4/4 | Squircles with semantic color tints, dual progress split track, responsive 2x2 grid layout |
| 3. Color | 4/4 | 100% design token compliance using `var(--color-*)` and `color-mix`; zero hardcoded hex |
| 4. Typography | 4/4 | High-contrast `var(--font-display)` numeric figures paired with `var(--text-caption)` metadata |
| 5. Spacing | 4/4 | Strict 8pt system token adherence (`--space-1`, `--space-2`, `--space-3`); seamless responsive collapse |
| 6. Experience Design | 4/4 | Full accessibility (`role="progressbar"`, aria labels), zero-income handling, cycle end states |

**Overall: 24/24**

---

## Top 3 Recommendations / Enhancements

1. **Category Classification Transparency** — Users may wonder which categories are classified as "Needs" vs "Wants" — Consider adding a lightweight info tooltip or bottom sheet drilldown displaying the detected essential categories.
2. **Interactive Drilldown Feedback** — Tapping a KPI card (e.g. Daily Burn or Projected Spend) could filter the Activity sheet to the current cycle's date range.
3. **Motion Pacing on Period Switch** — Add subtle staggered entrance transitions (`translateY(4px) -> 0`) when toggling between 7d, 30d, 90d, and all-time periods.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- **Localization Parity:** All labels, subtexts, and edge case indicators are wired through `vue-i18n` with zero hardcoded English literals in [`src/features/insights/ExecutiveKpiGrid.vue`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L23-L48).
- **Tone & Clarity:** Copy avoids vague jargon. "Net Savings Rate" clearly states "Saved of income" (or "Outspent income" when negative). "Daily Burn Rate" specifies "{pct}% vs prior stretch" or "Same as prior stretch".
- **Singular/Plural & Cycle End States:** Cycle completion is handled cleanly: if `daysRemaining === 0`, subtext dynamically switches from "{count}d remaining in period" to "Cycle completed" ([`ExecutiveKpiGrid.vue:L36-L41`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L36-L41)).

### Pillar 2: Visuals (4/4)
- **Visual Rhythm & Balance:** The 4 KPI cards balance the Insights screen between the top Hero aggregate and the detailed story list below.
- **Icon Squircles:** Each card features a 34x34px rounded icon container with specialized semantic tinting:
  - Savings: Primary squircle (`PiggyBank`)
  - Burn Rate: Warning amber squircle (`Flame`)
  - Projected Spend: Tertiary purple squircle (`CalendarClock`)
  - Split Ratio: Emerald squircle (`PieChart`)
- **Micro-Interactions:** Subtle hover lift (`translateY(-2px)`) and press scale (`0.98`) provide physical Apple-like tactile feedback ([`ExecutiveKpiGrid.vue:L175-L184`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L175-L184)).
- **Dual Progress Track:** Needs vs Wants ratio displays a 6px pill track with smooth CSS width transitions ([`ExecutiveKpiGrid.vue:L303-L325`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L303-L325)).

### Pillar 3: Color (4/4)
- **Token Compliance:** Grepped all styles — 0 hex `#` colors or raw `rgb()` values in the component.
- **Dynamic Semantic Tone:** The Net Savings Rate card applies `.tone--good`, `.tone--warn`, or `.tone--neutral` modifying badge backgrounds via `color-mix(in srgb, var(--color-success) 18%, transparent)`.
- **Contrast & Hierarchy:** Figures use high-contrast `var(--color-on-surface)` while secondary labels use `var(--color-muted)`.

### Pillar 4: Typography (4/4)
- **Display Numerics:** Large figures leverage `var(--font-display)` at `1.35rem` with `-0.02em` tracking and `700` weight, ensuring numerical readability at a glance.
- **Label Hierarchy:** Primary labels use `var(--text-caption)` with `600` weight. Subtitles use `0.75rem` at `var(--color-muted)`.
- **Currency Formatting:** Minor units (cents) are rendered through `<MoneyText />` preserving global formatting standards across currencies.

### Pillar 5: Spacing (4/4)
- **Grid Layout:** Clean 2-column grid with `gap: var(--space-3)` (12px), collapsing gracefully to 1 column on devices narrower than 340px ([`ExecutiveKpiGrid.vue:L326-L330`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L326-L330)).
- **Component Padding:** Standardized internal padding `var(--space-3)` matching surrounding cards and widgets in the app.
- **Zero Overflow:** All text labels and subtexts include `text-overflow: ellipsis` and `overflow: hidden` guards against ultra-compact viewports.

### Pillar 6: Experience Design (4/4)
- **Accessibility:**
  - Container defined with `role="region"` and localized `:aria-label="t('insights.kpi.title')"` ([`ExecutiveKpiGrid.vue:L52`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L52)).
  - Needs vs Wants track implements `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and descriptive localized ratio label ([`ExecutiveKpiGrid.vue:L129-L135`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue#L129-L135)).
- **Edge Cases Tested & Verified:**
  - $0 income periods clamp net savings cleanly without dividing by zero.
  - Cycle start (day 1) vs cycle end (last day) transitions dynamically compute remaining velocity without projection spikes.
  - Prior period spend comparison smoothly flags `+0%` or `-0%` as "Same as prior stretch".

---

## Files Audited
- [`src/features/insights/ExecutiveKpiGrid.vue`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/ExecutiveKpiGrid.vue)
- [`src/features/insights/InsightsView.vue`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/features/insights/InsightsView.vue)
- [`src/services/stats.ts`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/services/stats.ts)
- [`src/i18n/locales/en.ts`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/i18n/locales/en.ts)
- [`src/i18n/locales/ru.ts`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/i18n/locales/ru.ts)
- [`src/i18n/locales/tj.ts`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/src/i18n/locales/tj.ts)
- [`scripts/unit-check.mjs`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/scripts/unit-check.mjs)
