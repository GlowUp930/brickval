# BrickVal Mobile Design Guidelines

This is the active visual design source for the BrickVal mobile app.

## Source Priority

1. Follow `/Users/holamchan/brickval/AGENTS.md` for product, engineering, platform, API, and business rules.
2. Follow this file for mobile UI direction.
3. Follow `CONTEXT.md` for user-facing product language.
4. Use downloaded design references only when this file names them.

If a visual reference conflicts with `AGENTS.md`, business requirements, real BrickVal data, or platform constraints, the BrickVal rule wins.

## Core Direction

BrickVal should feel like a clean finance portfolio for LEGO collectors: fast, confident, data-first, and native-mobile.

The Collection tab follows the Robinhood iOS portfolio pattern for layout and visual hierarchy, adapted only where BrickVal product requirements differ. The rules below are the repository's self-contained source of truth; do not depend on files inside the generated `ios/` folder.

## Collection Tab

Use the Robinhood portfolio layout:

- White canvas in light mode; use the equivalent theme surfaces and contrast in dark mode.
- Minimal top header.
- Large title: `Collection`.
- Header actions use simple icons.
- Upper label: `COLLECTION VALUE`.
- Large USD portfolio value.
- Green value movement line below the value.
- Large clean chart directly on the canvas, with no card container.
- Timeline selector below the chart.
- LEGO collection grid below the timeline.
- A green floating add button sits above the tab bar at bottom-right and opens manual LEGO set entry.

BrickVal-specific adaptations:

- Use saved collection value, not buying power.
- Use BrickVal's available horizons. Current target: `1D`, `1W`, `1M`, `3M`, `YTD`, `1Y`, `ALL`.
- Show LEGO set and minifigure images in the grid.
- The chart reflects saved item market values over time, not purchase price.
- Empty state should drive the user to scan or add an item without changing the layout structure.

## Color

Use Robinhood green as the primary active/value color:

- Default primary green: `#00C805`
- Pressed green: `#00A904`
- Positive movement: `#00C805`
- Negative movement: use a clear red/orange from the Robinhood reference.

White, black, and neutral grays should carry most of the interface. LEGO yellow is no longer the default app accent. A collector may still choose another highlight colour in Appearance settings, but Collection value and chart signals stay green.

## Typography

Use the app's native font stack unless a better bundled font is already available. Match the Robinhood hierarchy:

- Huge numeric value for collection total.
- Bold screen title.
- Small uppercase metadata labels.
- Tabular/monospaced digits for prices, percentages, quantities, and chart labels when available.

Do not import proprietary Robinhood fonts.

## Navigation

Keep exactly three tabs:

- Collection
- Scan
- Settings

The Collection tab is the portfolio-style home surface. Scan stays focused on camera capture and result reveal. Settings stays utility-focused.

## Scan Principles

- Scan must stay fast and native-mobile first.
- The Scan tab offers exactly two modes: `Minifigure` and `Bulk`.
- `Minifigure` uses automatic detection and capture. Do not show a shutter button.
- A successful Minifigure scan opens the result card automatically.
- `Bulk` uses a visible manual shutter and opens the bulk results flow after capture.
- Preserve the price reveal as the main emotional moment.
- Pricing confidence must be visible without crowding the screen.

## Charts And Motion

- Collection is the reference interaction for future shared stock-chart work; the current result chart remains separate until that work is explicitly scheduled.
- Use a rounded price line with a subtle contained gradient fill.
- Press or drag anywhere on a chart to reveal a vertical cursor, selected point, date, and USD value popup.
- Keep the selected point visible after the drag so users can inspect it.
- Timeline changes use the current 320 ms cubic React Native path morph.
- Chart scrubbing responds immediately without smoothing or delay.
- Respect Reduce Motion by switching timeline data without morph animation.
- Collection timeline controls are `1D`, `1W`, `1M`, `3M`, `YTD`, `1Y`, and `ALL`.

## Inventory Images

- Product images sit directly on the main canvas.
- Use a thin neutral-gray rounded border around the image area.
- Use the theme surface inside the border so white-background imagery stays framed in light and dark mode.

## Collector Profile

- Offer the same local LEGO avatar choices as Android: Classic, Ghost, Wolf, and Knight.
- Persist the selected collector avatar on-device.

## Onboarding

- Use the five-stage Android-aligned flow: value preview, scan demo, collector goal, market-data trust, and indie review.
- Use segmented progress, concise centered copy, and a single bottom action.
- Existing users can replay onboarding from Settings without clearing their collection.
- Do not request an App Store review before meaningful product use; retain the post-save review request.

## Component Rules

- Avoid nested cards.
- Avoid decorative backgrounds on the Collection tab.
- Use simple dividers, whitespace, and type scale for structure.
- Keep chart interactions smooth and touch-friendly.
- Keep filters and timeline controls compact.
- Repeated collection items should use real product imagery when available.

## Copy Rules

Use `CONTEXT.md` for canonical product terms:

- Market Snapshot
- Price Signal
- Collection Quantity
- Review Bulk Scan
- Scan Session

Do not use internal implementation terms such as cache, duplicate item, or scan handler in user-facing UI.
