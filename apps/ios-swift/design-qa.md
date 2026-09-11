# Scan Result Card Visual QA

## Native performance follow-up — 2026-09-11

Captured-photo previews are now prepared once off the UI thread and reused by scanner, processing, and bulk results. Scan operations cancel when replaced, dismissed, or backgrounded, and stale results are ignored. History preparation and product-image decoding remain off the rendering path. The 234-test unit suite and 17 scanner/processing UI checks pass on both simulator sizes; physical Release-device profiling is still required. See [`docs/audits/2026-09-11-performance-followup.md`](../../docs/audits/2026-09-11-performance-followup.md).

## Build 178 performance archive — 2026-09-11

The performance follow-up is archived as signed Release build 1.0.8 (178) at `/tmp/BrickVal178.xcarchive`; strict code-signature verification passed and the BrickVal dSYM UUID is `8258915E-0ADC-37B1-B120-83E8357EFB75`. TestFlight upload and physical iPhone verification remain pending.

## Build 177 release artifact — 2026-09-11

The signed Release archive for build 177 was created successfully from the failed-scan retry fix and passed Xcode validation. TestFlight upload and physical-device confirmation remain pending.

## Failed-scan retry responsiveness — 2026-09-11

The failed-scan message and Try again button remain over the captured photo. The camera-stage accessibility surface no longer accepts touches or covers the retry control, and the failure overlay is exposed directly to VoiceOver while it is present. A deterministic failed-scan UI fixture verifies that Try again is visible, hittable, and leaves the failure state immediately. The focused check passes on the small and large simulators; a physical-camera retry remains the final device check.

## Collection listing fallback — 2026-09-11

When BrickLink has no completed rows for a condition, active listing rows now appear in the collection chart and Market snapshot table. The chart presents them as a current asking-price observation and states that dated sales history is unavailable; the table labels the count “Active listings.” Sold and asking rows remain separate, and the existing source badge, currency formatting, region filtering, and zero-request timeframe switching are preserved.

## Sentry app-hang diagnosis — 2026-09-11

The supplied `BRICKVAL-T` issue is a build-166 app hang on a physical iPhone 11 Pro Max, not a confirmed Core ML recognition defect. The main stack is UIKit/SwiftUI transaction work and the app dSYM is missing; PhotosUI and foreground refresh activity surround the event. A temporary simulator benchmark measured about 8.5 seconds for the current 102-tile imported-photo detector pass, so the detector workload and frozen-photo decoding are follow-up performance risks. Physical picker reproduction and constrained-device verification remain open. See [`docs/audits/2026-09-11-sentry-app-hang-model.md`](../../docs/audits/2026-09-11-sentry-app-hang-model.md).

## Dense bulk pricing — 2026-09-11

Every resolved figure in a completed bulk scan keeps its actual localized amount visible. Regular, compact, and micro chips respond to result density and photo area. The placement planner uses stable lanes, reserves the summary and result rail, keeps chips inside the image, and adds a subtle solid leader line when a chip moves away from its figure. The amount is never replaced by a number-only marker. Tap targets stay at least 44 points and accessibility labels keep the full currency-qualified amount.

The 60-result fixture was visually checked on the small simulator: all prices are visible in separated green chips with clear figure relationships, and the bottom result rail remains unobstructed. The same completed screenshot was captured on the iPhone 17 Pro simulator. Focused layout and dense UI checks pass on the small simulator; large-simulator readiness is slower than the current test timeout, so hardware verification remains open.

## Onboarding startup and preview cleanup — build 176 source — 2026-09-10

- Onboarding opens directly on the demo screen with Get Started visible in the first onboarding surface. The old roughly one-second branded gate was removed; the app launch logo remains the brand handoff.
- The CTA advances to the first detail screen immediately. Its existing large tap target, sign-in path, referral path, and production onboarding behavior remain unchanged.
- Settings no longer shows the temporary hard-paywall onboarding preview. The old preview sheet and isolated mode were deleted; the debug-only Settings root fixture is now `-showSettingsRootDemo`.
- Focused onboarding/Settings checks pass on the small and large simulators. The 229-test unit suite passes on both sizes. The full UI run still has two existing collection-navigation failures on each size because the fixture presents the pre-existing “Could not remove item” alert; this is a separate fixture gap. The signed 1.0.8 (176) archive passed validation and was uploaded to App Store Connect; delivery `5ee44d02-2242-440f-9e4d-6e89ad84f49f` is processing for TestFlight. Physical-device confirmation remains pending.

## Smooth chart and first-launch tip pass — 2026-09-10

- Collection and item graphs use a bounded monotone curve over the existing real-sale samples. The curve remains within each pair of recorded values, keeps actual date spacing, and retains the stable 140-sample identity and short transition used by the live-app direction.
- The Collection and Scan first-launch cards now use a stronger header, concise action copy, numbered icon tiles, clearer spacing, and 44-point dismissal controls. Reduce Motion uses the opacity-only path.
- Final Collection tip screenshot: `/tmp/brickval176-collection-tips-final.png`. The chart and item-detail graphs were inspected in the existing small/large simulator UI captures; the line visibly turns smoothly while keeping the same data.
- Verification after the final source cleanup: the 229-test native unit suite passed on each simulator size; the focused chart regression passed 11 tests; the 13-language audit passed with 807 app strings plus four Info.plist strings; and the Release archive succeeded. The full UI run retains two existing collection-navigation fixture failures on each size. Build 1.0.8 (176) was uploaded to App Store Connect and is processing for TestFlight. Physical iPhone confirmation remains pending.

