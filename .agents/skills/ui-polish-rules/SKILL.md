---
name: ui-polish-rules
description: Use when designing, building, styling, or reviewing user interfaces, components, landing pages, or typography to eliminate visual clutter and apply standard UI craft, 20 polish rules, and 20 design engineering terms
---

# UI Polish & Design Engineering Standards

A comprehensive, production-grade guide for frontend design engineering, typographic precision, and visual craft. This guide pairs **The 20 UI Polish Rules** (actionable heuristics to de-clutter interfaces) with **The 20 Core Design Engineering Terms** (the underlying typography, layout, motion physics, and ergonomics).

---

## Quick Reference: The 20 Terms & Definitions

| # | Term | On-Screen Definition | Implementation / CSS / Token |
|---|---|---|---|
| 1 | **Kerning** | Spacing between a pair of letters | `font-kerning: normal;` / OpenType `kern` feature |
| 2 | **Optical centre** | Centred by eye, not by math | Nudge asymmetric elements 1–2px past bounding box center |
| 3 | **Tabular numbers** | Every digit is the same width | `font-variant-numeric: tabular-nums;` (Tailwind: `tabular-nums`) |
| 4 | **Layout shift** | Content jumping as things load | Reserve dimensions: `aspect-ratio`, `min-height`, layout-matched skeletons |
| 5 | **Tracking** | Even spacing across every letter | `letter-spacing: -0.02em;` (headings) / `+0.05em;` (small caps) |
| 6 | **Optimistic update** | Show the result before the server confirms | Mutate local UI cache immediately, rollback on network rejection |
| 7 | **x-height** | How tall the lowercase letters are | Factor in font choice (`Inter`, `Geist`, `SF Pro` have tall x-heights for UI) |
| 8 | **Touch target** | The tappable area, not just the icon | Minimum 44×44px or 48×48px via invisible padding or `::after` hitbox |
| 9 | **Leading** | The space between lines of text | `line-height`: `1.1–1.2` for display titles; `1.4–1.6` for long-form prose |
| 10 | **Origin-aware animation** | Animates out of what you clicked | Dynamic `transform-origin` set to click/trigger bounding rect coordinates |
| 11 | **OKLCH** | Colour where equal lightness looks equal | `oklch(L C H)` for perceptually uniform palettes and smooth hue gradients |
| 12 | **Widow** | One word alone on the last line | `text-wrap: pretty;` or `text-wrap: balance;` on headings and paragraphs |
| 13 | **Safe area** | Screen area clear of the notch and home bar | `padding-bottom: env(safe-area-inset-bottom, 16px);` |
| 14 | **Stagger** | Items animate one after another | Cumulative transition delays (e.g. `transition-delay: calc(var(--i) * 35ms)`) |
| 15 | **Line length** | About 65 characters per line reads best | `max-width: 65ch;` (Tailwind: `max-w-prose`) to avoid reading fatigue |
| 16 | **Affordance** | A visual cue for how to use something | Raised borders, drop shadows, hover states, grab cursors, chevron cues |
| 17 | **Combobox** | A text field that filters a list | Accessible `<input role="combobox">` + dropdown filter list + keyboard nav |
| 18 | **Interruptible animation** | Can change course mid-animation | Velocity-preserving springs (`framer-motion`, `reanimated`, spring CSS) |
| 19 | **Progressive disclosure** | Show more only when it's needed | Primary defaults shown first; details in accordions, drawers, or dialogs |
| 20 | **Shared element transition** | One element grows into the next view | View Transitions API (`view-transition-name`) or FLIP layout morphing |

---

## Quick Reference: The 20 UI Polish Rules

