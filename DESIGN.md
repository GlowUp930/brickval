# BrickVal — Design System

> **Philosophy:** The emotional energy of LEGO (bold, playful, creative) delivered through the restraint and polish of cal.ai. Dark surfaces. Saturated accents. Every interaction feels considered.

---

## 1. Design Inspirations

| Source | What we take from it |
|---|---|
| **LEGO** | Color palette DNA — primary, saturated, joyful. The brand feeling: tactile, confident, fun. |
| **cal.ai** | Typography system, button styles, animation timing, component geometry, whitespace discipline. |
| **Shiny TCG** | Screen layout patterns: hero value + area chart + time-range tabs + insight cards + bottom nav. |

---

## 2. Color System

> Colors are **LEGO-inspired but not final**. The palette uses the boldness of LEGO primaries adapted for a dark mobile UI. Exact hex values are placeholders — final values to be confirmed in Figma.

### Philosophy
LEGO's palette is unapologetically saturated: fire-engine red, sky blue, lime green, brick yellow, vivid orange. We adapt these into a dark UI by using them as **accents only** — never as backgrounds. Surfaces stay near-black; color is reserved for data, actions, and moments of delight.

### Palette Slots

```
── Brand ──────────────────────────────────────────────────────────────────────
primary           TBD  ← currently #ffc32c (LEGO Yellow). Anchor. CTAs, chart line, active states.
primary-dim       TBD  ← primary at ~12% opacity. Badge backgrounds, hover fills.
primary-container TBD  ← darker shade of primary for gradients / pressed states.
on-primary        TBD  ← text color on top of primary fills. Dark brown/black tone.

── Semantic accents (LEGO-inspired candidates) ────────────────────────────────
accent-green      TBD  ← gain%, "Active" badge, positive trend. Inspired by LEGO lime/green.
accent-red        TBD  ← loss%, "Retired" badge, destructive actions. Inspired by LEGO red.
accent-blue       TBD  ← informational states, links. Inspired by LEGO sky blue.
accent-orange     TBD  ← "Retiring Soon" badge, warning states. Inspired by LEGO orange.

── Surfaces (dark, near-black) ────────────────────────────────────────────────
background        #0e0e0e   ← app canvas. Near-black, not pure black.
surface-low       #131313   ← cards, bottom sheets, sections on bg.
surface-high      #20201f   ← elevated cards, modals, tooltips.
surface-overlay   rgba(14,14,14,0.75)  ← frosted-glass nav bars, headers.

── Text ───────────────────────────────────────────────────────────────────────
on-surface        #ffffff   ← primary text on dark surfaces.
on-surface-muted  #adaaaa   ← secondary text, labels, placeholders.
on-surface-faint  #4d4d4d   ← disabled, dividers, very subtle text.

── Border ─────────────────────────────────────────────────────────────────────
border-default    rgba(255,255,255,0.08)  ← card outlines, input borders, dividers.
border-active     rgba(primary,0.4)       ← focused inputs, selected states.
```

### Color Rules
- **Never** use a saturated LEGO color as a large background fill — only as accents, badges, borders, chart lines, and button fills.
- **One primary accent per screen** — don't mix yellow + green + blue on the same view.
- Semantic colors (green = gain, red = loss, orange = warning) must be used consistently across every screen.
- All text on colored buttons must pass WCAG AA contrast (4.5:1).

---

## 3. Typography

> Directly follows cal.ai's type system. Clean, modern, slightly technical.

### Font Stack
```
Display / Headline:   Inter (Black 900, Extra Bold 800)
UI Label / Button:    Inter (Bold 700, Semi Bold 600)
Body:                 Inter (Regular 400, Medium 500)
Monospace / Price:    Inter (tabular nums via font-variant-numeric: tabular-nums)
```

All numeric values (prices, counts, percentages) use `font-variant-numeric: tabular-nums` so digits don't shift width during count-up animations.

### Type Scale