## TestFlight build 175 — 2026-09-10

Build 1.0.8 (175) includes the general seller-country filter and the stale-empty Used-history recovery. The Release archive `/tmp/BrickVal175.xcarchive` is signed and passes strict verification. The BrickVal unit suite reports 230 tests with zero failures on the small and large simulators; backend tests, type checking, and localization (807 app strings plus four Info.plist strings across 13 locales) pass. Xcode Organizer shows the package as `Uploaded to Apple`; Apple processing remains asynchronous. Live verification returned seller-country rows for 75192 and rejected an expired session with 401. Physical-device visual QA, real TestFlight onboarding, and Sentry symbol ingestion remain pending.

## Seller-country market filters — 2026-09-10

The Collection and item-detail charts include a compact globe menu. It starts at All regions and lists the seller countries returned by BrickLink for the saved rows (for example Canada, the United Kingdom, Australia, or the United States), rather than limiting the product to one country. Selecting a country updates the existing dated graph, 1M/3M/6M snapshot values, coverage text, and chart-derived change with the current short smooth transition; it makes no network request. Current headline values and collection valuation remain unchanged. Missing-country sales remain visible under All regions only. The menu keeps a 44-point target, supports Dynamic Type and Reduce Motion, and restores its choice after restart.

Verification: regional filtering, missing-country handling, persistence, and country-aware history decoding pass native/backend tests. The implementation is included in build 175. Simulator UI and physical-device TestFlight verification remain release checks.

## TestFlight build 174 — 2026-09-10

The native release archive for version 1.0.8 (174) passed signing and strict code-signature validation. The full small-iPhone suite passed after stabilizing the date-sensitive collection-history fixture; the localization audit passed with 802 strings plus four Info.plist strings. App Store Connect accepted the IPA upload with delivery ID `3a379c51-c08e-4fbd-9d65-918f4bc94a4b`; Apple processing is asynchronous and physical-device verification remains pending.

## Collection item market snapshot — 2026-09-09

The item detail keeps the rainbow outlined `Average sold price` badge and its tick icon. Only the standalone grey `Average sold price` source title and the grey `Estimated market history` heading were removed. The completed-sales explanation, current price, market-change percentage, currency conversion, retail comparison, graph, and 1M/3M/6M controls remain.

The chart controls are followed by a timeframe-aware Market snapshot with separate New and Used columns. It shows times sold, total quantity, minimum, arithmetic average, quantity-weighted average, and maximum price from saved BrickLink completed-sale rows. Invalid, future, and out-of-window rows are ignored; empty conditions show an explicit empty state. All values use the active currency formatter and ISO code. Snapshot data is prepared with the chart data, so changing the timeframe makes no history request and remains responsive. Reduce Motion applies the values immediately.

Verification: the focused item-detail UI check confirms the rainbow badge is present, both removed labels are absent, and the 3M snapshot appears after switching. The full native suite passed 240 tests on the BrickVal Small iPhone and 240 on the BrickVal iPhone 17 Pro. The 13-language audit passed with 802 strings plus four Info.plist strings, and the Release configuration compiled successfully. Physical iPhone verification and the separate TestFlight upload remain pending.

## Collection condition quote recovery — 2026-09-09 (after build 173)

Reproduced 75192-1: save a New holding from a result containing New $682.58 and Used $520.82, restart, then select Used. The old detail conversion returned nil: only the owned condition quote was persisted, and the detail screen required an owned slot. The fix persists the complete pricing snapshot, displays the selected condition independently of ownership, and recovers absent snapshots for legacy items through the authenticated lookup on detail opening. This lookup uses the existing provider-request rate limit; it does not grant or spend referral credits. Failed recovery surfaces the existing alert and retains saved data; reopening retries. Both conditions' dated sales now persist, with alternate detail windows prepared off-thread and excluded from portfolio ownership totals. No invented history or duplicate holdings.

Regression command: `xcodebuild -project apps/ios-swift/BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,id=D72A48E4-D384-47D8-8A5E-E9EE9C0B0668' -only-testing:BrickValTests/CollectionStoreTests test`. Red log `/tmp/falcon-red2.log` records two nil-versus-520.82 failures. Green `/tmp/falcon-green2.log` passes 220 tests across 36 suites, including legacy recovery/offline reuse and alternate-history persistence. These are controlled fixtures matching the screenshot amounts, not a live provider quote. Physical-device verification and a new TestFlight release remain pending. The prevention gap was missing cross-condition save/reopen coverage; the regression now exercises persistence plus the actual detail condition conversion.

## Smooth charts and adaptive bulk pricing — build 173 work

The Collection and item charts now use a stable 140-sample identity and a 240 ms smooth line/y-axis morph when switching 1M, 3M, or 6M. Timeframe taps still select prepared data immediately, reset touch inspection, and make no history request; Reduce Motion disables the morph. The same behavior is used by the Collection and item-detail charts, without replaying the old reveal animation.

Completed bulk results now place per-figure prices with a bounded collision planner. Up to 12 results use regular chips, 13–30 use compact chips, and larger scans use micro chips. Tags prefer the figure perimeter, avoid the summary/result rail and neighboring tags, draw a short leader line when moved, and fall back to a numbered marker that expands when selected. Visible tags keep the existing currency-code omission; VoiceOver labels and the result rail retain the full localized amount and currency.

