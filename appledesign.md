# Apple Design Engineering System

> Crafted for **WhereDidItGo** following Apple Human Interface Guidelines (HIG), iOS 17/18 spatial aesthetics, Apple Wallet tactile simplicity, and Emil Kowalski's design engineering philosophy.

---

## 1. Core Principles

### 1.1 Tactile Realism & High Vibrancy
- **No generic flat surfaces**: Surfaces use Apple's ultra-thin material blur (`backdrop-filter: blur(28px) saturate(180%)`) with 1px hairline perimeter borders.
- **Physical spring physics**: Buttons and interactive controls depress by `scale(0.96)` on touch with snappy 150ms spring returns.
- **True Inset Grouping**: Cards use iOS-style squircle radii (`16px`–`22px`) with subtle edge highlights.

---

## 2. Color Architecture & Palettes

| Token | Light Mode (System Light) | Dark Mode (System Dark) | OLED Mode (Pitch Black) |
| :--- | :--- | :--- | :--- |
| **`--color-background`** | `#f2f2f7` (iOS Grouped Bg) | `#000000` (iOS System Bg) | `#000000` (100% True Black) |
| **`--color-surface`** | `#ffffff` (Secondary Grouped) | `#1c1c1e` (System Gray 6) | `#0a0a0c` (OLED Card Surface) |
| **`--color-surface-container`** | `#e5e5ea` (System Gray 5) | `#2c2c2e` (Elevated Container) | `#151518` (Subtle Tint) |
| **`--color-outline`** | `rgba(0, 0, 0, 0.12)` | `rgba(255, 255, 255, 0.14)` | `rgba(255, 255, 255, 0.16)` |
| **`--color-outline-variant`** | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.08)` | `rgba(255, 255, 255, 0.10)` |
| **`--color-primary`** | `#007aff` (Apple Blue) | `#0a84ff` (Apple Blue Dark) | `#0a84ff` (Luminous Blue) |
| **`--color-income`** | `#34c759` (Apple Green) | `#30d158` (Apple Green Dark) | `#30d158` |
| **`--color-expense`** | `#ff3b30` (Apple Red) | `#ff453a` (Apple Red Dark) | `#ff453a` |
| **`--color-transfer`** | `#5856d6` (Apple Indigo) | `#5e5ce6` (Apple Indigo Dark) | `#5e5ce6` |

---

## 3. Typography & Numerical Layout

- **Font Family**: `-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Text", "SF Pro Display", system-ui, sans-serif`
- **Tabular Numerals**: All balances, transaction amounts, and keypad inputs enforce `font-variant-numeric: tabular-nums; font-feature-settings: "tnum";` to eliminate column jitter when numbers change.
- **Tracking & Leading**:
  - Titles: `letter-spacing: -0.022em; font-weight: 700;`
  - Secondary Labels: `font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted);`

---

## 4. Component Standards

### 4.1 Inset Grouped Cards
```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg); /* 22px */
  border: 1px solid var(--color-outline);
  box-shadow: var(--shadow-sm);
}
```

### 4.2 Floating Glass Dock (Bottom Navigation)
```css
.nav {
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  border: 1px solid var(--color-outline);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
}
```

### 4.3 Interactive Touch States
```css
.button:active,
.tab:active,
.card-pressable:active {
  transform: scale(0.96);
  transition: transform var(--duration-fast) var(--ease-spring-snappy);
}
```

---

## 5. Motion Tokens

- `--ease-emphasized`: `cubic-bezier(0.16, 1, 0.3, 1)` (Apple standard decelerate)
- `--ease-spring-snappy`: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (Keypad and buttons)
- `--ease-bounce`: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (Modal popovers & checkmarks)