| # | Rule | Core Heuristic | Action |
|---|---|---|---|
| 1 | **Delete filler badges** | Badges create noise when overused | Strip non-actionable "New", "AI", "Feature" pills |
| 2 | **Drop redundant labels** | Format communicates identity | Remove "Price:", "Date:", "Email:" prefixes |
| 3 | **Unitalicize random words** | Italics disrupt typographic rhythm | Use weight or copy structure for emphasis |
| 4 | **Mono only where needed** | Monospace degrades reading speed | Restrict mono to code, hashes, and API tokens |
| 5 | **Use a design system** | Arbitrary values ruin cohesion | Enforce 4px/8px spatial rhythm and semantic tokens |
| 6 | **Show the actual product** | Abstract 3D shapes build zero trust | Render real UI previews, charts, and interactive widgets |
| 7 | **Enlarge the main feature** | Flat grids lack visual weight | Make flagship capabilities 2×–3× larger in bento layouts |
| 8 | **Group with spacing** | Proximity beats divider lines | Use 3×–4× greater outer gap than inner gap; cut borders |
| 9 | **Make headlines specific** | Fluff copy fails to convert | Swap vague slogans for concrete, verifiable claims |
| 10 | **Emphasize the CTA** | Exactly one primary action per view | Single dominant accent button; subordinate all others |
| 11 | **Add an accent colour** | Restraint creates maximum impact | 90% neutral canvas + 1 deliberate accent for key actions |
| 12 | **Keep icons consistent** | Mixed icon sets feel fragmented | Single library, uniform stroke width (e.g. 1.75px), matched sizing |
| 13 | **Remove embellishments** | Content is the interface | Strip glowing neon borders, heavy skeuomorphism, and floating blobs |
| 14 | **Inner radius = outer − padding** | Concentric container geometry | Always calculate `r_inner = r_outer - padding` |
| 15 | **Improve text contrast** | Accessibility is mandatory | Aim for ≥4.5:1 on secondary text, ≥7:1 on body text |
| 16 | **Wrap headlines properly** | Avoid orphan words | Apply `text-wrap: balance` to headings, `pretty` to copy |
| 17 | **Align by eye, not pixels** | Bounding box ≠ optical center | Nudge asymmetric icons (play button, chevron) 1–2px |
| 18 | **Use tabular nums** | Changing numbers must not jitter | Apply `font-variant-numeric: tabular-nums` to financial data |
| 19 | **Add loading states** | Instant visual response | Immediate button loading state + layout-matched skeleton |
| 20 | **Animate useful feedback** | Motion explains physical state changes | Swift micro-interactions (120–200ms) on tap, toggle, and delete |

---

## Detailed Breakdown: The 20 Core Terms

### 1. Kerning
> **Definition**: *Spacing between a pair of letters.*
- **Problem**: Certain letter pairings (e.g. `AV`, `Wa`, `To`, `Yo`) leave awkward whitespace or collide if kerning tables are disabled.
- **Code Pattern**:
  ```css
  /* Ensure full font kerning pairs are active */
  body, h1, h2, h3, button {
    font-kerning: normal;
    text-rendering: optimizeLegibility;
    font-feature-settings: "kern" 1;
  }
  ```

### 2. Optical Centre
> **Definition**: *Centred by eye, not by math.*
- **Problem**: Mathematical centering positions an element according to its rectangular bounding box. Asymmetric shapes (like a triangle play icon `▶`, a heart, or capitalized badges) carry uneven visual weight and look noticeably off-center.
- **Code Pattern**:
  ```css
  /* Play button icon in a circular container */
  .play-circle {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .play-circle svg {
    /* Nudge right by 1.5px to align center of visual mass */
    transform: translateX(1.5px);
  }
  ```

### 3. Tabular Numbers
> **Definition**: *Every digit is the same width.*
- **Problem**: Proportional numbers give `1` a narrow width and `8` a wide width. When numbers change (stopwatches, stock prices, account balances, live tickers), the text horizontally wobbles.
- **Code Pattern**:
  ```css
  .currency-amount,
  .metric-counter,
  .timestamp,
  table td.numeric {
    font-variant-numeric: tabular-nums;
    /* Tailwind equivalent */
    /* @apply tabular-nums; */
  }
  ```

### 4. Layout Shift (CLS)
> **Definition**: *Content jumping as things load.*
- **Problem**: Images, ads, lazy-loaded components, or fonts pop in and push existing content down, causing mis-clicks and high Cumulative Layout Shift scores.
- **Code Pattern**:
  ```html
  <!-- Always reserve aspect ratio and minimum heights -->
  <div class="aspect-video w-full bg-surface-muted rounded-xl">
    <img src="/chart.png" alt="Analytics" class="h-full w-full object-cover" />
  </div>

  <!-- Skeletons must mirror final container dimensions -->
  <div v-if="loading" class="h-10 w-32 animate-pulse bg-surface-muted rounded-lg" />
  ```

