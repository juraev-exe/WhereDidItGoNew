---
name: website-essentials
description: Use when building, upgrading, auditing, or polishing websites, web apps, or landing pages to add essential UX features, navigation patterns, form states, accessibility controls, and interactive affordances
---

# 20 Essential Website Features & UX Patterns

A production-grade implementation guide for the **20 high-impact features** every modern website and web application should ship with—covering navigation, theme controls, form states, accessibility, conversion tracking, and micro-interactions.

---

## Quick Reference: The 20 Essential Features

| # | Feature | Core UX Purpose | Key Implementation / Pattern |
|---|---|---|---|
| 1 | **Dark mode toggle** | User theme control without flash on load | Inline `<head>` script + `localStorage` + `prefers-color-scheme` + `.dark` class |
| 2 | **Simple cookie banner** | Non-blocking privacy consent | Bottom bar, equal-weight Accept/Decline buttons, `localStorage` state |
| 3 | **Full site search** | Instant keyboard-first content discovery | `Cmd/Ctrl+K` modal, `<input role="combobox">`, debounced query, keyboard nav |
| 4 | **Scroll back-to-top button** | Quick return on long-form pages | Appears after 400px scroll, respects `prefers-reduced-motion`, 44×44px target |
| 5 | **Mobile menus** | Ergonomic small-screen navigation | `<button aria-expanded>`, focus trap, `Escape` close, body scroll lock |
| 6 | **Loading animations** | Immediate async response without layout shift | Layout-matched skeletons + button spinner with `disabled` and `aria-busy="true"` |
| 7 | **Hover states** | Clear interactive affordance | `@media (hover: hover)` + `150ms` transition + paired `:focus-visible` ring |
| 8 | **Scroll progress bars** | Reading progress feedback on long pages | Fixed top bar using CSS `animation-timeline: scroll()` or `scaleX()` |
| 9 | **Copy-to-clipboard buttons** | One-click copying for code, links, IDs | `navigator.clipboard.writeText()` + 2s checkmark feedback + `aria-live="polite"` |
| 10 | **Print stylesheet** | Clean hard-copy & PDF export | `@media print` hiding chrome (`.no-print`), high-contrast ink, `break-inside: avoid` |
| 11 | **Sticky headers** | Persistent navigation context | `position: sticky; top: 0` + `backdrop-filter: blur(12px)` + `scroll-margin-top` |
| 12 | **Skip-to-content link** | Keyboard & screen-reader bypass of nav | First focusable link (`sr-only focus:not-sr-only`) targeting `<main id="main-content">` |
| 13 | **Password visibility toggle** | Reduce login/signup typing errors | `<button type="button" aria-pressed>` toggling `type="password"` ↔ `type="text"` |
| 14 | **UTM tracking** | Attribution across page transitions & forms | Parse `URLSearchParams` (`utm_*`), persist in `sessionStorage`, inject into forms |
| 15 | **Form success state** | Calm, specific confirmation after submit | Inline state swap (`role="status"`), clear next step, duplicate-submit lock |
| 16 | **Form error state** | Actionable recovery without losing input | Field-level `aria-invalid` + `aria-describedby`, preserve values, specific copy |
| 17 | **Confirmation modals** | Guardrails for destructive actions | Native `<dialog>`, explicit consequence copy, named destructive CTA ("Delete item") |
| 18 | **Last updated dates** | Content freshness and reader trust | Semantic `<time datetime="YYYY-MM-DD">` on docs, articles, and legal pages |
| 19 | **Expandable FAQ sections** | Progressive disclosure of objections | `<details>`/`<summary>` or ARIA accordion + smooth `0fr → 1fr` grid transition |
| 20 | **Floating contact button** | Persistent help/contact access | Bottom-right FAB respecting `safe-area-inset-bottom` and offset from back-to-top |

---

## Detailed Breakdown & Code Patterns

### 1. Dark Mode Toggle
> **Goal**: *Allow users to switch themes seamlessly without a flash of unstyled/wrong-theme content (FOUC) on page load.*
- **Requirements**:
  - Run a synchronous inline script in `<head>` before first paint to read `localStorage.theme` and fall back to `window.matchMedia('(prefers-color-scheme: dark)')`.
  - Expose an accessible toggle button with `aria-label` and `aria-pressed`.