| Role | Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| Hero Value | 44–48px | Black 900 | -0.5px | Collection total, price reveal |
| H1 Screen Title | 28–32px | Extra Bold 800 | -0.3px | Page headings |
| H2 Section Title | 20–22px | Bold 700 | -0.2px | Card titles, section headers |
| H3 Item Name | 16–18px | Bold 700 | 0 | List row primary label |
| Body | 13–14px | Regular 400 | 0 | Descriptions, subtitles |
| Label / Badge | 10–11px | Bold 700 | +0.8–1.5px | ALL-CAPS labels, status chips |
| Caption | 9–10px | Medium 500 | +0.5px | Metadata, timestamps |

### Rules
- Headings always track slightly negative (feel tighter, more confident).
- ALL-CAPS is reserved for category labels and badge text only — never for body copy.
- Price strings always use a `$` that is ~70% the size of the digit characters (visual hierarchy).
- Line-height: 1.4× for body, 1.15× for headings, 1.0× for single-line UI labels.

---

## 4. Layout & Screen Patterns

> Derived from Shiny TCG app analysis. These are the structural templates for BrickVal screens.

### Grid
- **Horizontal margin:** 24px (left and right gutters on all screens)
- **Component gap:** 16px between stacked cards/sections
- **Inner card padding:** 16–20px
- **Screen width target:** 390px (iPhone 14 baseline, tested at 375px min)

### Screen Templates

#### A — Dashboard (Home)
```
┌─────────────────────────────┐
│ TopAppBar (blur, 64px)      │  Logo · Wordmark · Currency/Bell
├─────────────────────────────┤
│ Filter Bar (40px)           │  "All Groups" chip · Share chip
├─────────────────────────────┤
│ Hero Value Section          │
│   Label (muted, center)     │  "Your collection is worth"
│   $XX,XXX.XX (48px, white)  │  Animated count-up on load
│   Total Paid · gain% (muted)│
├─────────────────────────────┤
│ Condition Stats Row         │  Ungraded · Graded · Sealed (3-col)
├─────────────────────────────┤
│ Area Chart (180px tall)     │  Full-width, no gutters
│ Date labels (below)         │
│ Time Range Tabs             │  7D · 1M · 3M · 6M · [1Y]
├─────────────────────────────┤
│ Section Header              │  🏆 "Most Profitable" · ···
├─────────────────────────────┤
│ List Row (repeat)           │  Thumbnail · Name/Meta · Gain · >
│ List Row                    │
└─────────────────────────────┘
│ BottomNav (80px)            │  Home · Scanner · Collection · Market
```

#### B — Item Detail
```
┌─────────────────────────────┐
│ TopAppBar                   │  ← Back · Logo · Expand icon
├─────────────────────────────┤
│ Hero Image (220px)          │  Full-bleed, bottom gradient fade
│   Item name (overlay)       │
│   Set info · Price (overlay)│
├─────────────────────────────┤
│ Chart Header Row            │  ★ Date + current price · Min/Max
├─────────────────────────────┤
│ Area Chart (180px)          │
│ Date labels                 │
│ Time Range Tabs             │
├─────────────────────────────┤
│ Insight Card                │  Mini chart icon · Title · Desc · >
└─────────────────────────────┘
│ BottomNav                   │
```

#### C — Scanner
```
┌─────────────────────────────┐
│ TopAppBar                   │
├─────────────────────────────┤
│ Page Title + Subtitle       │
├─────────────────────────────┤
│ Mode Toggle (pill)          │  [Set]  [Minifigure]
├─────────────────────────────┤
│ Upload Card                 │  Dashed border · Camera icon
│   CTA Button (primary)      │  "Open Camera"
├─────────────────────────────┤
│  ── or enter manually ──    │  Divider with label
├─────────────────────────────┤
│ Input Row                   │  Text input + → arrow button
└─────────────────────────────┘
│ BottomNav                   │
```

---

## 5. Component Specs

### TopAppBar
- Height: 64px
- Background: `surface-overlay` (frosted glass, `backdrop-filter: blur(20px)`)
- Fixed, `z-index: 50`
- Logo left, primary action right
- Box shadow: `0 20px 40px rgba(0,0,0,0.4)` — soft, deep shadow downward
- **No visible border** — shadow alone separates it from content

