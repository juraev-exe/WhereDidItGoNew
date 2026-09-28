# Technical Debt, Concerns & Fragile Areas

**Analysis Date:** 2026-09-28

## Critical Areas & Edge Cases

### 1. Tajik (`tg` / `tj`) Locale Support in Chromium
- **The Issue:** Chromium and Android WebViews lack native CLDR date format strings for Tajik (`tg`/`tj`).
- **Mitigation:** Custom date shims are implemented in `src/lib/tajikDates.ts`. Any new date formatting logic must avoid relying solely on native `Intl.DateTimeFormat` for Tajik; always test that month and weekday names do not fall back to English.

### 2. Vue Scoped CSS Selector Rewrites
- **The Issue:** Vue's scoped CSS compiler rewrites `:global(ancestor) .scoped-child` into `ancestor, .scoped-child[data-v-...]`, applying declarations to the ancestor element instead.
- **Rule:** Drive theme- or state-dependent child styling through CSS custom properties defined in `tokens.css` or explicit bound classes rather than `:global()` descendant selectors.

### 3. Bottom Navigation Overflow on Narrow Viewports
- **The Issue:** The mobile bottom navigation features 7 tabs with a raised center `+` FAB. In languages with longer translated words (e.g., Russian and Tajik), tab text can clip or run under the FAB on viewports smaller than 375px.
- **Rule:** Any additions to navigation must keep labels concise and run through `npm run audit` to check that no nav labels overlap the FAB or truncate.

### 4. Money Precision & Migration Integrity
- **The Issue:** Floating-point operations in JavaScript cause precision bugs (e.g. `0.1 + 0.2 !== 0.3`). Older schema versions (pre-v5) stored debt amounts as floats.
- **Rule:** All monetary figures must remain integers in minor units (cents). Always test backup import/export and migrations using `npm run audit:backup` and `npm run audit:migration`.

### 5. Multi-Device Synchronization (Future Debt)
- **Status:** Currently, data is strictly local-first on the single device (IndexedDB).
- **Consideration:** If cloud or peer-to-peer sync is introduced in the future, conflict-free replicated data types (CRDTs) or a robust timestamped merge strategy will be necessary to prevent overwriting offline transactions.

---

*Concerns analysis: 2026-09-28*
*Update as technical debt is discovered or resolved*