- **Code Pattern**:
  ```html
  <!-- 1. In <head>: Prevent FOUC before stylesheets render -->
  <script>
    (() => {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved ? saved === 'dark' : prefersDark;
      document.documentElement.classList.toggle('dark', isDark);
    })();
  </script>

  <!-- 2. Accessible toggle control -->
  <button
    type="button"
    id="theme-toggle"
    aria-label="Toggle dark mode"
    aria-pressed="false"
    class="inline-flex h-10 w-10 items-center justify-center rounded-lg border"
  >
    <span class="dark:hidden">🌙</span>
    <span class="hidden dark:inline">☀️</span>
  </button>
  ```
  ```typescript
  function initThemeToggle() {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(isDark));
  }

  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(isDark));
  }
  ```

### 2. Simple Cookie Banner
> **Goal**: *Capture privacy consent cleanly without blocking the viewport or using manipulative dark patterns.*
- **Requirements**:
  - Render as a compact bottom banner (`role="region" aria-label="Cookie consent"`), never a full-screen blocking wall.
  - Give **Accept** and **Decline / Necessary Only** equal visual clarity.
  - Persist choice in `localStorage` with a timestamp and version key.
- **Code Pattern**:
  ```html
  <aside
    id="cookie-banner"
    role="region"
    aria-label="Cookie consent"
    class="no-print fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-4 rounded-xl border bg-surface p-4 shadow-lg"
  >
    <p class="text-sm text-muted">
      We use essential cookies to keep the site working and optional analytics to improve it.
      <a href="/privacy" class="underline">Privacy Policy</a>
    </p>
    <div class="flex items-center gap-2">
      <button type="button" data-cookie="essential" class="rounded-lg border px-3 py-1.5 text-sm font-medium">
        Essential only
      </button>
      <button type="button" data-cookie="all" class="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
        Accept all
      </button>
    </div>
  </aside>
  ```