Verification on the BrickVal Small iPhone: 217 native unit tests in 36 suites and all 16 UI tests passed, including stable chart identities, planner cases for 2, 10, 30, and 60 figures, and a dense 60-marker screenshot. The 200-holding performance UI test completed 21 rapid timeframe switches, item navigation, chart inspection, and New/Used switching; bulk completed-price, correction, and largest-text accessibility checks passed. The selected chart/bulk checks also passed on BrickVal iPhone 17 Pro. The 13-language localization audit passed (794 strings plus four Info.plist strings). Physical iPhone verification remains pending.

Release 1.0.8 (173) was archived at `/tmp/BrickVal173.xcarchive`, passed strict code-signature validation, and uploaded to App Store Connect with delivery `e813f2e5-d6fb-48fa-8777-8e15a2985c0d`. Apple reports version 1.0.8 build 173 as `VALID` and on App Store Connect. The BrickVal app dSYM was accepted by Sentry (UUID `b99b8f1f-04e4-395a-a72e-c06a07381801`); the temporary upload token was revoked immediately afterward. The build is uploaded for TestFlight processing; physical iPhone verification remains the final release gap.

## Collection responsiveness — build 172 work

Preserve the existing Collection/item layout and real-history semantics. Timeframe switches select background-prepared results without replaying the reveal animation; touch selection resets on timeframe/condition changes. Initial Release-config fixture tests pass on the small iPhone: 21 switches per screen, p95 about 33 ms to the first display callback after chart data is applied. The large-screen navigation test and the follow-up fixture that waits for all prepared windows pass locally. Captured multi-point graphs and largest-text controls remain visible/reachable. Image sharing/offline/downsampling are unit tested. This is provisional simulator evidence; see `docs/audits/2026-09-09-collection-performance.md` for final tests, release status, production stack evidence, and remaining physical-device checks.

## Purchase diagnostics — build 171

No UI, subscription price, product, or recovery-copy changes. The purchase-controller tests confirm that Apple rejection returns the existing App Store/Screen Time recovery guidance without granting Pro; cancellation and pending approval remain distinct. Full native unit/UI suites pass on iPhone SE and iPhone 17 Pro (222 tests / 448 runs), with all 13 localization checks passing. Device restriction toggles and real Apple test purchases are blocked by unavailable paired iPhones. Do not mark the unidentified build-162/166 customer recovered. See `docs/audits/2026-09-09-purchase-attempts.md`.

Build 171 is available to both internal TestFlight groups and matching Sentry symbols are uploaded. First-launch graph UI tests now dismiss the real tips panel before interacting; both pass locally and in final CI run `34310113931`. The overall CI run remains failed because an older bulk-correction summary assertion timed out. This separate check remains unresolved and is documented in the report.

## Real market-history graphs — build 170

Collection and item detail now render multi-point graphs from dated BrickLink sales. Current valuation stays above a separately labelled market trend; the chart identifies covered holdings. Single prices no longer occupy a full-height history graph. The DEBUG-only Joker/Tintin fixture starts with empty stored history and loads automatically, matching the reported old-collection failure. Apple's chart selection replaces the custom drag recognizer so vertical scrolling remains usable. The local full suite passes 215 tests / 434 runs across iPhone SE and iPhone 17 Pro. Visible collection/item graphs were inspected on both sizes; largest-text timeframe controls pass, while existing entitlement badges still truncate at that size. Build 170 is processed and available to both internal TestFlight groups. Physical-device confirmation remains pending. See `docs/audits/2026-09-08-real-market-history.md` for release evidence.

## Historical saved-value chart recovery — build 169 (superseded)

Collection and item detail retain a visible green chart when only a saved price is available: a dashed reference line, one point and “Saved value” label. It does not imply flat historical performance or show an invented return. Real dated observations continue to render the history curve. Tested with an old Used Robin fixture with no history on iPhone SE (3rd generation); both charts and item quantity controls remain visible/reachable. All 198 native unit tests and 13-language catalog checks pass. Physical-device confirmation remains pending.

## Live reliability rollout — 2026-09-08

The production database repair and signed Clerk deletion integration are live. Backend deployment `dpl_FWhpwtHFCcRj7doPKRgYb1dJz3qi` was promoted after authentication/signature checks. Thirteen verified RevenueCat provider records were seeded while preserving all 15 existing Pro flags. Build 168 includes restart-safe local account-deletion cleanup. Version 1.0.8 (168) is processed and available to both existing internal TestFlight groups. GitHub run 34185416653 passed backend, database and native checks; local native verification passed 206 tests across two simulator sizes (416 runs). Physical iPhone referral, purchase, camera and deletion journeys remain unverified. See the September 8 remediation report for evidence and remaining checks. This section supersedes earlier pending-production notes below.


## Reliability fixes — 2026-09-08

See [remediation status](../../docs/audits/2026-09-08-reliability-remediation.md). Collection recovery, real price/history contracts, pending referrals, recipient messaging and accessible bulk layout have local regression coverage. The final Xcode result reports 206 tests across small and large iPhones (416 runs) with zero failures. Largest-text small-screen action reachability was visually inspected. Production configuration and signed Clerk delivery are verified; real-device deletion, purchases and referrals remain pending. See the live rollout status above for release progress.