### Bottom Navigation
- Height: 80px + safe area inset
- Background: `surface-overlay` (same frosted glass as TopAppBar)
- Box shadow: `0 -10px 30px rgba(0,0,0,0.5)` — upward soft shadow
- 4 tabs: equal width, icon (22px) + label (8px ALL-CAPS, +0.8px tracking)
- Active tab: `primary` color icon + label + subtle `rgba(primary, 0.08)` pill bg, `border-radius: 12px`
- Inactive tab: `on-surface-muted` color
- Tap animation: `scale(0.90)` active, 200ms ease-out spring back

### Buttons (cal.ai pattern)
All buttons use `border-radius: 9999px` (pill shape).

| Variant | Fill | Text | Shadow | Hover |
|---|---|---|---|---|
| Primary | `primary` gradient | `on-primary` | `0 4px 20px rgba(primary,0.25)` | lift `translateY(-1px)` + stronger shadow |
| Secondary | `surface-high` | `on-surface` | none | `border-color` brightens |
| Ghost | transparent | `on-surface` | none | `surface-low` fill appears |
| Destructive | `accent-red` | white | `0 4px 16px rgba(red,0.3)` | lift |

```
Sizes:
  sm   px-4  py-2   text-12px
  md   px-6  py-3.5 text-13px  ← default
  lg   px-8  py-4   text-14px
```

Loading state: spinner replaces label text, button width locked (no layout shift).

### Cards
```css
background:    surface-low or surface-high
border-radius: 12–16px
padding:       16–20px
border:        1px solid border-default  /* optional, use sparingly */
```

Hover (desktop/pointer devices): `translateY(-2px)` + slightly elevated shadow — the cal.ai "lift" pattern.

### Input Fields
```css
background:    surface-high
border:        1px solid border-default
border-radius: 12px
padding:       14px 16px
font-size:     14px
color:         on-surface
placeholder:   on-surface-muted
```
Focus state: border transitions to `border-active` (primary color at 40% opacity), 150ms ease.

### Badges / Status Chips
```
ALL-CAPS text, Bold 700, 9–10px, +1px letter-spacing
Border-radius: 9999px (pill)
Padding: 3px 8px

RETIRING SOON  →  accent-orange fill at 15%, accent-orange text
ACTIVE         →  accent-green fill at 15%, accent-green text
RETIRED        →  accent-red fill at 15%, accent-red text
BULLISH        →  accent-green fill at 15%, accent-green text
PRO            →  primary fill at 15%, primary text
```

### Area Chart
- Line: 2.5–3px stroke, primary color, `stroke-linecap: round`
- Area fill: linear gradient — primary at 18% opacity (top) to 0% (bottom)
- Line glow: `filter: drop-shadow(0 0 8px rgba(primary, 0.6))`
- End dot: 8–10px filled circle, primary, with pulsing outer ring (20% opacity, 18px)
- No grid lines or axes — just the curve on the dark surface
- X-axis: muted text labels below the chart, no tick marks

### Time Range Tabs
```
Pill group, centered, 28px height
Active:   white text on primary filled rounded pill (28px height, auto-width + 16px padding)
Inactive: on-surface-muted text, no background
Gap: 4–6px between tabs
```

### Section Header Row
```
Left:  Icon (emoji or SVG, 16px) + Section title (Bold 700, 16–18px)
Right: ··· overflow button (gray, 20px tap target)
Margin-bottom: 12px before list content
```

### List Rows (item cards)
```
Height: ~72px
Layout: [Thumbnail 44×60px] [16px gap] [Text stack flex-1] [Gain/Value] [> 16px]

Thumbnail: rounded 4–6px, dark bg placeholder
Text stack:
  Line 1: item name — Bold, 13px, white
  Line 2: condition · rarity — Regular, 11px, muted
  Line 3: value · quantity — Regular, 11px, muted
  Line 4: profit (gain%) — Medium, 11px, accent-green (positive) or accent-red (negative)

Tap state: background flashes to surface-high, 100ms
Divider: 1px border-default, left-inset to align with text (not full bleed)
```

---

## 6. Animation

> cal.ai uses animation as a functional signal, not decoration. Every motion communicates state.

### Principles
1. **Ease-out always** — things enter fast, settle slowly. Never linear.
2. **Short durations** — UI feedback: 100–200ms. Page transitions: 300ms. Reveals: 600–1500ms.
3. **No bounce** unless it's a deliberate "pop" moment (price reveal).
4. **Reduced motion respected** — all animations wrapped in `prefers-reduced-motion` check.

