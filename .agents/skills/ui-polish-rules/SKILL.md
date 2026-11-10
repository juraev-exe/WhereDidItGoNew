---
name: ui-polish-rules
description: Use when designing, building, styling, or reviewing user interfaces, components, landing pages, or typography to eliminate visual clutter and apply standard UI craft and polish rules
---

# 20 UI Polish Rules

A reference guide for design engineering craft, visual refinement, and frontend polish. These 20 heuristics transform noisy, amateur UI into clean, intentional, and production-grade software.

---

## When to Use

Use this skill when:
- Designing or implementing new frontend components, pages, modals, or views
- Reviewing UI/UX code during pull requests or design audits
- Cleaning up cluttered, dated, or "amateur-looking" interfaces
- Refining typography, hierarchy, spacing, colors, or animations

Do NOT use for:
- Backend architecture, API design, or database schemas
- Low-level performance profiling unrelated to rendering/layout shift

---

## Quick Reference Table

| # | Rule | Core Principle | Quick Fix |
|---|---|---|---|
| 1 | **Delete filler badges** | Badges create noise when overused | Remove decorative "New", "AI", "Beta" pills unless critically actionable |
| 2 | **Drop redundant labels** | Format communicates meaning | Cut "Email:", "Price:", "Date:" prefixes; let data format speak |
| 3 | **Unitalicize random words** | Italics disrupt baseline rhythm | Use weight or rewrite copy for emphasis instead of italicizing words |
| 4 | **Mono only where needed** | Monospace harms reading rhythm | Reserve `font-mono` for code, hashes, and tokens; use sans for UI |
| 5 | **Use a design system** | Arbitrary values ruin cohesion | Restrict spacing and colors to a disciplined 4px/8px scale and semantic tokens |
| 6 | **Show the actual product** | Abstract 3D shapes build zero trust | Display real, crisp component previews, screenshots, or interactive widgets |
| 7 | **Enlarge the main feature** | Uniform grid lacks hierarchy | Make flagship capabilities 2x–3x larger than secondary features |
| 8 | **Group with spacing** | Proximity beats divider lines | Use 3x–4x more outer gap than inner gap; delete unnecessary dividing lines |
| 9 | **Make headlines specific** | Fluff copy fails to convert | Replace vague slogans with concrete, benefit-driven statements |
| 10 | **Emphasize the CTA** | Only one primary action per view | Make primary CTA prominent with solid contrast; downgrade secondary buttons |
| 11 | **Add an accent colour** | Restraint creates impact | 90% neutral background/text + 1 distinct, purposeful accent color |
| 12 | **Keep icons consistent** | Mixed icon sets look broken | Stick to one library, one stroke width (e.g. 1.75px), and uniform optical size |
| 13 | **Remove embellishments** | Content is the interface | Strip glowing borders, heavy gradients, and arbitrary floating stickers |
| 14 | **Inner radius = outer − padding** | Nested corners must be concentric | Compute `r_inner = r_outer - padding` to prevent awkward corner pinching |
| 15 | **Improve text contrast** | Accessibility is non-negotiable | Aim for ≥4.5:1 on secondary text and ≥7:1 on body text; avoid washed-out grays |
| 16 | **Wrap headlines properly** | Avoid widows and awkward breaks | Use `text-wrap: balance` or `text-wrap: pretty` on all headings |
| 17 | **Align by eye, not pixels** | Optical center ≠ bounding box center | Nudge asymmetric icons (e.g. Play) and badges 1–2px for visual balance |
| 18 | **Use tabular nums** | Numbers must not wobble on change | Apply `font-variant-numeric: tabular-nums` to financial data, counters, and timers |
| 19 | **Add loading states** | Instant visual response on click | Disable and show spinner on buttons; use skeletons matching layout to prevent CLS |
| 20 | **Animate useful feedback** | Motion explains state transitions | Use swift micro-interactions (150–200ms) for press feedback and state shifts |

---

## The 20 Rules: Detailed Guidance & Code Patterns

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

## Code Review Checklist

Run through this checklist when auditing any component or screen:
- [ ] No decorative or meaningless badges
- [ ] No redundant "Label:" prefixes on self-evident values
- [ ] No random italicized words in titles
- [ ] Monospace font reserved exclusively for code/tokens
- [ ] All spacing and colors map to design tokens
- [ ] Real UI shown instead of abstract placeholders
- [ ] Key flagship feature given prominent visual scale
- [ ] Spacing used for grouping; unneeded borders removed
- [ ] Headings are concrete and specific
- [ ] Exactly one high-contrast primary CTA per view
- [ ] Disciplined neutral palette with 1 purposeful accent
- [ ] Icon library, stroke width, and optical size are uniform
- [ ] Distracting gradients and glowing shadows removed
- [ ] Nested border radii adhere to `inner = outer - padding`
- [ ] Text contrast meets WCAG AA (≥4.5:1 secondary, ≥7:1 body)
- [ ] `text-wrap: balance` or `pretty` applied to headlines
- [ ] Asymmetrical icons (play buttons, chevrons) optically aligned
- [ ] `tabular-nums` enabled on all currencies, timers, and metrics
- [ ] Buttons and async actions provide instant loading states
- [ ] Transitions are subtle (120–200ms) and indicate true state changes

