---
name: motion-and-ux-laws
description: Use when adding, tuning, or reviewing UI animations, transitions, micro-interactions, entrance/stagger effects, tap feedback, or hit areas, or when an interface feels slow, sluggish, floaty, janky, cluttered, or overwhelming. Covers Disney's 12 animation principles adapted to UI and the Laws of UX (Fitts, Hick, Miller, Doherty, Postel, Jakob, frequency of use).
---

# Motion & UX Laws

## Overview

Twenty laws that decide whether an interface feels alive and fast or slow and noisy. Twelve are Disney's animation principles adapted to UI; eight are laws of interaction. **Core principle:** motion exists to explain what happened and where to look. If it delays the user, it's decoration, and frequent actions get the least of it.

Credits: Raphael Salaja's userinterface.wiki, Disney's *The Illusion of Life*, Jon Yablonski's *Laws of UX*, Emil Kowalski (frequency of use).

## The Budget (memorize these numbers)

| Thing | Limit |
|---|---|
| Tap/press feedback | 80–150ms |
| Standard UI transition (menus, tabs, toggles, popovers) | 150–250ms |
| Entrance / sheet / modal | ≤ 300ms |
| Stagger step between list items | 20–40ms, cap the total delay at about 150ms |
| Last item settled (delay + duration) | < 400ms (Doherty) |
| Exception: rare, celebratory, or error moments | may go to 400–600ms |
| Hit target | ≥ 44×44px, even if the visual is smaller |

## The 20 Laws

### Animation principles

| Law | Definition | Apply it as |
|---|---|---|
| **Squash & stretch** | Things squish on impact and stretch in motion, which gives them weight | Press: `scale(0.96)`. Drag/fling: small stretch along the motion axis. Keep it ≤ 4–8%. |
| **Anticipation wind-up** | A small pull back before the big move, so people see it coming | Shrink 2–4% on press *before* a sheet opens or an item flies away. |
| **Staging the focus** | Direct the eye to one thing at a time | One element animates at a time. Dim or blur the background behind a modal. No competing loops. |
| **Pose to pose** | Set the key poses and let the browser fill in the frames between | Define start/end states (CSS transitions, FLIP, View Transitions). Avoid hand-written per-frame JS. |
| **Follow through** | Parts keep moving after the main body stops, then settle | A spring with slight overshoot (`--ease-spring`). Child content settles 1 beat after its container. |
| **Slow in & slow out** | Speed up and slow down, never move at a constant speed | Never use `linear` for movement (OK for spinners/progress). Enter: ease-out. Exit: ease-in. On-screen moves: ease-in-out. |
| **Moving in arcs** | Move along curves, not straight lines | Combine X+Y with different easings, or use `offset-path`, for elements that travel far (FAB → sheet, item → cart). |
| **Secondary action** | A small flourish that backs up the main action | Checkmark draw after save, icon tick after toggle, haptic on success. Never louder than the main action. |
| **Snappy timing** | Duration sets the feel, so keep UI animations under 300ms | See The Budget. When it feels sluggish, cut the duration before you touch the easing. |
| **Exaggerated feedback** | Push it past real so the moment lands | Error shake, success pop. Reserve it for state changes the user must notice. |
| **Solid drawing in 3D** | Give flat things depth and volume | Layered shadows, subtle highlights, `perspective` on tilts, elevation that changes on press. |
| **Overall appeal** | The sum of every detail, done with care | Consistent tokens, no half-done states, `prefers-reduced-motion` respected. |

### Laws of UX

| Law | Definition | Apply it as |
|---|---|---|
| **Fitts's law** | Bigger, closer targets are faster to hit | Primary actions large and in the thumb zone (bottom). Destructive actions far from frequent ones. |
| **Bigger hit areas** | The clickable area can be bigger than it looks | Pad with transparent padding or a `::after { inset: -8px }` hitbox up to 44px. |
| **Hick's law** | More choices mean slower decisions | Show 3–5 options up front, put the rest behind "More", and pre-select a smart default. |
| **Miller's law** | We hold about 7 things in mind at once, so chunk information | Group lists by date/category. Format numbers (`1 234 567`, card `•••• 4242`). Keep sections ≤ 7 items. |
| **Doherty threshold** | Respond within 400ms or it feels slow | Instant visual ack (<100ms), optimistic updates, skeletons. **Animation delay counts toward this.** |
| **Postel's law** | Accept messy input, give back clean output | Parse `1,5` / `1.5` / `1 500`, trim whitespace, tolerate date formats, then display normalized. |
| **Jakob's law** | People expect your app to work like the apps they already use | Platform-standard gestures (swipe-to-delete, pull-to-refresh, back-swipe), standard icon meanings. |
| **Frequency of use** | The more often something is used, the less it should animate | Tab switches, list renders, and typing get ≤ 150ms or none. Onboarding and celebrations can be theatrical. |

## Audit Procedure

Use this when reviewing or "applying the laws" to an existing UI:

1. **Inventory motion.** Grep for `transition`, `animation`, `@keyframes`, `animation-delay`, duration tokens, and JS animation calls.
2. **Rank by frequency.** Mark each motion as *every-visit* (nav, lists, home screen), *occasional* (sheets, forms), or *rare* (onboarding, celebrations, errors).
3. **Compute settle time** = delay + duration for the *last* element of each staggered group. Anything on an every-visit screen > 400ms is a Doherty violation.
4. **Check the budget.** Fix tokens first (one token edit fixes dozens of call sites), then outliers.
5. **Check curves.** `linear` on movement → ease. `ease` everywhere → use the project's semantic easings.
6. **Check targets.** Interactive elements < 44px need a hit-area expansion.
7. **Check reduced motion.** A global `prefers-reduced-motion` override must exist.
8. **Report** a table: law → violation → file:line → fix.

## Common Mistakes

| Mistake | Fix |
|---|---|
| A 500ms "entrance" token used on every screen | Entrance ≤ 300ms. Long entrances only on first-run screens. |
| Stagger delays like `nth-child(n) { delay: n*60ms }` up to 400ms+ | 20–40ms steps, total capped around 150ms. Items past ~6 share the last delay. |
| A primary button (FAB) that appears with a delay | Primary actions are visible immediately. Fitts plus Doherty beat flourish. |
| A big bouncy pop on every tab switch | Frequency of use: subtle scale (≤ 1.06), ≤ 200ms. |
| Infinite loops (`pulse`, `float`) on several elements | Staging: at most one ambient loop per screen, ideally none. |
| `transition: all` | List explicit properties. `all` animates layout and colors you didn't intend. |
| Animating `width`/`height`/`top` for movement | Animate `transform` and `opacity`. Use `scaleX` for progress bars when possible. |
| Treating the budget as optional for "just a small delay" | Delays add up across a screen. Measure the settle time of the last element. |
