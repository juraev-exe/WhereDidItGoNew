# Code Conventions & Patterns

**Analysis Date:** 2026-09-28

## Component & TypeScript Standards

1. **Vue 3 Composition API:**
   - Always use `<script setup lang="ts">`.
   - Prefer `computed()` for derived reactive state rather than manual watchers.
   - Use typed props and emits (`defineProps<{ ... }>()` and `defineEmits<{ ... }>()`).

2. **TypeScript Strictness:**
   - 100% strict type safety enforced by `vue-tsc --noEmit`.
   - Avoid `any`. Define domain models in `src/types/` (e.g. `Transaction`, `Category`, `Budget`, `Debt`).

3. **Styling & Design Tokens:**
   - **Scoped Styles:** Always use `<style scoped>`.
   - **Vue Scoped Selector Rule:** Never use `:global(ancestor) .scoped-child` — Vue's compiler rewrites it improperly. Instead, drive ancestor-dependent styling via bound classes or CSS custom properties.
   - **Tokens:** Consume variables from `src/styles/tokens.css` (`--space-1` to `--space-6`, `--radius-sm` to `--radius-full`, `--color-surface`, `--color-outline`).
   - **Dynamic Category Tinting:** Use `color-mix(in srgb, var(--cat) 12%, transparent)` for subtle category-themed backgrounds.
   - **Glassmorphism:** Use `backdrop-filter: blur(20px) saturate(160%)` for sheets and elevated controls.

4. **Localization (i18n):**
   - Every user-visible text string MUST be localized using `t('path.to.key')`.
   - All translation keys MUST be present in all 3 locale files:
     - `src/i18n/locales/en.json` (English)
     - `src/i18n/locales/ru.json` (Russian)
     - `src/i18n/locales/tj.json` (Tajik)
   - Checked and validated via `npm run check:i18n`.

5. **Financial Data Precision:**
   - Never store fractional/decimal major currency values in the database.
   - Always store monetary amounts as integers representing cents/minor units (e.g., `$12.50` is stored as `1250`).
   - Use `MoneyText.vue` or `formatMoney()` for rendering amounts to users.

6. **Date Calculations:**
   - Do not use raw calendar date checks for monthly budgets.
   - Always route month filtering through `monthRange()` and `isInMonth()` from `src/lib/dates.ts` to respect user-configured start-of-month cycle days.

---

*Conventions analysis: 2026-09-28*
*Update after adding new architectural rules*
