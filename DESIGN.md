# DESIGN.md

Machigai Salad — Design System

## 1. Visual Theme & Atmosphere

Warm, skeuomorphic aesthetic inspired by vintage Japanese restaurant menus and laminated print materials. The entire UI evokes a tactile, handcrafted feel with beveled buttons, layered shadows, and earth-tone colors. Child-friendly and approachable — designed for kids at a family restaurant to use without hesitation.

Inspirations: 1970s-80s Japanese print shop materials, laminated diner menus, shrimp tempura packaging.

## 2. Color Palette & Roles

All colors are defined as CSS custom properties in `globals.css`.

| Variable           | Value     | Usage                                      |
| ------------------ | --------- | ------------------------------------------ |
| `--background`     | `#fff8e7` | Page background, warm cream/parchment base |
| `--foreground`     | `#3c2415` | Primary body text (deep espresso)          |
| `--surface`        | `#fffdf4` | Card backgrounds, bright off-white         |
| `--surface-hover`  | `#fff3cc` | Hover state for surfaces                   |
| `--border`         | `#d4a85a` | Standard borders, golden brown             |
| `--border-light`   | `#e8c87a` | Lighter borders                            |
| `--muted`          | `#7a5c2e` | Secondary text, dark brown                 |
| `--accent`         | `#cc6b3c` | Primary CTA, terracotta/burnt orange       |
| `--accent-hover`   | `#b85a2e` | CTA hover state                            |
| `--accent-light`   | `#fdebd8` | Light accent background                    |
| `--golden`         | `#f5c518` | Decorative stripes, focus rings, UI accent |
| `--golden-dark`    | `#d4a010` | Muted gold variant                         |
| `--olive`          | `#6b7f3e` | Success states, completed step badges      |
| `--espresso`       | `#3c2415` | Same as foreground                         |
| `--espresso-light` | `#5c3d1e` | Lighter brown for headings                 |
| `--parchment`      | `#f5e6c8` | Modal/panel backgrounds, warm beige        |
| `--error`          | `#8b3e1a` | Error text, deep rust red                  |
| `--error-bg`       | `#fff0ec` | Error toast background                     |
| `--error-border`   | `#d4885a` | Error border                               |

Semantic image comparison colors: left = `#6b7f3e` (olive), right = `#b05228` (terracotta).

## 3. Typography Rules

### Font Family

| Context | Family                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Default | `"Hiragino Kaku Gothic ProN", "Hiragino Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |

Japanese-first font stack. No secondary or monospace fonts used.

### Type Scale

| Element          | Size     | Weight | Notes                   |
| ---------------- | -------- | ------ | ----------------------- |
| Page title (h1)  | 1.25rem  | 800    | Letter-spacing 0.08em   |
| Subtitle         | 0.75rem  | 400    | Muted text              |
| Button (primary) | 0.875rem | 700    | CTA, action buttons     |
| Button (ghost)   | 0.75rem  | 500    | Secondary actions       |
| Modal header     | 0.875rem | 700    |                         |
| List items       | 0.875rem | 500    |                         |
| Help text        | 0.75rem  | 400    |                         |
| Small UI         | 10px     | 400    | Visitor counter, badges |
| Body default     | 1rem     | 400    | Line height 1.5         |

Font smoothing: `-webkit-font-smoothing: antialiased`.

## 4. Component Stylings

### Buttons — btn-action (Primary CTA)

- Background: 3-layer gradient (180deg) `#e07040` → `#cc6b3c` → `#b05228`
- Border: `1px solid #8b3e1a`
- Border radius: `12px`
- Color: `#fff`
- Font weight: 700
- Text shadow: `0 -1px 0 rgba(80,28,8,0.4)`
- Box shadow: inset top highlight + inset bottom shadow + 2 drop shadows
- Transition: `all 0.12s ease`
- Active: gradient inverts, `translateY(1px)`

### Buttons — btn-ghost (Secondary)

- Background: gradient `#fffdf4` → `#f5e6c8`
- Border: `1px solid var(--border)`
- Border radius: `12px`
- Color: `var(--muted)`
- Font weight: 500
- Active: gradient inverts, `translateY(1px)`

### Buttons — btn-shutter (Camera Capture)

- Background: radial shine + linear gradient `#f8f0dc` → `#edd98a` → `#d4a810` → `#b8890a`
- Border: `2px solid #8b6b20`
- Border radius: `24px` (pill shape)
- Box shadow: 5-layer including `0 0 0 4px rgba(245,197,24,0.15)` golden halo
- Active: `translateY(2px)`

### Menu Card

- Background: gradient (145deg) `#fffdf4` → `#fff8e7` → `#fdf3d8`
- Border: `1px solid var(--border)`
- Border radius: `16px`
- Box shadow: inset bevels + double drop shadows (laminated effect)
- Padding: `px-5 py-4`

### Menu Stripe (Decorative)

- Repeating linear gradient: `4px solid var(--golden)` + `4px transparent`
- Height: `3px`, border radius: `2px`
- Olive variant uses `var(--olive)`

### Step Badges

- Active: gradient `#e07040` → `#b05228` (terracotta)
- Done: gradient `#8b9f52` → `#5a6b30` (olive)
- Idle: gradient `#e8c87a` → `#c8a040` (golden, muted text)

### Modals

