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
- Missing pricing renders as `Price unavailable`, not a false zero value.

## Comparison History

1. Initial capture opened at the lower scroll position; top-state QA was repeated after returning to the image.
2. Primary-button contrast was corrected from white text to black text.
3. Missing-price behavior was corrected from `$0` to `Price unavailable`.
4. Final top and lower states were compared with both supplied references in one contact sheet.

final result: passed

## Scan Processing Motion QA — 2026-08-06

- Verified the identifying animation on the iPhone 17 Pro and compact iPhone Simulators.
- Verified the frozen-image scanner stays in a centered 3:4 frame on both simulators.
- Verified the native Minifigure/Bulk segmented control uses a larger centered rail with a 56-point touch frame on both simulators.
- Confirmed the mode picker, camera stage, shutter controls, navigation area, and tab bar do not overlap after manual or automatic capture enters the shared processing state.
- Added a UI regression that checks the processing frame remains between the mode picker and scanner controls.
- Confirmed the scan beam moves while identity and pricing work is in progress.
- Confirmed the loading layout remains readable at Accessibility Large without clipping or text collisions.
- Confirmed Reduce Motion replaces the moving beam with a static status mark; screenshots taken 1.5 seconds apart were pixel-identical.
- The animation uses transform and opacity only, keeping Core ML and network processing prioritized.
- VoiceOver exposes one concise, frequently updating status with the current phase and explanation.

final result: passed

## Immersive Bulk Reveal QA — 2026-08-21

- Verified the compact intro, full-screen reveal, and completed review phases on the small iPhone and iPhone 17 Pro simulators.
- Confirmed the reveal uses the full aspect-fit photo, keeps edge figures visible, respects the Dynamic Island safe area, and returns to the normal review layout.
- Confirmed every detected outline remains visible after completion; the photo overlay shows only the currently revealed price callout.
- Confirmed Skip, Replay, the lot-complete panel, the global condition selector, and completed-state Retake are absent. Per-figure New/Used controls and the single Add action remain available.
- Confirmed the compact Missed control has a 44-point minimum touch frame and Retake remains limited to recovery states.
- Verified Reduce Motion on the small simulator: the reveal uses a short crossfade without matched-geometry expansion, then restored the simulator setting.
- Added regression coverage for lots containing 1, 10, 40, and 50 entries.
- Release build `141` archived and uploaded to App Store Connect; package processing remains asynchronous.

final result: passed

## Progressive Bulk Results QA — 2026-08-22

- Bulk results now present immediately after region detection; pricing requests continue behind the reveal.
- The lookup window is capped at four requests, while the reveal stays in spatial order and pauses on a loading outline when needed.
- Completed results use one compact horizontal rail with all result cards reachable by scrolling; the old ten-item page selector is removed.
- The photo remains aspect-fit in both immersive and completed layouts. Resolved and unresolved regions retain their outlines after the reveal.
- The Add action remains disabled until every region reaches a terminal state and the spatial reveal finishes.
- Missed-figure recovery uses the exact known region with one context expansion, or a tap-centered median-size crop for free taps. The visible highlight and encoded crop share the same box.
- Reduce Motion keeps the progressive state and uses short crossfades instead of stage expansion.
- Small iPhone UI tests passed for recovery selection and scanner layout. The full Swift suite passed with 122 tests, and the iPhone 17 Pro simulator build succeeded.
- No new TestFlight build was uploaded for this change.

final result: passed

## Paywall Routing And Update Gate QA — 2026-08-22

- Upgrade actions now register the configured `brickval_upgrade` placement directly, so the normal configured release path opens the Superwall paywall without presenting the intermediate Subscription sheet.
- Feature-specific upgrade placements still resolve eligibility first, then fall back to the direct upgrade placement when appropriate.
- The remote minimum-build gate is fail-open while unset. After build `142` is live, set `BRICKVALUE_MINIMUM_IOS_BUILD=142` to require older builds to update.
- The update screen links to the App Store and has no dismiss or skip action.
- Focused monetization tests passed. The full Swift suite passed with 125 tests (127 parameterized test runs) and zero failures on the small iPhone simulator.
- Backend monetization and scan-gate tests passed with 8 tests, and the TypeScript type check passed.
- Build `142` was archived, signed, and uploaded to App Store Connect successfully; package processing is asynchronous.

final result: passed

## Bulk Photo Import Recovery QA — 2026-08-22

- Confirmed the supplied HEIC library photo decodes and the bundled YOLO detector returns bulk regions on the small iPhone simulator.
- Confirmed the picker-to-scan handoff shows an immediate `Preparing photo…` state before detection and pricing begin.
- Confirmed exhausted local bulk usage and a server `402` limit keep an actionable failure visible instead of returning silently to the searching scanner.
- Confirmed a late live-camera detection cannot overwrite the active photo-import state.
- The full iOS suite passed with 127 tests, including four parameterized runs, and zero failures on the small iPhone simulator.
- Build `143` was archived and uploaded to App Store Connect; package processing remains asynchronous.

final result: passed

## Upgrade And Bulk Status QA — 2026-08-22