## Whole-app audit follow-up — 2026-09-05

**Visual sign-off withheld for build 167.** The bulk white summary has very pale secondary labels, and the largest accessibility text size clips prices, condition controls, and the Add action on the small iPhone. [Report and screenshots](../../docs/audits/2026-09-05-whole-app.md#f11--p1-bulk-summary-contrast-and-accessibility-layout-fail) record the failures. Existing element-existence UI tests passed and did not detect these readability problems.

The full native suites passed on both simulator sizes (186 Swift tests, 2 XCTest photo-import tests, 11 UI tests each). Localization catalogs passed for 13 languages. This does not certify VoiceOver, all translated layouts, real-camera performance, TestFlight referrals, or Apple purchases. Those untested journeys remain explicit gaps in the report. No visual or product fixes were made in this audit; previous implementation/upload notes below remain historical records.

## TestFlight Build 167 QA — 2026-09-05

- Release archive `1.0.7 (167)` succeeded with the Apple Distribution certificate and `BrickVal App Store Build 125` provisioning profile.
- The archived bundle reports identifier `com.brickval.app`, version `1.0.7`, build `167`, and passes deep code-signature validation.
- The exported IPA was uploaded to App Store Connect. Delivery `f2c5b5d0-2e66-444b-9756-5a1b5691e73f` reported `UPLOAD SUCCEEDED`; the follow-up build-status check reports `VALID`, `IMPORT-STATUS: VALID`, and `IS-ON-APP-STORE-CONNECT: true`.
- Build 167 contains the collection detail branding header and compact bulk pricing layout documented below.

final result: uploaded; App Store Connect accepted the build and TestFlight availability may continue asynchronously

## Collection detail branding and compact bulk pricing QA — 2026-09-05

- Collection item detail now keeps the existing BrickValue mark and wordmark in the navigation-bar principal area, so the brand stays visible while the item content scrolls.
- Completed bulk results now group the lot value and identified count in a structured summary. The active ISO currency code appears in that summary; per-figure photo callouts, reveal-rail cards, result cards, match-correction rows, transfer tokens, and shared photo labels show the localized amount without repeating the code, while the share-card total keeps the code.
- VoiceOver and other semantic labels retain the full localized amount with the active ISO code, preserving currency context when the visible tag is compact.
- The native test suite passed on the BrickVal iPhone 17 Pro simulator: 186 unit tests in 30 suites and 11 UI tests, with zero failures. Localization audit and `git diff --check` also passed.
- The complete small-iPhone simulator suite also passed: 186 unit tests in 30 suites and 11 UI tests, with zero failures. A focused rerun cleared one transient correction-sheet timing failure from the first small-device run.

final result: implemented; automated verification passed on both simulator sizes

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

## TestFlight Build 163 QA — 2026-09-04

- The native unit suite passed with 176 tests in 29 suites, and the iOS UI suite passed with 9 tests and zero failures on the BrickVal Small iPhone simulator.
- Localization and notification audits passed: 763 app strings and 4 Info.plist strings are populated across all 13 supported locales, with notification registration carrying the active language code.
- Release archive `1.0.7 (163)` succeeded with the Apple Distribution certificate and `BrickVal App Store Build 125` provisioning profile.
- App Store Connect accepted the upload and reported the package as processing for TestFlight. TestFlight availability will follow Apple's asynchronous package processing.
- The build includes the in-app Profile → Language picker, System default/device-language fallback, and locale-aware UI updates.

final result: uploaded; TestFlight processing pending

## Major-currency conversion QA — 2026-09-04

- Profile → Currency offers System default and the 24 supported ISO codes. The override persists locally, can return to System default, and does not change the app language.
- Market values, collection totals, historical chart points, bulk callouts, accessibility values, and exported share cards format converted display values from canonical USD. Detail and share surfaces disclose “Converted from USD” with the rate date.
- Device-region selection, JPY zero-decimal formatting, stale-rate recovery, unavailable-rate USD fallback, large Dynamic Type, and Arabic right-to-left mirroring remain release checks. Subscription prices continue to come directly from StoreKit.
- Every amount now shows the active ISO code (for example, `A$214.00 · AUD`); unavailable conversion shows the canonical amount as `$214.00 · USD` with the localized fallback message. Profile → Currency shows both the selected preference and the active fallback currency.
- The linked production `/api/mobile/exchange-rates` endpoint is deployed and returns the complete 24-currency contract with USD identity rate `1`.
- Build `1.0.7 (165)` includes the display fix. The signed archive reports `1.0.7 (165)` with the Apple Distribution certificate, App Store Connect processed the upload, and the build is available in both existing internal groups: `TE Team (Expo)` and `V1 v1`.

final result: passed; build 165 is processing-complete and available to internal testers

## Average market price clarity QA — 2026-09-04

- Onboarding’s value example now says “Average market price” and explains that BrickValue uses an average of recent sold prices; active-listing asking-price averages are explicitly labeled when sold data is unavailable.
- The first-run scan tips include the same plain-language definition. Every single and bulk scan shows an average-price explanation after roughly 1.5 seconds of processing without delaying a ready result.
- Native result, collection tiles/detail, bulk result cards/reveal, and share-card labels distinguish “Average sold price” from “Average asking price.” The source detail is available to VoiceOver and remains readable without relying on color.
- The single-scan processing overlay was rechecked on the BrickVal Small iPhone after the longer copy was added. The title and explanation wrap without clipping; the bulk processing title and live completed-item count remain inside the camera stage.
- Reduce Motion keeps the status change immediate, and the copy remains part of the semantic status element. German, Hindi, Japanese, Arabic RTL, and large Dynamic Type remain required release checks.

final result: implemented; native build and visual smoke check passed

## TestFlight Build 166 QA — 2026-09-04

- Release archive `1.0.7 (166)` succeeded with the Apple Distribution certificate and `BrickVal App Store Build 125` provisioning profile; the archived app bundle and code signature validate successfully.
- The exported IPA was uploaded to App Store Connect. Delivery `787cc9af-d26c-438d-84a1-4697ed63a369` reported `UPLOAD SUCCEEDED`; App Store Connect build status is `VALID`, import status is `VALID`, and the build is on App Store Connect for TestFlight processing.
- Build 166 contains the average market-price clarity copy and source labels from the section above. No market-data calculations or subscription pricing were changed.

final result: uploaded; TestFlight processing may continue asynchronously

## 13-language localization QA — 2026-09-03

- The native string catalogs contain English (`en`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Brazilian Portuguese (`pt-BR`), Dutch (`nl`), Japanese (`ja`), Korean (`ko`), Simplified Chinese (`zh-Hans`), Traditional Chinese (`zh-Hant`), Arabic (`ar`), and Hindi (`hi`).
- `npm run test:localization` passed: 763 app strings and 4 Info.plist strings have non-empty values in every locale, matching interpolation placeholders, and required singular/plural forms.
- System default matches the device language automatically with English fallback. The Profile → Language row opens an in-app picker with System default plus all 13 supported languages; the selected override is persisted locally and reflected throughout the app.
- Native strings use locale-aware USD, date, percentage, and quantity formatting. Arabic remains a right-to-left layout concern, and German, Hindi, Japanese, Arabic, and large Dynamic Type require small- and large-device visual review before release.
- Superwall and notification registration receive the effective app locale so paywalls and billing alerts follow the in-app choice; dashboard paywall copy and StoreKit metadata still need locale-by-locale preview verification.
- Simulator unit and UI smoke tests passed on the BrickVal Small iPhone with the test scheme pinned to English/US for deterministic existing assertions. A full language matrix smoke pass and native-language review of sensitive copy remain release checklist items.
- The in-app language smoke test selected 日本語, verified the navigation title changed to 言語, and returned to English for deterministic follow-on tests.

final result: automated localization coverage passed; manual locale and native-language review pending

## Bulk image geometry standardization QA — 2026-09-01

- Bulk photo-library detection now combines the existing source-aspect multiscale pass with a bounded padded 1:1 pass. Square detections map back to the upright source photo, padding-only proposals are discarded, duplicate proposals use the existing overlap threshold, and the 60-region limit is applied after merging. The supplied dense landscape benchmark measured 19 regions from the source pass, 21 from the standardized square pass, and at least 23 after merging.
- The original photo remains unchanged for display, sharing, session upload, retries, and region crops. Recognition and recovery crops now use padded 1:1 JPEG output while retaining the existing 500 KB and 300 KB limits.
- Frozen photos, processing overlays, locked previews, and completed results share one aspect-fit rectangle. The complete photo stays visible with black letterboxing, and detection frames and price callouts use that same rendered rectangle. The processing status surface is bounded to the scanner stage and wraps long Dynamic Type text vertically.
- The wide-photo fixture uses visible left/right edge markers and a long processing message. Visual checks on the BrickVal Small iPhone and BrickVal iPhone 17 Pro confirmed both edges, status text, overlays, controls, and safe-area spacing remain in bounds. The fixture also reaches the scanner shell on a fresh simulator instead of being intercepted by onboarding.
- Geometry unit coverage passed 8/8 focused tests, including landscape, portrait, square, panoramic, rotated, square-box mapping, padding filtering, duplicate merging, and square crop byte limits. The complete native suite passed 162 tests (164 runs including four dynamic-parameter runs) with zero failures on both simulator sizes. Existing accessibility coverage retains Reduce Motion, Reduce Transparency, VoiceOver, Dynamic Type, and 44-point control checks.
- No image, crop, or private fixture was committed, logged, sent to analytics, or sent to Sentry. These geometry changes are included in signed and uploaded build `1.0.6 (162)`.

final result: passed

## TestFlight Build 162 QA — 2026-09-01

- The complete native simulator suite passed with 173 tests, zero failures, and zero skips on the BrickVal Small iPhone simulator. The Release simulator compile also succeeded.
- The signed archive reports version `1.0.6 (162)` with bundle identifier `com.brickval.app`, and includes the bulk image-geometry standardization plus the normalized Pro purchase-failure flow.
- App Store Connect accepted the upload and TestFlight now reports build `162` as `Ready to Submit`; the build is assigned to the existing internal testing groups.
- Physical iPhone purchase verification remains pending for annual/monthly purchase, seven-day trial eligibility, restore purchases, and offer-code redemption.

final result: passed; physical-device purchase verification pending

## Pro Purchase Failure QA — 2026-09-01

- StoreKit and RevenueCat purchase failures are mapped to plain-language recovery states. The reported `purchaseNotAllowedError` no longer surfaces Apple’s raw “The device or user is not allowed to make the purchase.” message; it tells the user to check App Store or Screen Time purchase settings and retry.
- Missing products and configuration failures use a temporary-unavailable message. Network and App Store failures ask the user to retry. Cancellation and pending purchases do not create a failure alert.
- Failed transactions return the normalized error to Superwall, so the paywall remains available for another attempt. Annual and monthly products retain their existing trial, entitlement, restore, and offer-code flows.
- Release Sentry diagnostics contain only the product ID, paywall placement, app build, RevenueCat error code, and StoreKit domain/code. They exclude Apple ID, receipt data, purchase tokens, email, raw SDK messages, and purchase payloads.
- The production-root UI fixture `-showPurchaseFailureRootDemo` displayed the normalized alert through `AppRootView`; the raw StoreKit message was absent. The full native suite passed with 163 unit tests and 8 UI tests on the BrickVal Small iPhone simulator. Release compilation also passed.
- Physical iPhone 14 / iOS 26.6 verification of annual purchase, monthly purchase, trial eligibility, restore, and offer-code redemption remains pending. On 2026-09-01, the signed-in dashboards were verified: App Store Connect shows both products Approved and available in all regions, with the annual introductory offer active; the Paid Apps Agreement, tax forms, and bank account are Active; RevenueCat maps both production products to `pro`; and Superwall's active purchase campaign lists the same product IDs. The fix is included in TestFlight build `1.0.6 (162)`.

final result: code and production configuration verified; physical-device purchase verification pending

## Bulk scan header branding / Build 161 QA - 2026-09-01

- Replaced the green scan-symbol tile in the bulk-scan header with the existing BrickValue app mark and changed the visible wordmark from `BrickVal` to `BrickValue`.
- The compact header uses the verified native logo asset and smaller system typography so the full wordmark, “Bulk scan” label, share action, and close action all remain visible on the small iPhone.
- Small-iPhone targeted UI coverage passed for the branded icon and wordmark; the complete native suite passed with 153 tests (155 runs including four dynamic-parameter runs) and zero failures.
- Visual QA confirmed the full icon/wordmark treatment and persistent per-figure prices remain visible in the completed bulk-results state. Build `1.0.6 (161)` was signed, uploaded to App Store Connect, and is processing for TestFlight.

final result: passed

## Bulk completed price callouts / Build 160 QA - 2026-09-01

- Reproduced the reported regression: the live reveal owned one price callout, while completed review rendered only detection boxes, so prices disappeared after the final result returned.
- Added a persistent per-region price-callout layer for resolved bulk results. Each callout is keyed to its detected region, remains visible in completed review, and updates safely if a match is corrected.
- The completed-state UI regression verifies two resolved figures and their separate USD prices after the final summary appears. Price callouts retain VoiceOver labels and stable identifiers.
- Small-iPhone visual QA confirmed both prices remain above their matching figure boxes while the summary, detection frames, result rail, and Add action remain intact.
- The complete native suite passed with 153 tests (155 runs including four dynamic-parameter runs) and zero failures on the BrickVal Small iPhone. Build `1.0.6 (160)` was signed, uploaded to App Store Connect, and is processing for TestFlight.

final result: passed

## Hard-paywall preview button fix / Build 158 QA - 2026-08-28

- Reproduced the Settings issue: the temporary preview row was present and tappable, but the onboarding sheet did not appear.
- Fixed the presentation route by consolidating Settings sheets into one identifiable sheet state; account presentation remains available and the hard-paywall preview now opens reliably.
- Added a UI regression test that taps the preview action and verifies both the preview close control and onboarding start control.
- The small-iPhone native suite passed with 149 tests and zero failures. Release archive `1.0.6 (158)` succeeded, was signed, and was accepted by App Store Connect for TestFlight processing.

final result: passed

## Hard-paywall preview and universal free bulk preview / Build 159 QA - 2026-08-28

- The Settings preview now runs through the production `AppRootView` with an isolated onboarding mode. It completes the normal pages, invite-code page, and local hard-access transition without changing onboarding completion, cohort assignment, review eligibility, account identity, referral claims, or onboarding analytics. `Close preview` remains available and returns to Profile without rebuilding the app root.
- Locked bulk preview now applies to every app-accessible non-Pro user with zero usable introductory and referral bulk credits. Users with either credit, Pro users, and hard-paywall users retain their real-scan or app-gate behavior.
- A locally eligible locked scan keeps the captured photo clear, runs the on-device detector and scan beam, reveals one locked placeholder card per detected region, and presents exactly `Upgrade` and `Refer`. The preview makes no identification, pricing, or scan-consumption request; the `Refer` action opens Invite friends. A stale local allowance that receives a bulk-limit `402` is converted into the same preview instead of opening the paywall immediately.
- Small-iPhone visual QA confirmed the normal and Reduce Motion layouts: clear frozen photo, visible detection frames, progressive placeholder reveal, readable offer surface, safe-area spacing, and 44-point actions. Placeholder cards expose locked-state VoiceOver language; Reduce Transparency uses an opaque offer surface and Dynamic Type remains on system text styles.
- Production-root hard-preview coverage and locked-preview Upgrade/Refer coverage passed. The complete native suite passed with 152 tests (154 runs including four dynamic-parameter runs) and zero failures on the BrickVal Small iPhone. Build `1.0.6 (159)` was signed, uploaded to App Store Connect, and is processing for TestFlight.

final result: passed

## Sentry HTTP Failure Capture QA — 2026-08-28

- The shared `BRICKVAL-J` event was confirmed as a handled HTTP 503 generated by Sentry's automatic network-failure tracker, not an app crash.
- Sentry's default wildcard request target was replaced with the configured BrickVal API host, keeping genuine backend 5xx telemetry while excluding third-party auth and purchase SDK traffic.
- The focused regression test passed red before the fix and green after it. The full native simulator suite passed with 148 tests and zero failures.
- Release build `157` compiled successfully locally. It has not been uploaded to TestFlight.

final result: passed

## Temporary hard-paywall onboarding preview / Build 156 QA - 2026-08-28

- Profile/Settings includes a temporary “Preview hard-paywall onboarding” action.
- The preview runs onboarding through the review prompt, account/referral steps, and final hard-access screen.
- The action is included in the uploaded TestFlight build for validation and should be removed after this test cycle.
- Build `1.0.6 (156)` was accepted by App Store Connect and is processing for TestFlight.

## TestFlight Build 154 QA - 2026-08-28

- Native unit and UI tests passed with 0 failures before archive.
- Release archive succeeded and App Store Connect accepted version `1.0.6`, build `154` for processing.
- Build includes referral onboarding, referral invite status, locked bulk preview, and referral-credit fallback behavior.

Package status: processing

## Free-user Bulk Preview Fix / Build 155 QA - 2026-08-28

- Reproduced the paywall-only path: production was returning monetization policy version 4, while the native rollout expected version 5 with the locked-preview flag disabled.
- Policy version 6 now enables the detector-only locked preview by default for new soft users. The explicit environment switch remains available as a rollback.
- New soft users with no introductory or referral bulk credit route to `BulkScanPresentation.accessMode == .lockedPreview`; no identification, pricing, or scan-consumption request is started.
- Pro users, users with an introductory/referral credit, and hard-gated users keep their existing access behavior.
- The small-iPhone native suite passed with 147 tests and 0 failures. The signed `1.0.6 (155)` Release archive completed successfully and was not uploaded to TestFlight.

final result: passed

## Onboarding Review Prompt And Invite Friends Redesign QA - 2026-08-28

- Screen 5 now requests Apple's native review prompt once after the screen settles and exposes a visible `Leave a review` fallback action.
- The referral progress bar, invite code, sharing, claiming, Universal Link handling, and server-ledger behavior remain unchanged.
- The Invite friends screen now uses a focused reward hero, explicit progress state, three-step visual progress markers, copy/share actions, and a separate claim-code section.
- Controls retain at least 44-point touch targets, system text styles, semantic colors, VoiceOver labels, and Reduce Motion-safe status transitions.
- The updated native project builds and the small-iPhone UI suite passes with zero failures. No TestFlight upload was made for this implementation task.

final result: passed

## Referral-Aware Onboarding And Locked Bulk Preview QA - 2026-08-27

- First-run onboarding now offers optional invite-code entry after account setup. Apply requires sign-in, Skip remains available after network errors, and Universal Links prefill the code.
- A referral qualifies only when a claimed invitee completes onboarding. The server enforces one qualifying account and one installation using a hash of the Keychain-backed installation UUID; scans do not qualify referrals.
- Hard-cohort users receive a final Subscribe or Invite 3 friends choice. Three qualified onboarding completions grant three bulk-scan credits once; credits are atomic and never grant Pro entitlement.
- New soft users receive unlimited local locked previews with zero identification, pricing, or scan-consumption requests. The preview shows the real detected count and frames, never fake prices, and requires a fresh scan after an unlock.
- Existing users retain their unused introductory bulk allowance. Referral credits are the fallback only after that allowance is consumed.
- If an existing anonymous installation later signs in, the app syncs its unused introductory allowance once through the authenticated monetization endpoint; the server stores only an installation hash and rejects reuse by another account.
- PostHog captures referral entry/claim/completion and preview/upgrade/rescan metadata only; invite codes, photos, crops, tokens, and scan payloads are excluded.
- Accessibility coverage includes 44pt controls, Dynamic Type, VoiceOver locked-state language, Reduce Motion crossfades, and Reduce Transparency-safe placeholders.
- The native suite and targeted backend tests passed after implementation. At that time the feature flag defaulted off pending the database migration and backend deployment; the current policy-v6 rollout is recorded above.

final result: passed

## Staged Bulk Scan And Value Transfer QA - 2026-08-26

- The result view now begins with a distinct 1.6-second top-to-bottom scan pass immediately after the photo expands to the immersive aspect-fit stage.
- Lookup and pricing work starts with the existing bounded four-request pipeline while the scan pass is visible. The beam does not repeat during the ordered value reveal.
- Ordered results use a `clamp(16.8 / figureCount, 0.42, 0.75)` cadence. A ready 60-figure lot targets approximately 28.65 seconds including the scan, jackpot hold, and return transition.
- Each priced figure holds its USD callout, then sends one compact `+USD X.XX` token from the detected figure to the centered lot-value HUD. The authoritative total advances when the token arrives; unavailable prices hold briefly without changing the total.
- The lot-value HUD is positioned from the fitted photo geometry, with a safe-area fallback when the photo has insufficient top letterbox space. The recent-result rail remains bottom aligned and the final jackpot remains a single overlay.
- Reduce Motion removes beam travel and the flying token, retaining scan progress, price text, result frames, and the final total through short crossfades.
- Added session cadence coverage for 1, 10, 40, 50, and 60-item lots, including the 28.65-second 60-item duration and the 0.75-second small-lot cap. The full Swift suite passed with 131 unit tests and the UI suite passed with 3 tests on the BrickVal Small iPhone simulator.

final result: passed

## TestFlight Build 153 QA - 2026-08-26

- Release archive verified as version `1.0.5 (153)` with bundle identifier `com.brickval.app`.
- Archive signing used the Apple Distribution identity and `BrickVal App Store Build 125` profile.
- The staged bulk scan and value-transfer reveal is included in the uploaded native build.
- App Store Connect accepted the upload and reports that package processing has started.

final result: passed

## TestFlight Build 150 QA - 2026-08-26 (superseded)

- Build `150` replaced only the bulk detector with the seed-29 YOLOv8n Core ML export at 1024px; single-figure detection and identification were unchanged.
- A post-upload contract check found that this export exposed a raw tensor rather than Vision object observations, so photo-library detection returned no local regions and could reach the whole-photo compatibility result.
- Build `151` supersedes this package with the NMS-enabled, Vision-compatible export and a runtime contract guard.
- The small-iPhone native test suite passed with zero failures before archiving.
- The signed archive was uploaded to App Store Connect; package processing is asynchronous before the build appears in TestFlight.

final result: superseded

## TestFlight Build 151 QA - 2026-08-26

- Build `151` keeps the seed-29 YOLOv8n weights and corrects the Core ML export contract by enabling NMS, producing the `image`, `iouThreshold`, and `confidenceThreshold` inputs plus `coordinates` and `confidence` outputs required by Vision.
- The native detector now rejects an incompatible bulk package at load time instead of allowing an empty local region list to reach the whole-photo compatibility path.
- The deterministic dense-photo harness returned 63 `VNRecognizedObjectObservation` results from build 151; the broken build-150 package returned one raw tensor and zero recognized observations.
- The small-iPhone native suite passed before archiving. The signed archive contains the corrected compiled bulk model and reports build `1.0.5 (151)`.
- App Store Connect accepted the upload; package processing is asynchronous before the build appears in TestFlight.

final result: passed

## TestFlight Build 149 QA - 2026-08-26

- Build `149` was generated from the native SwiftUI source with the distribution certificate and App Store provisioning profile.
- The small-iPhone native test suite passed with zero failures before archiving.
- App Store Connect accepted the upload; package processing is asynchronous before the build appears in TestFlight.

final result: passed

## TestFlight Build 148 QA - 2026-08-26

- Release archive verified as version `1.0.5 (148)` with bundle identifier `com.brickval.app`.
- Archive signing used the Apple Distribution identity and `BrickVal App Store Build 125` profile.
- Full native verification passed on the BrickVal Small iPhone simulator: 129 unit tests and 3 UI tests, zero failures.
- App Store Connect accepted the upload; package processing is asynchronous.
- Build 148 includes the Social-First Bulk Value Reveal presentation: hook, scan beam, price callouts, jackpot, and completed review flow.

final result: passed

## Bulk Reveal Total HUD QA - 2026-08-26

- The live lot value HUD is centered in the upper reveal safe area instead of being pinned to the leading edge.
- The hierarchy now presents `LOT VALUE`, a larger USD total, and the priced-figure progress as one stable control surface.
- Each priced figure briefly shows its incremental `+USD` contribution while the total uses the native numeric transition; the reserved contribution row prevents layout movement.
- The HUD uses a restrained green border/shadow pulse to show which result changed. Reduce Motion keeps the value update and uses an immediate state change without scale motion.
- The UI regression confirmed one centered `bulkReveal.total` element with a minimum 54-point height. Full verification passed with 129 unit tests and 3 UI tests on the BrickVal Small iPhone simulator.

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
- Added regression coverage for lots containing 1, 10, 40, 50, and 60 entries.
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

## Social-First Bulk Value Reveal QA - 2026-08-25

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

## Contextual Bulk Match Correction QA - 2026-08-26

- Removed the persistent `+ Missed` control and the multi-figure recovery interaction from the bulk results presentation. Backend recovery types remain for older builds and exact-region retry compatibility.
- Tapping any detected frame or a result-card match control opens one compact match sheet. The current match is first and cached alternatives are limited to three total candidates.
- Identified selected frames are green, identified deselected frames are quiet grey, and unidentified detections remain visible with a neutral dashed frame and question mark.
- `None of these` removes the region from the identified count, running total, top-find calculation, and collection payload without hiding its detection frame.
- A cached correction does not make another network request. An unidentified region can retry exactly once using its original detection box; no free-tap or nearest-figure crop is used.
- The centered reveal HUD keeps a stable numeric layout and briefly emphasizes each genuine priced addition. `Price unavailable` remains explicit and does not increment the priced count.
- Correction logging contains metadata only and excludes images and crops. Research rationale and final interaction rules are recorded in `docs/research/bulk-match-correction-flow-2026-08-26.md`.
- The compact iPhone UI regression covers removal of the old recovery entry point and correction from both a detected frame and a result card. Full Swift and UI verification passed with 134 tests on both the BrickVal Small iPhone and BrickVal iPhone 17 Pro simulators, with zero failures. A manual compact-simulator screenshot confirmed a single summary, one result rail, persistent unresolved frames, and no `+ Missed` control.

final result: passed