- Background: `var(--parchment)`
- Border radius: `16px`
- Box shadow: `0 8px 32px rgba(60,36,21,0.2)`
- Max height: `70vh`, scrollable

### Toast Notifications

- Border radius: `12px`
- Animation: `fade-in 0.35s ease-out` (slide up from 6px)
- Z-index: `9999`
- Auto-dismiss: 5 seconds

## 5. Layout Principles

### Container

- Max width: `32rem` (max-w-lg) — mobile-first
- Padding: `px-4` (1rem) on page, `px-5` on cards
- Centered: `mx-auto`

### Spacing Scale

| Token        | Value           |
| ------------ | --------------- |
| Tight gap    | `gap-1.5` (6px) |
| Button gap   | `gap-2` (8px)   |
| Section gap  | `gap-3` (12px)  |
| Major gap    | `gap-4` (16px)  |
| Page padding | `py-6` (24px)   |

### Layout

- Flex column, centered (`flex-col items-center`)
- No grid usage — single column throughout
- Landscape mode reduces `--panel-margin` from 280px to 120px

## 6. Depth & Elevation

### Z-Index Hierarchy

| Layer   | Z-Index | Element              |
| ------- | ------- | -------------------- |
| Texture | 0       | body::before overlay |
| Content | 10      | Main page content    |
| Modals  | 50      | Popups, overlays     |
| Toasts  | 9999    | Floating alerts      |

### Shadows

All shadows use `rgba(60,36,21,...)` (warm brown) — never neutral gray.

- Cards: subtle double layer (0.08 + 0.06 opacity)
- Buttons: medium (0.25 + 0.15 opacity) with inset bevels
- Modals: deep (0.2 opacity, 32px blur)
- Shutter button: golden glow ring `0 0 0 4px rgba(245,197,24,0.15)`

### Border Radius

| Component            | Radius |
| -------------------- | ------ |
| Menu card            | 16px   |
| Action/ghost buttons | 12px   |
| Shutter button       | 24px   |
| Share icons          | 10px   |
| Thumbnails           | 4px    |
| Stripe decorations   | 2px    |

## 7. Do's and Don'ts

### Do

- Use CSS variables for all colors. Warm earth tones only
- Include inset bevel shadows on all buttons for laminated depth
- Keep transitions at 0.12s for snappy feedback
- Use `translateY` on active state for press effect
- Apply golden focus ring (`2px solid var(--golden)`, offset 2px) on all interactive elements
- Respect `prefers-reduced-motion` — disable transitions, slow spinners to 2s
- Use `text-balance` on multi-line headings
- Stack buttons vertically on mobile

### Don't

- Use saturated neon colors, pure reds, or blues outside the palette
- Flatten button shadows — beveled insets are core to the aesthetic
- Exceed 0.12s transition duration on buttons
- Use sharp 0px border radius on any component
- Set body text below 14px
- Exceed `max-height: 70vh` on modals
- Override the Japanese-first font stack at component level

### Transitions

| Context         | Duration | Timing   |
| --------------- | -------- | -------- |
| Buttons         | 0.12s    | ease     |
| Toast entrance  | 0.35s    | ease-out |
| Loading spinner | 0.8s     | linear   |

## 8. Responsive Behavior

### Breakpoints

Mobile-first design. The 32rem container means layout is effectively single-column at all widths.

| Adjustment     | Trigger                  | Change                         |
| -------------- | ------------------------ | ------------------------------ |
| Panel margin   | `orientation: landscape` | `--panel-margin` 280px → 120px |
| Canvas scaling | `devicePixelRatio`       | Crisp rendering on HiDPI       |
| Touch behavior | All interactive elements | `touch-none` on overlays       |

### Touch Targets

- Minimum: 44px tap target on all buttons
- `-webkit-tap-highlight-color: transparent` on body

## 9. Agent Prompt Guide

### CSS Variable Quick Reference

```
--background:     #fff8e7   (cream)
--foreground:     #3c2415   (espresso)
--surface:        #fffdf4   (bright off-white)
--border:         #d4a85a   (golden brown)
--muted:          #7a5c2e   (dark brown secondary text)
--accent:         #cc6b3c   (terracotta CTA)
--accent-hover:   #b85a2e   (darker terracotta)
--golden:         #f5c518   (bright gold)
--olive:          #6b7f3e   (sage green success)
--parchment:      #f5e6c8   (warm beige panels)
--error:          #8b3e1a   (deep rust)
```

### When generating UI for this project

- Warm earth tones only. The palette is cream, gold, terracotta, olive — no blues, no grays
- Light theme only. No dark mode
- Skeuomorphic buttons with layered shadows and inset bevels. Flat design is wrong here
- Container max is 32rem. This is a mobile-first app
- All shadows use warm brown `rgba(60,36,21,...)`, never neutral gray
- Japanese-first font stack — do not import Google Fonts or add custom fonts
- Focus rings are golden (`#f5c518`), not browser default blue
- Border radius is generous: 12-16px for cards/buttons, 24px for shutter pill

### Color Emotion Reference

- **Cream (#fff8e7):** Warmth, nostalgia, paper texture
- **Terracotta (#cc6b3c):** Energy, action, appetite (restaurant association)
- **Gold (#f5c518):** Joy, celebration, premium feel
- **Olive (#6b7f3e):** Completion, correctness, natural calm
- **Espresso (#3c2415):** Grounding, readability, warmth