- Profile, Subscription, and Appearance upgrade actions now use the shared paywall coordinator without a view-level configuration guard.
- Superwall paywall errors and skipped placements now expose the existing visible subscription fallback instead of failing silently; configured placements still open directly.
- Removed the duplicate bulk camera detection header so framing presents one status message and one material container.
- Added regression coverage for the unavailable purchase-services fallback path.
- Full iOS suite passed with 128 tests, four parameterized runs, and zero failures on the small iPhone simulator.
- Rebuilt the bulk scanner demo and confirmed the duplicate background container is absent.
- No new TestFlight build was uploaded for this change.

final result: passed

## TestFlight Build 144 QA — 2026-08-22

- Release archive verified as version `1.0.5 (144)` with bundle identifier `com.brickval.app`.
- Archive signing used the App Store distribution identity and `BrickVal App Store Build 125` profile.
- App Store Connect accepted the upload; package processing remains asynchronous.
- Full iOS suite passed with 128 tests, four parameterized runs, and zero failures on the small iPhone simulator before the release archive.

final result: passed

## TestFlight Build 145 QA — 2026-08-24

- Release archive verified as version `1.0.5 (145)` with bundle identifier `com.brickval.app`.
- Archive signing used the App Store distribution identity and `BrickVal App Store Build 125` profile.
- The full Swift suite passed with 126 unit tests and zero failures on the small iPhone simulator; both UI tests also passed.
- App Store Connect accepted the upload; package processing remains asynchronous.

final result: passed

## Superwall Paywall And Promo Code QA — 2026-08-22

- Upgrade actions now register the Superwall placement directly; Superwall skip/error callbacks no longer open the native `SubscriptionView` fallback page.
- A genuine Superwall configuration failure remains visible as a concise retryable alert instead of a replacement subscription screen.
- The `showPromoRedeem` custom paywall action opens the existing StoreKit offer-code redemption flow from the active app scene.
- Published a visible `Redeem offer code` control that calls `showPromoRedeem` on both active Superwall paywalls: `Paywall test 1` (soft upgrade) and `hardpaywall` (hard access).
- The soft paywall is published to the testing campaign and the hard paywall is published to the new-user hard-access campaign; both remain active in the Brickvalue application.
- Added regression coverage for the promo action and unknown custom actions.
- Full simulator test and on-device purchase/redeem verification remain required.

final result: code and Superwall dashboard configuration complete; device verification pending

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

## Simplified Bulk Price Reveal QA — 2026-08-24

- Compatibility responses with `status: review` now auto-accept the highest-scoring candidate with genuine pricing; the normal review rail and Review badge are removed.
- Resolved figures use one display-price rule across the reveal callout, running total, and rail. Numeric prices are shown in USD; missing market data shows `Price unavailable` and is excluded from the priced count.
- Reveal mode uses `BulkFocusOverlay` as the only target outline. Unresolved completed regions retain a neutral outline for recovery without orange dashed overlays.
- The returning phase keeps the reveal total and last price callout stable while the photo contracts; the completed summary appears only after that transition finishes.
- Added unit coverage for last-revealed identity, unavailable-price handling, and priced totals. Added a UI regression asserting one reveal total followed by one completed summary.
- Full Swift and UI suites passed on the BrickVal Small iPhone simulator: 127 unit tests plus 3 UI tests, zero failures.
- The single-total reveal/completed-summary UI smoke test also passed on the BrickVal iPhone 17 Pro simulator.
- Build `146` was archived and uploaded to App Store Connect after the simplified bulk reveal regression suite passed; package processing is asynchronous.

final result: passed

## Bulk Recovery Frame Persistence QA — 2026-08-24

- Missed-figure recovery now layers its tap targets and selection highlights over the completed detection overlay, so existing result frames remain visible throughout recovery.
- Resolved and unresolved detection regions continue to use the same completed-state frame layer before and after recovery begins.
- The focused recovery UI test and the full iOS suite passed on the BrickVal Small iPhone simulator: 127 unit tests plus 3 UI tests, zero failures.
- No TestFlight build was uploaded for this presentation-only fix.

final result: passed

## Social-First Bulk Value Reveal QA — 2026-08-25

- The reveal now opens with an aspect-fit full-screen hook showing the detected figure count, then uses one continuous top-to-bottom beam over the darkened photo.
- The active figure receives one crisp green frame and one price callout above it. Completed figures settle into quieter green frames; unavailable prices display `Price unavailable` and do not increase the priced count.
- The reveal HUD is compact and dark, the live rail shows only the latest few results during the sweep, and the existing scrollable result rail returns after completion.
- The final reward is rendered directly over the photo: the total counts up, the highest-value figure receives the only gold treatment, the existing completion sound and success haptic fire once, and the reveal holds before returning to review. No duplicate total container or extra summary card is introduced.
- Pending lookups hold the beam on the ordered target with a checking status. Existing four-request concurrency, spatial ordering, missed recovery, selection, condition controls, and collection actions remain unchanged.
- Missed recovery keeps the completed detection frames visible so processed and unresolved figures remain distinguishable.
- Reduce Motion removes beam travel and uses short crossfades while preserving frames, prices, progress, and the final total.
- The small iPhone simulator visual check confirmed the hook, sweep HUD, aspect-fit photo, single frame layer, compact rail, and completed review layout. Jackpot presence is covered by the bulk reveal UI regression.
- The Swift suite passed with 129 unit tests and the UI suite passed with 3 tests on the BrickVal Small iPhone simulator. No TestFlight build was uploaded for this presentation-only change.

final result: passed