### 5. Tracking
> **Definition**: *Even spacing across every letter.*
- **Problem**: Large headings feel loose and detached at default letter spacing; tiny uppercase labels become illegible if letters are cramped together.
- **Code Pattern**:
  ```css
  /* Tight tracking for bold display headlines */
  h1, .display-title {
    letter-spacing: -0.025em; /* Tailwind: tracking-tight */
  }

  /* Wide tracking for all-caps metadata and micro-labels */
  .label-caps {
    text-transform: uppercase;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em; /* Tailwind: tracking-wider */
  }
  ```

### 6. Optimistic Update
> **Definition**: *Show the result before the server confirms.*
- **Problem**: Waiting for a network roundtrip (200–800ms) before toggling a favorite icon, marking a task complete, or adding a transaction feels laggy and sluggish.
- **Code Pattern**:
  ```typescript
  async function toggleFavorite(item: Item) {
    const previousState = item.isFavorite
    // 1. Optimistic mutation
    item.isFavorite = !previousState
    try {
      await api.updateFavorite(item.id, item.isFavorite)
    } catch (err) {
      // 2. Rollback upon failure
      item.isFavorite = previousState
      showToast({ message: "Could not save change", type: "error" })
    }
  }
  ```

### 7. x-height
> **Definition**: *How tall the lowercase letters are.*
- **Problem**: Fonts with low x-heights (like Futura or Didot) look tiny and require much larger font sizes to be readable in software interfaces. Modern UI fonts (Inter, Geist, SF Pro) feature high x-heights for optimal density and legibility.
- **Heuristic**: When selecting UI typefaces, evaluate the lowercase `x` relative to uppercase `H`. A ~70% ratio maximizes legibility across mobile displays.

### 8. Touch Target
> **Definition**: *The tappable area, not just the icon.*
- **Problem**: A 16px icon button has a 16×16px hitbox, frustrating users and causing missed taps on mobile or touchscreens.
- **Code Pattern**:
  ```css
  /* Icon is visually 18px, but touch hitbox is 44×44px minimum */
  .icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }
  .icon-button::after {
    content: '';
    position: absolute;
    inset: -6px; /* Expands interactive hit-target to 44px */
    min-width: 44px;
    min-height: 44px;
  }
  ```

### 9. Leading
> **Definition**: *The space between lines of text.*
- **Problem**: Body copy with insufficient leading looks dense and intimidates readers; oversized leading in headings makes lines look disconnected.
- **Code Pattern**:
  ```css
  /* Tight leading for large headings */
  h1, h2 {
    line-height: 1.15; /* 115% */
  }

  /* Relaxed, comfortable leading for reading body paragraphs */
  p, .prose {
    line-height: 1.6; /* 160% */
  }
  ```

