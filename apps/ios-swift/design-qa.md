# Scan Result Card Visual QA

## Inputs

- Reference iOS: `/Users/holamchan/Downloads/IMG_9890.PNG`
- Reference Android: `/Users/holamchan/Downloads/WhatsApp Image 2026-07-06 at 20.22.42.jpeg`
- Implementation top: `design-qa-assets/scan-result-top.jpg`
- Implementation market detail: `design-qa-assets/scan-result-market.jpg`
- Comparison: `design-qa-assets/result-card-comparison.jpg`

## Test State

- Device: BrickVal iPhone 17 Pro Simulator
- Viewport: 368 x 800 points
- Theme: dark result surface with BrickVal Robinhood green
- Fixture: Eiffel Tower set with New, Used, sold-source, and market-history data

## Fidelity Review

- Product image is the first and largest object.
- Identity, category, identifier, year, and piece count form a compact information block.
- New and Used values replace unsupported trading-card grading controls.
- Real BrickVal market history remains the primary data visualization.
- Sold-data provenance is visible without presenting a non-functional external link.
- Collection quantity and New/Used save actions remain available in the result flow.
- Primary green action uses black text for accessible contrast.
- Missing pricing renders as `No data`, not a false zero value.

## Comparison History

1. Initial capture opened at the lower scroll position; top-state QA was repeated after returning to the image.
2. Primary-button contrast was corrected from white text to black text.
3. Missing-price behavior was corrected from `$0` to `No data`.
4. Final top and lower states were compared with both supplied references in one contact sheet.

final result: passed

## Scan Processing Motion QA — 2026-08-06

- Verified the identifying animation on the iPhone 17 Pro and compact iPhone Simulators.
- Verified the frozen-image scanner stays in a centered 3:4 frame on both simulators.
- Confirmed the mode picker, camera stage, shutter controls, navigation area, and tab bar do not overlap after manual or automatic capture enters the shared processing state.
- Added a UI regression that checks the processing frame remains between the mode picker and scanner controls.
- Confirmed the scan beam moves while identity and pricing work is in progress.
- Confirmed the loading layout remains readable at Accessibility Large without clipping or text collisions.
- Confirmed Reduce Motion replaces the moving beam with a static status mark; screenshots taken 1.5 seconds apart were pixel-identical.
- The animation uses transform and opacity only, keeping Core ML and network processing prioritized.
- VoiceOver exposes one concise, frequently updating status with the current phase and explanation.

final result: passed

## Interactive Chart And Flow QA — 2026-07-15

- Collection chart scrubber exposed the selected month and USD value through UI automation.
- Timeline controls responded with selection state across all seven horizons.
- Market Snapshot chart scrubber exposed the selected point and contained its gradient after clipping correction.
- Manual set floating action opened the set-number entry sheet and returned into the shared result flow.
- Collection inventory imagery uses border-only treatment.
- Classic, Ghost, Wolf, and Knight profile assets rendered and exposed correct accessibility labels.
- Replay onboarding remained active after the legacy-migration conflict was isolated with session replay state.
- Five-stage onboarding entry and first transition were exercised in Simulator.
- Final build succeeded; 18 tests passed with zero failures.

final result: passed
