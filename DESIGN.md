# BrickVal Web Design System

## Project Identity

| Property | Value |
|----------|-------|
| Product | BrickVal - LEGO set & minifigure value scanner |
| Launch | June 21, 2026 (preorder release date) |
| Platform | iOS (primary at launch), Android (coming soon), Web |
| Audience | LEGO collectors, resellers, and buyers |
| Language | Dark-tech cinematic with editorial clarity |
| Aesthetic | Premium consumer app launch landing page |

## Brand Tokens

### Color Palette (dark mode only)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0d0d0f` | Page background |
| `--surface` | `#18181c` | Card/section surfaces |
| `--surface-2` | `#222228` | Elevated surfaces, inputs |
| `--border` | `#2a2a32` | Structural borders, dividers |
| `--foreground` | `#f0f0f5` | Primary text (headlines, body) |
| `--muted` | `#6b6b7a` | Secondary text, metadata |
| `--accent` | `#f5c518` | Primary accent (gold) - buttons, highlights |
| `--accent-hover` | `#ffd740` | Accent hover state |
| `--accent-fg` | `#0d0d0f` | Text on accent backgrounds (always dark) |
| `--green` | `#22c55e` | Success states, launch badge |
| `--red` | `#ef4444` | Error states |

One accent per page. No color drift across sections.

### Corner Radius System
- Buttons: `rounded-xl` (12px)
- Cards: `rounded-2xl` (16px)
- Large containers: `rounded-3xl` (24px)
- Pills/badges: `rounded-full`
- **Rule:** exactly one radius per component type, applied everywhere.

## Typography

| Role | Font | CSS Variable | Weight |
|------|------|-------------|--------|
| Display/Headlines | Geist (sans) | `--font-geist-sans` | 700-900 |
| Body | Geist (sans) | `--font-geist-sans` | 400 |
| Mono/Data | Geist Mono | `--font-geist-mono` | 400 |
| Accent headlines | Manrope | `--font-manrope` | 700-800 |
| Alternative accent | Space Grotesk | `--font-space-grotesk` | 500, 700 |

### Scale
- Hero H1: `text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]`
- Section H2: `text-3xl sm:text-4xl font-black tracking-tight`
- Card H3: `text-xl font-black`
- Body: `text-base leading-relaxed`
- Small/Meta: `text-xs`
- Eyebrows: `text-[11px] font-semibold uppercase tracking-[0.2em]` (max 1 per 3 sections)

**Banned fonts:** Inter (discouraged as default), generic serifs, generic system fonts.

## Layout Rules

### Spacing
- Between major sections: `py-24 md:py-32` (minimum) or `py-32 md:py-48` (gallery spacing)
- Hero top padding: max `pt-24` (~6rem) at desktop
- Navbar height: max 80px desktop, default 64px
- Content max-width: `max-w-[1400px]` centered, or section-specific (`max-w-5xl`, `max-w-4xl`)
- Mobile: `min-h-[100dvh]` never `h-screen`

### Grid Rules
- Use CSS Grid over flexbox percentage math
- Bento grids MUST use `grid-flow-dense` and perfect cell count (fill every cell)
- Max 2 consecutive zigzag (image+text split) sections
- Each section uses a different layout family

### Section Identity
Every section must have a distinct layout from adjacent sections. Layout families include:
- Full-bleed cinematic (hero)
- Continuous marquee/scroll (logos)
- Bento grid (features, mixed cell sizes)
- Two-column split (data sources)
- Structured grid (FAQ, 2x2)
- Centered card (waitlist/CTA)
- Simple row (footer)

## Component Patterns

### Cards
- Background: `var(--surface)` or `var(--surface-2)`
- Border: `1px solid var(--border)`
- Radius: `rounded-2xl` (standard)
- Shadow: use sparingly; prefer borders for elevation

### Buttons
- Primary: fill with `var(--accent)`, text `var(--accent-fg)`
- Active state: `scale-[0.98]`
- CTA labels: max 3 words, must not wrap at desktop
- One CTA intent label per page (e.g., "Get started" everywhere)

### Forms
- Label above input (never placeholder-as-label)
- Input: border `var(--border)`, focus border `var(--accent)`
- Error: below input, `var(--red)` text

### Navigation
- Single line at desktop, max 80px height
- Glass effect: `backdrop-blur-xl`, semi-transparent bg
- Mobile: condense or hamburger

## Motion Guidelines

### Motion Intensity: 6/10

| Priority | Technique | Scope |
|----------|-----------|-------|
| Entry | `initial/animate/whileInView` (framer-motion) | Hero, section headers, cards |
| Hover | `group-hover:scale-105` inside `overflow-hidden` | Cards, images |
| Scroll reveal | `whileInView` staggered cascade | Bento grid cards, feature list |
| Marquee | CSS animation for continuous scroll | Logo wall below hero |

### Hard Rules
- Animate ONLY `transform` and `opacity` (never `top`, `left`, `width`, `height`)
- `prefers-reduced-motion` must collapse all animations to static
- GPU-heavy effects on `pointer-events-none` elements only
- No `window.addEventListener('scroll')` - use framer-motion or CSS

## Hero Rules (Section 4.7 compliance)

- Max 4 text elements: (1) badge, (2) headline, (3) subtext, (4) CTAs
- Headline max 2 lines on desktop
- Subtext max 20 words / 4 lines
- NO trust strip, stats, logos, or social proof inside hero
- NO eyebrow above headline
- Hero needs a real visual (gradient + texture + pattern counts)
- CTAs: 1 primary + max 1 secondary

## Anti-Patterns (Banned)

- No emojis anywhere in UI
- No "SECTION 01", "QUESTION 05" or numbered section labels
- No em-dashes as design elements
- No `#000000` pure black or `#ffffff` pure white
- No "AI Purple" gradients
- No 3-column equal card feature rows
- No centered hero sections (EXCEPT for launch announcements per 4.3 override)
- No duplicate CTA intent on same page
- No "Scroll to explore" / bouncing chevrons
- No fake-precise numbers (92%, 4.1x) without real data
- No Inter font (use Geist)
- No lucide-react (prefer phosphor-icons, but project already depends on lucide-react)
- No placeholder-as-label in forms

## Content Requirements

- "Launching June 21" launch badge in hero
- "Download on the" App Store CTA
- "or try on web" secondary CTA
- "Launching on" badge in platform section (max 1 eyebrow)
- "See it in action" heading
- "Lifetime Deal" tab in waitlist section
- "Be First To Know" waitlist heading
- Android "coming soon" mention (no specific date)

## File Architecture

```
src/app/page.tsx                          # Root page, renders <Hero />
src/components/home/Hero.tsx              # Full homepage (single file, all sections)
DESIGN.md                                 # This file
scripts/assert-homepage-contract.mjs      # Pre-deploy contract verification
```