### 10. Origin-Aware Animation
> **Definition**: *Animates out of what you clicked.*
- **Problem**: Modals and dropdowns popping open from the center of the viewport disconnect the effect from the trigger element.
- **Code Pattern**:
  ```typescript
  function openPopover(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    // Position floating panel relative to trigger rect
    popoverStyle.transformOrigin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`
    isOpen.value = true
  }
  ```

### 11. OKLCH Color Space
> **Definition**: *Colour where equal lightness looks equal.*
- **Problem**: In sRGB and HSL, yellow at `L=70%` looks blindingly bright, while blue at `L=70%` looks dark. In OKLCH, lightness is perceptually uniform across all hues, guaranteeing consistent accessibility contrast ratios.
- **Code Pattern**:
  ```css
  :root {
    /* Perceptually uniform shades */
    --color-surface: oklch(0.20 0.015 250);
    --color-surface-hover: oklch(0.25 0.020 250);
    --color-accent: oklch(0.68 0.17 155);       /* Emerald */
    --color-accent-hover: oklch(0.72 0.18 155);
  }
  ```

### 12. Widow
> **Definition**: *One word alone on the last line.*
- **Problem**: An orphan word trailing alone on the final line of a title looks visually unbalanced.
- **Code Pattern**:
  ```css
  /* Modern CSS text-wrap prevents widows automatically */
  h1, h2, h3, h4 {
    text-wrap: balance;
  }

  p {
    text-wrap: pretty; /* Prevents trailing single word in paragraphs */
  }
  ```

### 13. Safe Area
> **Definition**: *Screen area clear of the notch and home bar.*
- **Problem**: Fixed bottom buttons or headers get covered by the iOS Home Indicator bar or camera notch.
- **Code Pattern**:
  ```css
  .bottom-bar {
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
  ```

### 14. Stagger
> **Definition**: *Items animate one after another.*
- **Problem**: When a 10-item list appears all at once, the motion feels sudden and flat.
- **Code Pattern**:
  ```css
  .list-item {
    opacity: 0;
    transform: translateY(8px);
    animation: enterFade 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: calc(var(--index) * 35ms);
  }
  ```

### 15. Line Length
> **Definition**: *About 65 characters per line reads best.*
- **Problem**: Text that spans 1200px across a wide screen forces the reader's eyes to travel excessively, losing their place between lines.
- **Code Pattern**:
  ```css
  .article-body, p.description {
    max-width: 65ch; /* 65 characters maximum */
  }
  ```

### 16. Affordance
> **Definition**: *A visual cue for how to use something.*
- **Problem**: Plain text that acts as a button without elevation, border, underline, or hover state confuses users.
- **Heuristic**:
  - Interactive elements must announce their affordance: subtle elevation (`shadow-sm`), clear border contrast, cursor changes (`cursor-pointer`), and visible press states.
  - Draggable elements must include grip handles (`⋮⋮`).

### 17. Combobox
> **Definition**: *A text field that filters a list.*
- **Problem**: Native `<select>` inputs cannot be searched on long lists (such as currency codes or countries). A Combobox blends a text input with an instant filtered list.
- **Key Requirements**:
  - Highlights matched substrings in results.
  - Supports full keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).
  - Sets appropriate ARIA attributes: `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`.

### 18. Interruptible Animation
> **Definition**: *Can change course mid-animation.*
- **Problem**: If a user taps a drawer open and immediately swipes it down, static CSS animations lock up or jump abruptly to the start.
- **Solution**: Use spring physics (`damping`, `stiffness`) or cancelable transitions that carry momentum seamlessly when interrupted.
  ```css
  /* Use spring-like cubic beziers for snappy interruption */
  .interactive-drawer {
    transition: transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
  }
  ```

### 19. Progressive Disclosure
> **Definition**: *Show more only when it's needed.*
- **Problem**: Overwhelming the user with 40 input fields or settings on a single screen creates cognitive paralysis.
- **Solution**: Present the essential 20% by default; reveal advanced options (e.g. "Advanced Settings", "More Filters", multi-step wizards) only upon user request.

### 20. Shared Element Transition
> **Definition**: *One element grows into the next view.*
- **Problem**: Clicking a thumbnail card and having the entire screen flash to a new page breaks spatial continuity.
- **Code Pattern**:
  ```css
  /* Using standard View Transitions API */
  .card-thumbnail {
    view-transition-name: active-product-image;
  }

  .detail-hero-image {
    view-transition-name: active-product-image;
  }
  ```

---

## Detailed Breakdown: The 20 UI Polish Rules

### 1. Delete filler badges
Badges should communicate urgent status (e.g. "Failed", "Pending", "Overdue"), not decorate headlines. If every card has an "AI", "Popular", or "Feature" pill, nothing stands out.
```html
<!-- ❌ Before: Visual clutter and diluted attention -->
<div class="card">
  <span class="badge">🔥 NEW</span>
  <span class="badge">AI POWERED</span>
  <h3>Smart Cashflow Insights</h3>
</div>

<!-- ✅ After: Focused, clear, confident -->
<div class="card">
  <h3>Smart Cashflow Insights</h3>
</div>
```

### 2. Drop redundant labels
If the content's shape makes its identity obvious, delete the label. Users know `$49.00` is a price, `@user` is a handle, and `Oct 24, 2026` is a date.
```html
<!-- ❌ Before: Cluttered with unnecessary labels -->
<p><span class="label">Balance:</span> $12,450.00</p>
<p><span class="label">Email:</span> alex@example.com</p>

<!-- ✅ After: Formatting communicates meaning instantly -->
<p class="text-3xl font-bold tracking-tight">$12,450.00</p>
<p class="text-sm text-muted">alex@example.com</p>
```

### 3. Unitalicize random words
Italicizing arbitrary words in titles disrupts typographic rhythm and gives marketing copy a dated, gimmicky tone.
```html
<!-- ❌ Before -->
<h2>The <em>fastest</em> way to manage your <em>daily</em> expenses</h2>

<!-- ✅ After -->
<h2>The fastest way to manage your daily expenses</h2>
```

### 4. Mono only where needed
Monospace fonts have uneven letter spacing and lower readability for long-form prose. Keep them strictly for code snippets, API keys, terminal output, or transaction hashes.
```css
/* ❌ Before: Monospace applied to UI elements */
.card-header, .stat-label, .btn { font-family: monospace; }

/* ✅ After: Clean sans-serif for UI; mono scoped to code/hashes */
body, button, input { font-family: var(--font-sans); }
code, pre, .hash-key { font-family: var(--font-mono); }
```

### 5. Use a design system
Ban arbitrary pixel values. Constrain all spacing, typography, and colors to structured design tokens.
```css
/* ❌ Before: Random magic numbers */
.card { margin-top: 13px; padding: 19px; border-radius: 9px; }

/* ✅ After: Disciplined 4px/8px token scale */
.card {
  margin-top: var(--space-3); /* 12px */
  padding: var(--space-4);    /* 16px */
  border-radius: var(--radius-md); /* 12px */
}
```

### 6. Show the actual product
Ditch generic 3D illustrations, waving avatar cutouts, and abstract decorative blobs. Show real UI components, interactive tables, charts, or live previews of your app.

### 7. Enlarge the main feature
Visual hierarchy requires asymmetry. Give your flagship capability twice the visual weight of secondary features using a bento-style layout.
```html
<!-- ✅ Hero feature dominates; minor items support -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div class="md:col-span-2 p-6 bg-surface rounded-2xl">
    <!-- Flagship interactive visual / chart -->
  </div>
  <div class="p-6 bg-surface rounded-2xl">
    <!-- Secondary supporting feature -->
  </div>
</div>
```

### 8. Group with spacing
Use Gestalt proximity instead of surrounding everything with borders and gray boxes. Elements belonging together should have tight spacing; unrelated sections should have generous spacing.
```css
/* ✅ Space between unrelated sections is 3x-4x larger than inner element spacing */
.section { gap: var(--space-8); }     /* 32px between sections */
.item-group { gap: var(--space-2); }  /* 8px between label & input */
```

### 9. Make headlines specific
Avoid empty buzzwords ("Supercharge your workflow"). Use concrete, verifiable claims.
- ❌ *"Next-generation personal financial empowerment platform."*
- ✅ *"Track expenses across all accounts in 5 seconds without cloud lock-in."*

### 10. Emphasize the CTA
A screen should have exactly ONE primary call-to-action. Make it unmistakably dominant.
```html
<!-- ❌ Before: Competing primary styles -->
<button class="btn-primary">Buy Pro</button>
<button class="btn-primary">Learn More</button>

<!-- ✅ After: Clear primary vs secondary tier -->
<button class="btn-primary bg-accent text-white font-semibold">Unlock Pro</button>
<button class="btn-ghost text-muted hover:text-white">View Details</button>
```

### 11. Add an accent colour
A professional interface is 90% deliberate neutrals (grays, slates, deep blacks, crisp whites) and 1 distinct accent color used purposefully for primary actions and active states.
```css
:root {
  --color-bg: #0f1115;
  --color-surface: #181b21;
  --color-text: #f3f4f6;
  --color-muted: #9ca3af;
  --color-accent: #10b981; /* Single vibrant emerald accent */
}
```

### 12. Keep icons consistent
Never mix icon libraries (e.g. Feather with FontAwesome and Material Icons) or stroke weights in the same view.
```html
<!-- ✅ Uniform library (e.g. Lucide) with consistent size and stroke -->
<Wallet :size="20" :stroke-width="1.75" />
<Sliders :size="20" :stroke-width="1.75" />
<Shield :size="20" :stroke-width="1.75" />
```

### 13. Remove embellishments
Cut neon outer glows, floating gradient spheres, patterned diagonal stripes, and decorative borders. Clean borders and subtle shadows outlast trendy decorations.

### 14. Inner radius = outer − padding
When nesting rounded containers, the inner corner radius must equal the outer radius minus the intervening padding. This keeps corners perfectly concentric.
```css
/* Formula: inner_radius = outer_radius - padding */
.outer-card {
  border-radius: 16px;
  padding: 8px;
}

.inner-card {
  border-radius: 8px; /* 16px - 8px = 8px */
}
```

### 15. Improve text contrast
Ensure legible contrast against the background:
- Primary text: Minimum 7:1 ratio (e.g. pure white `#FFFFFF` on dark `#121214`)
- Secondary / muted text: Minimum 4.5:1 ratio (e.g. `#A1A1AA` on `#121214`)
- Never use washed-out `#555` or `#666` on dark backgrounds.

### 16. Wrap headlines properly
Prevent lonely "widow" words wrapping onto their own line at the end of a heading.
```css
h1, h2, h3 {
  text-wrap: balance; /* Modern browsers balance text across lines */
}

p {
  text-wrap: pretty; /* Prevents trailing single-word widows */
}
```

### 17. Align by eye, not pixels
Mathematical center often looks visually off-center due to asymmetrical mass or glyph bounding boxes.
- Play buttons (`▶`): Nudge icon right by 1px–2px so visual center aligns with the circle.
- Badges with caps: Nudge vertical alignment 1px to balance baseline height.

### 18. Use tabular nums
Proportional numerals (where `1` is thinner than `8`) cause prices, balance counts, and timestamps to shake and wobble when updated.
```css
/* ✅ Keeps numbers perfectly monospaced in width while retaining regular sans typography */
.stat-number, .currency, .timer, table td {
  font-variant-numeric: tabular-nums;
  /* Tailwind equivalent: tabular-nums */
}
```

### 19. Add loading states
Every click that triggers asynchronous work must give immediate feedback:
- Disable the button to prevent duplicate submissions.
- Replace or prefix the label with a loading spinner within 100ms.
- Use skeleton loaders matching final element dimensions to eliminate Cumulative Layout Shift (CLS).

### 20. Animate useful feedback
Animations must serve a physical or explanatory purpose (e.g. confirming a button press, sliding an open drawer, expanding an accordion).
```css
/* ✅ Snappy, physical press micro-interaction */
.btn:active {
  transform: scale(0.97);
  transition: transform 120ms cubic-bezier(0.2, 0, 0, 1);
}
```

---

## Complete Audit & Review Checklist

Use this checklist during PR reviews and design audits:

### Typography & Layout
- [ ] **Kerning**: `font-kerning: normal` enabled; no awkward letter pair collisions.
- [ ] **Tracking**: Display titles use negative tracking (`-0.02em`); micro-caps use positive tracking (`+0.05em`).
- [ ] **Leading**: Heading line-height constrained to 1.1–1.25; body copy line-height at 1.4–1.6.
- [ ] **Widows**: `text-wrap: balance` on headings; `text-wrap: pretty` on copy.
- [ ] **Line Length**: Prose capped at ~65 characters (`max-w-prose`).
- [ ] **Tabular Nums**: `tabular-nums` applied to financial amounts, metrics, timers, and tables.
- [ ] **Optical Centering**: Asymmetrical icons and capital badges nudged by eye.

### Visual Polish & Ergonomics
- [ ] **Filler Badges**: Decorative or promotional badges removed.
- [ ] **Redundant Labels**: Obvious labels ("Price:", "Date:") removed.
- [ ] **Design Tokens**: All margins, padding, and colors map strictly to tokens.
- [ ] **Concentric Radii**: Nested containers verify `r_inner = r_outer - padding`.
- [ ] **Contrast**: Body text ≥ 7:1, secondary text ≥ 4.5:1 against backgrounds.
- [ ] **Color Restraint**: 90% neutral canvas with 1 purposeful accent color (OKLCH preferred).
- [ ] **Icon Uniformity**: Uniform icon set, stroke weight, and optical container.
- [ ] **Embellishments**: Pointless glows, gradients, and diagonal textures removed.
- [ ] **Touch Target**: All interactive controls have ≥44×44px hitboxes.
- [ ] **Safe Area**: Bottom navigation and sticky footers respect `env(safe-area-inset-bottom)`.

### State, Interaction & Physics
- [ ] **Layout Shift (CLS)**: Skeletons and aspect ratios prevent jumps during loading.
- [ ] **Loading States**: Async buttons disable immediately and show spinners.
- [ ] **Optimistic Updates**: User actions reflect immediately in the UI before network resolution.
- [ ] **Affordance**: Clear hover, focus, and press cues for every clickable surface.
- [ ] **Combobox**: Searchable inputs provide keyboard navigation and ARIA roles.
- [ ] **Origin-Aware**: Popovers and menus expand from the click trigger.
- [ ] **Interruptible**: Motion transitions are physics-based and smoothly retargetable.
- [ ] **Stagger**: Multi-item list entrances use subtle 30–40ms sequential delays.
- [ ] **Progressive Disclosure**: Advanced configurations tucked into secondary views or accordions.