### 3. Full Site Search
> **Goal**: *Enable instant content discovery via click or `Cmd/Ctrl + K` keyboard shortcut.*
- **Requirements**:
  - Bind `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) to open the search dialog.
  - Debounce input (`150ms`), support `ArrowDown` / `ArrowUp` / `Enter` / `Escape`, and show a helpful empty state when no results match.
- **Code Pattern**:
  ```typescript
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
    }
  });
  ```
  ```html
  <dialog id="site-search" class="w-full max-w-lg rounded-2xl border bg-surface p-4 shadow-2xl">
    <div class="flex items-center gap-2 border-b pb-3">
      <input
        type="search"
        role="combobox"
        aria-expanded="true"
        aria-controls="search-results"
        placeholder="Search docs, pages, or actions… (Esc to close)"
        class="w-full bg-transparent text-base focus:outline-none"
      />
    </div>
    <ul id="search-results" role="listbox" class="mt-3 max-h-72 overflow-y-auto">
      <!-- Filtered items with aria-selected="true|false" -->
    </ul>
  </dialog>
  ```

### 4. Scroll Back-to-Top Button
> **Goal**: *Let users return to the top of long pages with a single tap.*
- **Requirements**:
  - Remain hidden until the user scrolls past `400px` (use passive scroll listener or `IntersectionObserver` on a sentinel).
  - Respect `prefers-reduced-motion` (use `'instant'` instead of `'smooth'` when enabled).
- **Code Pattern**:
  ```html
  <button
    type="button"
    id="back-to-top"
    aria-label="Scroll back to top"
    hidden
    class="no-print fixed bottom-20 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-surface shadow-md transition-opacity"
  >
    ↑
  </button>
  ```
  ```typescript
  const backToTopBtn = document.getElementById('back-to-top');

  window.addEventListener('scroll', () => {
    if (backToTopBtn) backToTopBtn.hidden = window.scrollY <= 400;
  }, { passive: true });

  backToTopBtn?.addEventListener('click', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'instant' : 'smooth' });
  });
  ```

### 5. Mobile Menus
> **Goal**: *Deliver responsive, accessible navigation on viewports under `768px`.*
- **Requirements**:
  - Toggle button must declare `aria-expanded="true|false"` and `aria-controls="mobile-nav"`.
  - Lock background page scroll (`document.body.style.overflow = 'hidden'`) while open.
  - Close automatically on `Escape` key press, route change, or backdrop click.
- **Code Pattern**:
  ```html
  <button
    type="button"
    id="mobile-menu-btn"
    aria-label="Toggle navigation menu"
    aria-expanded="false"
    aria-controls="mobile-nav"
    class="md:hidden h-11 w-11 inline-flex items-center justify-center"
  >
    <span class="sr-only">Menu</span>
    <!-- Hamburger / Close SVG -->
  </button>

  <nav id="mobile-nav" hidden class="fixed inset-0 z-50 bg-surface p-6 md:hidden">
    <!-- Navigation links -->
  </nav>
  ```
  ```typescript
  function setMobileMenuOpen(isOpen: boolean) {
    const btn = document.getElementById('mobile-menu-btn');
    const nav = document.getElementById('mobile-nav');
    if (!btn || !nav) return;
    btn.setAttribute('aria-expanded', String(isOpen));
    nav.hidden = !isOpen;
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMobileMenuOpen(false);
  });
  ```

### 6. Loading Animations
> **Goal**: *Provide instant visual assurance during asynchronous operations without Cumulative Layout Shift (CLS).*
- **Requirements**:
  - **Page/Section loading**: Use skeleton placeholders matching the exact dimensions (`min-height`, `aspect-ratio`) of the final content.
  - **Button actions**: Set `disabled` and `aria-busy="true"` immediately on click, swapping or prefixing a spinner while keeping button width stable.
- **Code Pattern**:
  ```html
  <button
    type="submit"
    :disabled="isSubmitting"
    :aria-busy="isSubmitting"
    class="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-60"
  >
    <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
    <span>{{ isSubmitting ? 'Saving…' : 'Save changes' }}</span>
  </button>
  ```

### 7. Hover States
> **Goal**: *Signal interactivity clearly on pointer devices without causing sticky states on touchscreens.*
- **Requirements**:
  - Gate hover transformations with `@media (hover: hover) and (pointer: fine)` so mobile taps don't leave buttons stuck in a hover state.
  - Always pair `:hover` with `:focus-visible` for keyboard users.
- **Code Pattern**:
  ```css
  .interactive-card {
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                border-color 180ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .interactive-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-accent);
    }
  }

  .interactive-card:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  ```

### 8. Scroll Progress Bars
> **Goal**: *Visualize reading completion on articles, documentation, and long landing pages.*
- **Requirements**:
  - Render a `2px–3px` bar pinned to the top of the viewport (`fixed top-0 left-0 right-0 z-50`).
  - Animate via GPU-composited `transform: scaleX(var(--progress))` with `transform-origin: left` (or native CSS `animation-timeline: scroll()`).
- **Code Pattern**:
  ```css
  .scroll-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--color-accent);
    transform-origin: 0 50%;
    animation: grow-progress linear;
    animation-timeline: scroll(root block);
    z-index: 50;
  }

  @keyframes grow-progress {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  ```

### 9. Copy-to-Clipboard Buttons
> **Goal**: *Let users copy code snippets, API keys, invite links, or IDs in one click with clear confirmation.*
- **Requirements**:
  - Use `navigator.clipboard.writeText(text)` with error handling.
  - Swap the icon/label to a checkmark ("Copied") for `2000ms` and announce the state change via an `aria-live="polite"` region.
- **Code Pattern**:
  ```html
  <button
    type="button"
    aria-label="Copy to clipboard"
    data-copied="false"
    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
  >
    <span class="copy-label">Copy</span>
    <span class="sr-only" aria-live="polite"></span>
  </button>
  ```
  ```typescript
  async function copyToClipboard(text: string, buttonEl: HTMLButtonElement) {
    const labelEl = buttonEl.querySelector('.copy-label');
    const liveEl = buttonEl.querySelector('[aria-live]');
    try {
      await navigator.clipboard.writeText(text);
      buttonEl.dataset.copied = 'true';
      if (labelEl) labelEl.textContent = 'Copied ✓';
      if (liveEl) liveEl.textContent = 'Copied to clipboard';
      setTimeout(() => {
        buttonEl.dataset.copied = 'false';
        if (labelEl) labelEl.textContent = 'Copy';
        if (liveEl) liveEl.textContent = '';
      }, 2000);
    } catch {
      if (liveEl) liveEl.textContent = 'Failed to copy';
    }
  }
  ```

### 10. Print Stylesheet
> **Goal**: *Ensure articles, invoices, receipts, and documentation print or export to PDF cleanly.*
- **Requirements**:
  - Hide navigation bars, cookie banners, floating contact buttons, and search triggers using `.no-print`.
  - Force dark text on white backgrounds, avoid splitting cards across page boundaries (`break-inside: avoid`), and expand collapsed `<details>` elements.
- **Code Pattern**:
  ```css
  @media print {
    nav, footer, .no-print, #cookie-banner, #floating-contact, #back-to-top {
      display: none !important;
    }

    body {
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 11pt;
      line-height: 1.5;
    }

    article, pre, blockquote, table, .card {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    a[href^="http"]::after {
      content: " (" attr(href) ")";
      font-size: 0.85em;
      color: #444;
    }
  }
  ```

### 11. Sticky Headers
> **Goal**: *Keep primary navigation and primary CTA reachable while scrolling.*
- **Requirements**:
  - Use `position: sticky; top: 0; z-index: 40;` with a translucent surface and `backdrop-filter: blur(12px)`.
  - Add `scroll-margin-top: 5rem;` (matching header height) to all section headings (`h2[id], h3[id], section[id]`) so anchor links aren't obscured beneath the sticky bar.
- **Code Pattern**:
  ```css
  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(12px);
    background-color: color-mix(in srgb, var(--color-bg) 85%, transparent);
  }

  [id] {
    scroll-margin-top: 5rem;
  }
  ```

### 12. Skip-to-Content Link
> **Goal**: *Allow keyboard and screen-reader users to bypass repetitive header navigation immediately.*
- **Requirements**:
  - Must be the **first focusable element** inside `<body>`.
  - Visually hidden by default (`sr-only`), becoming prominently visible when focused (`focus:not-sr-only`).
  - Target `<main id="main-content" tabindex="-1">`.
- **Code Pattern**:
  ```html
  <body>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-white focus:shadow-lg"
    >
      Skip to main content
    </a>
    <header>...</header>
    <main id="main-content" tabindex="-1">...</main>
  </body>
  ```

### 13. Password Visibility Toggle
> **Goal**: *Prevent authentication friction by letting users inspect typed passwords.*
- **Requirements**:
  - Toggle `<input>` between `type="password"` and `type="text"`.
  - Use `<button type="button">` (so pressing Enter in the form doesn't trigger the toggle) with `aria-label="Show password"` / `"Hide password"` and `aria-pressed="true|false"`.
- **Code Pattern**:
  ```html
  <div class="relative">
    <input
      id="user-password"
      :type="showPassword ? 'text' : 'password'"
      autocomplete="current-password"
      class="w-full rounded-lg border py-2 pl-3 pr-11"
    />
    <button
      type="button"
      @click="showPassword = !showPassword"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
      :aria-pressed="showPassword"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-foreground"
    >
      {{ showPassword ? 'Hide' : 'Show' }}
    </button>
  </div>
  ```

### 14. UTM Tracking
> **Goal**: *Preserve marketing attribution parameters from landing through signup or checkout.*
- **Requirements**:
  - On initial page load, capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, and `ref` from `window.location.search`.
  - Store in `sessionStorage` (and optionally first-touch in `localStorage`) so attribution survives internal page navigation before form submission.
- **Code Pattern**:
  ```typescript
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'] as const;

  export function captureUtmParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(sessionStorage.getItem('utm_attribution') || '{}');
    } catch {
      stored = {};
    }

    for (const key of UTM_KEYS) {
      const val = params.get(key);
      if (val) stored[key] = val;
    }

    if (Object.keys(stored).length > 0) {
      sessionStorage.setItem('utm_attribution', JSON.stringify(stored));
    }
    return stored;
  }
  ```

### 15. Form Success State
> **Goal**: *Confirm form completion calmly and clearly with specific next steps.*
- **Requirements**:
  - Never use `window.alert()`. Replace the form or show an inline banner with `role="status"` and `aria-live="polite"`.
  - State specifically what happened and when to expect the next action (e.g., *"Message received. We'll reply to alex@example.com within 1 business day."*).
- **Code Pattern**:
  ```html
  <div
    v-if="status === 'success'"
    role="status"
    aria-live="polite"
    class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5"
  >
    <h3 class="font-semibold text-emerald-400">Request received</h3>
    <p class="mt-1 text-sm text-muted">
      We sent a confirmation to <strong>{{ submittedEmail }}</strong>.
    </p>
  </div>
  ```

### 16. Form Error State
> **Goal**: *Help users fix validation or server errors quickly without re-typing their input.*
- **Requirements**:
  - **Never clear user inputs on error.**
  - Mark failing inputs with `aria-invalid="true"` and link them to their error message via `aria-describedby`.
  - State what went wrong and how to fix it (e.g., *"Enter a valid work email address, like name@company.com"*).
- **Code Pattern**:
  ```html
  <div>
    <label for="email-input" class="block text-sm font-medium">Email address</label>
    <input
      id="email-input"
      type="email"
      v-model="email"
      :aria-invalid="Boolean(emailError)"
      :aria-describedby="emailError ? 'email-error' : undefined"
      class="mt-1 w-full rounded-lg border px-3 py-2 aria-[invalid=true]:border-red-500"
    />
    <p v-if="emailError" id="email-error" role="alert" class="mt-1.5 text-xs text-red-400">
      {{ emailError }}
    </p>
  </div>
  ```

### 17. Confirmation Modals
> **Goal**: *Prevent accidental data loss on destructive or irreversible actions.*
- **Requirements**:
  - Trigger only for high-stakes actions (delete account, revoke API key, discard unsaved work).
  - Name the exact resource being affected and label the confirm button with the specific verb (**"Delete project"**, never a vague **"Yes"** or **"OK"**).
- **Code Pattern**:
  ```html
  <dialog id="confirm-delete" aria-labelledby="confirm-title" class="max-w-md rounded-2xl border bg-surface p-6">
    <h2 id="confirm-title" class="text-lg font-semibold">Delete "{{ projectName }}"?</h2>
    <p class="mt-2 text-sm text-muted">
      This permanently removes all transactions and backups. This action cannot be undone.
    </p>
    <div class="mt-6 flex justify-end gap-3">
      <button type="button" @click="closeModal" class="rounded-lg border px-4 py-2 text-sm font-medium">
        Cancel
      </button>
      <button type="button" @click="confirmDelete" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
        Delete project
      </button>
    </div>
  </dialog>
  ```

### 18. Last Updated Dates
> **Goal**: *Build trust and clarity on documentation, changelogs, blog posts, and legal policies.*
- **Requirements**:
  - Wrap the date in a semantic `<time datetime="YYYY-MM-DD">` element so search engines and assistive technologies parse it accurately.
- **Code Pattern**:
  ```html
  <p class="text-xs text-muted">
    Last updated <time datetime="2026-11-25">November 25, 2026</time>
  </p>
  ```

### 19. Expandable FAQ Sections
> **Goal**: *Answer buyer and user objections concisely using progressive disclosure.*
- **Requirements**:
  - Use semantic `<details>` and `<summary>` elements (or an accessible `<button aria-expanded>` accordion).
  - Add `FAQPage` JSON-LD schema markup when indexing for search / AEO.
- **Code Pattern**:
  ```html
  <section aria-labelledby="faq-heading" class="mx-auto max-w-2xl divide-y">
    <h2 id="faq-heading" class="pb-4 text-2xl font-semibold">Frequently asked questions</h2>
    <details class="group py-4">
      <summary class="flex cursor-pointer list-none items-center justify-between font-medium">
        <span>Can I export my data at any time?</span>
        <span class="transition-transform duration-200 group-open:rotate-180">↓</span>
      </summary>
      <p class="mt-3 text-sm leading-relaxed text-muted">
        Yes. Export your full ledger as CSV or JSON from Settings in one click.
      </p>
    </details>
  </section>
  ```

### 20. Floating Contact Button
> **Goal**: *Provide persistent access to support, feedback, or contact options without cluttering the content.*
- **Requirements**:
  - Position fixed at bottom-right (`bottom: max(1.25rem, env(safe-area-inset-bottom))`), coordinated with the back-to-top button and cookie banner so floating elements never overlap.
  - Hide in `@media print`.
- **Code Pattern**:
  ```html
  <div
    id="floating-contact"
    class="no-print fixed right-5 z-40"
    style="bottom: max(1.25rem, env(safe-area-inset-bottom));"
  >
    <button
      type="button"
      aria-label="Contact support"
      aria-haspopup="dialog"
      class="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-4 font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <span>💬</span>
      <span class="text-sm">Help</span>
    </button>
  </div>
  ```

---

## Complete Website Audit Checklist

Use this checklist when building a new site or auditing an existing one:

### Navigation & Wayfinding
- [ ] **11. Sticky Header**: Remains visible on scroll with `backdrop-filter: blur()` and `[id] { scroll-margin-top }` set.
- [ ] **12. Skip-to-Content Link**: First focusable DOM element, jumps cleanly to `<main id="main-content">`.
- [ ] **5. Mobile Menu**: `<button aria-expanded>`, locks background scroll, closes on `Escape` and route change.
- [ ] **3. Full Site Search**: Triggered via UI button and `Cmd/Ctrl + K`, supports full keyboard navigation.
- [ ] **4. Scroll Back-to-Top**: Appears only after scrolling past `400px`, honors `prefers-reduced-motion`.
- [ ] **8. Scroll Progress Bar**: Smooth GPU-composited top indicator on long articles or guides.

### Theme, Feedback & Micro-Interactions
- [ ] **1. Dark Mode Toggle**: Synchronous `<head>` script prevents FOUC; respects system preference and `localStorage`.
- [ ] **6. Loading Animations**: Layout-matched skeletons prevent CLS; async buttons disable and set `aria-busy="true"`.
- [ ] **7. Hover States**: Scoped to `@media (hover: hover)` with matching `:focus-visible` outlines.
- [ ] **9. Copy-to-Clipboard**: 2-second checkmark confirmation with `aria-live="polite"` announcement.
- [ ] **17. Confirmation Modals**: Destructive actions require confirmation with specific verb labels.

### Forms, Conversion & Compliance
- [ ] **13. Password Visibility Toggle**: `type="button"` toggles `password`/`text` with `aria-pressed`.
- [ ] **14. UTM Tracking**: Captures `utm_*` parameters on landing and persists them in `sessionStorage` for form attribution.
- [ ] **15. Form Success State**: Calm inline `role="status"` confirmation with specific next steps.
- [ ] **16. Form Error State**: Preserves user input, sets `aria-invalid="true"` + `aria-describedby` with actionable copy.
- [ ] **2. Simple Cookie Banner**: Non-blocking bottom bar with equal-weight essential/accept options.

### Content, Trust & Output
- [ ] **18. Last Updated Dates**: Semantic `<time datetime="YYYY-MM-DD">` visible on articles, docs, and policies.
- [ ] **19. Expandable FAQ Sections**: Accessible `<details>`/`<summary>` or ARIA accordion with clear answers.
- [ ] **20. Floating Contact Button**: Respects `safe-area-inset-bottom` and avoids colliding with cookie banner or back-to-top button.
- [ ] **10. Print Stylesheet**: `@media print` hides interactive chrome (`.no-print`) and prevents awkward page breaks.