### Keyframe Library

```css
/* Chart line drawing — strokes itself left to right */
@keyframes draw-line {
  from { stroke-dashoffset: var(--line-length); }
  to   { stroke-dashoffset: 0; }
}
duration: 1.5s  easing: cubic-bezier(0.4, 0, 0.2, 1)  delay: 0.1s

/* Area fill — fades in after line is drawn */
@keyframes fill-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
duration: 1s  easing: ease-out  delay: 0.7s

/* End dot pulse ring */
@keyframes dot-pulse {
  0%   { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0;   }
}
duration: 0.8s  easing: ease-out  delay: 1.6s

/* Price count-up (requestAnimationFrame, not CSS) */
algorithm: cubic ease-out, 900ms, 60fps
start:     $0.00
end:       final USD value
```

### Interaction States

| Trigger | Animation |
|---|---|
| Button press | `scale(0.97)` → spring back, 150ms |
| Bottom nav tap | `scale(0.90)` → 200ms spring |
| Card hover (pointer) | `translateY(-2px)` + shadow deepen, 150ms ease-out |
| Page enter | Content slides up `20px` + fades in, 300ms ease-out, stagger 50ms per section |
| Modal/sheet open | Slides up from bottom, `spring(stiffness: 300, damping: 30)` |
| Badge appear | `scale(0) → scale(1)`, 200ms ease-out |
| Scan result reveal | Price counts up 0→value over 900ms, then gain% fades in at 1s |

### Page Transitions
```
Enter:  opacity 0→1 + translateY(20px→0), 300ms cubic-bezier(0.4,0,0.2,1)
Exit:   opacity 1→0, 150ms ease-in (faster exit than enter)
```

---

## 7. Spacing Scale

Follows an 8px base grid. All spacing values are multiples of 4.

```
4px   — icon-to-label gap, tight inline spacing
8px   — inner component padding (compact)
12px  — between related items in a stack
16px  — default component gap, card padding (compact)
20px  — card padding (default)
24px  — horizontal screen margin (gutter)
32px  — between major sections
48px  — large section gap or top-of-screen breathing room
```

---

## 8. Iconography

- Style: **filled** for active/important, **outlined** for inactive/secondary
- Size: 22×22px for navigation, 20×20px for inline UI, 16×16px for badges
- Color: inherits from context (primary when active, muted when inactive)
- Source: custom SVG inline components (no icon library dependency)
- LEGO-inspired icons where possible: brick motifs, scan brackets, stud patterns as decorative elements

---

## 9. Imagery & Thumbnails

- Set images: sourced from BrickLink CDN (`img.bricklink.com/ItemImage/SN/0/{setNumber}-1.png`)
- Placeholder: dark surface with a translucent LEGO brick silhouette icon at 15% opacity
- Image fit: `object-fit: contain` with padding — never crop a set box image
- Thumbnail sizes: 44×60px (list rows), 168×110px (scan cards), full-bleed (detail header)

---

## 10. Voice & Micro-copy

- **Prices:** always formatted as `$X,XXX.XX` with commas. Never abbreviate to `$36k` in primary UI.
- **Percentages:** always show sign `+12.4%` or `−8.1%`. Green positive, red negative.
- **Empty states:** encouraging, not apologetic. "No scans yet — point the camera at a set box."
- **Errors:** specific and actionable. Never "Something went wrong." Always say what and what to do.
- **Badge text:** ALL-CAPS, max 2 words. `RETIRING SOON` not `This set is retiring soon`.
- **Loading:** show skeleton screens, not spinners, for content-heavy screens (chart, list).

---

## 11. Dark Mode

BrickVal is **dark-only**. There is no light mode. The dark palette is the brand.

Rationale: LEGO sets photograph best against dark backgrounds. The price reveal animation has maximum visual impact on dark surfaces. The product targets collectors who use the app in various lighting conditions — dark is universally comfortable.

---

*This document is the source of truth for design decisions. Update it when a component pattern changes. Link to specific Figma frames for visual reference.*
*Figma file: https://www.figma.com/design/iqjiLwCNdcn48msYVxh3BB/Brickvalue*
