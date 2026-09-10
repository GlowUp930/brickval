# BrickVal Native iOS Context

## Collection Used-history recovery — after build 174

The affected 75192 screen showed the current Used sold average but no Used graph. Direct BrickLink evidence returned 27 Used rows; the live `collection-history:v1:set:75192:none` cache held 26 valid Used rows, including 17 in 3M. Its New 3M counts (10 sales, 19 units) exactly matched the screenshot, proving the endpoint payload reached the app. The reproducible native defect was freshness handling: a prior empty history plus a recent fetch timestamp suppressed recovery for 24 hours even when the pricing snapshot said completed sales existed.

`CollectionStore` now considers that state incomplete and refreshes it on Collection/detail opening. Complete cached histories keep their existing 24-hour behavior. The exact Used 75192 save/reopen path and the stale-empty recovery both have regressions; the complete small-simulator unit suite passes 224 tests across 36 suites, the collection-history backend tests pass, and all 13 locales pass. No backend, database, pricing, or allowance change was needed. A new TestFlight build and confirmation on the affected device remain pending.

## TestFlight build 174 — 2026-09-10

The native Release archive is version 1.0.8 build 174, signed with the BrickVal App Store profile and passing strict code-signature validation. The full small-iPhone suite passed after making the collection-history fixture use a stable test clock; localization passed with 802 strings plus four Info.plist strings. App Store Connect accepted the IPA upload with delivery ID `3a379c51-c08e-4fbd-9d65-918f4bc94a4b`; package processing is asynchronous. Physical-device verification remains pending.

## Collection item market snapshot — 2026-09-09

Item detail now keeps the rainbow outlined `Average sold price` badge with its tick icon and removes only the standalone grey `Average sold price` title plus the grey `Estimated market history` heading. The completed-sales explanation, market-change percentage, current valuation, graph, and timeframe controls remain.

The new Market snapshot panel presents New and Used completed-sale statistics for the selected 1M, 3M, or 6M window: times sold, total quantity, minimum, arithmetic average, quantity-weighted average, and maximum. It reads saved BrickLink sale rows, filters invalid/future/out-of-window rows, formats values in the active currency, and shows an explicit empty state. Snapshot preparation shares the chart calculation, so timeframe changes make zero history requests and Reduce Motion updates immediately. The rainbow badge accessibility label and animation are unchanged.

Verification: focused UI coverage confirms the badge remains and both grey labels are gone, with 3M snapshot values available after a local timeframe switch. The full native suite passed 240 tests on the small simulator and 240 on the large simulator; the 13-language audit passed with 802 strings plus four Info.plist strings; Release compilation passed. This change is committed on `codex/swift-repo-structure`; physical-device verification and the separate TestFlight upload remain pending.

## Collection condition quote recovery — 2026-09-09 (after build 173)

Reproduced 75192-1: save a New holding from a result containing New $682.58 and Used $520.82, restart, then select Used. The old detail conversion returned nil: only the owned condition quote was persisted, and the detail screen required an owned slot. The fix persists the complete pricing snapshot, displays the selected condition independently of ownership, and recovers absent snapshots for legacy items through the authenticated lookup on detail opening. This lookup uses the existing provider-request rate limit; it does not grant or spend referral credits. Failed recovery surfaces the existing alert and retains saved data; reopening retries. Both conditions' dated sales now persist, with alternate detail windows prepared off-thread and excluded from portfolio ownership totals. No invented history or duplicate holdings.

Regression command: `xcodebuild -project apps/ios-swift/BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,id=D72A48E4-D384-47D8-8A5E-E9EE9C0B0668' -only-testing:BrickValTests/CollectionStoreTests test`. Red log `/tmp/falcon-red2.log` records two nil-versus-520.82 failures. Green `/tmp/falcon-green2.log` passes 220 tests across 36 suites, including legacy recovery/offline reuse and alternate-history persistence. These are controlled fixtures matching the screenshot amounts, not a live provider quote. Physical-device verification and a new TestFlight release remain pending. The prevention gap was missing cross-condition save/reopen coverage; the regression now exercises persistence plus the actual detail condition conversion.

## Purchase attempt diagnostics — build 171

Purchase and restore now emit correlated start/finish events to existing PostHog analytics and Sentry breadcrumbs; failures include matching attempt/customer-hash tags and context. The customer field is a SHA-256 RevenueCat ID, captured before the operation; no raw identity or payment/receipt payload is added. Apple permission, cached storefront, OS, build, product and monotonic elapsed time accompany separate purchased/cancelled/pending/failed/restored outcomes. Existing SDK behavior and product configuration are unchanged. Full small/large native verification passes 222 tests / 448 runs, including seven new controller/diagnostic tests, plus the 13-language audit. Original customer recovery and physical Apple restriction testing remain blocked. Release evidence and correlation instructions: `docs/audits/2026-09-09-purchase-attempts.md`.

Release complete: Apple processed **1.0.8 (171)** (`cc796f1e-f5ff-4ec3-8c47-b12b157dc738`); both existing internal groups have access and testing notes are saved. Sentry visibly lists the matching BrickVal debug UUID `c77f9720-642f-3f18-b34b-1ab037d34678`, plus framework symbols. Product source `bfabdf7`. Graph UI checks exposed a fresh-install tips panel covering the controls. The tests now force first-launch tips and dismiss “Got it” before asserting graph interaction; local red/green tests and final GitHub run `34310113931` confirm the correction. All purchase/unit/backend/database checks pass. The overall CI run still failed a pre-existing bulk-correction test waiting for its summary, also seen before this task in run `34197294396`; its cause remains unverified. Shipped product code is unchanged by the graph test correction. See the report for evidence and follow-up.

## Responsive charts and image loading — build 172

Build 172 is archived as version 1.0.8 (172) from the normal Release configuration. History preparation now waits off the main actor, chart timeframe selection reuses prepared windows, and public product images use shared memory/disk caching with background downsampling. The production Sentry hang report for build 171 points to the exact synchronous date-parsing path removed here. Local focused small/large interaction checks pass; physical-device confirmation remains required. Sentry has all three build 172 debug files. Xcode Organizer uploaded build 172 successfully; App Store Connect processed it as Ready to Submit (build ID `f69f63a0-77e2-48e5-9629-7b86b423620e`) and attached both internal groups. Testing notes are saved.

## Real market-history restoration — build 170

Collection now requests real dated sales automatically, including for existing items with empty history. `/api/mobile/collection-history` is deployed and promoted at `dpl_F4aceFoU4FMhHuMd9okhhdw8g3qV`. Live checks returned 20 New/2 Used sales for Joker 70919 and 22 New/0 Used for Tintin 21367, without per-item errors; invalid bearer authentication returns 401. History uses an independent request budget, not scan or referral credits.

Native `marketSales` persists separately from recorded scan prices. Daily weighted averages use real date spacing and current quantities; fixed-subset coverage and a common known start avoid invented past prices. Current valuation and historical return are separate. The 1M/3M/6M controls retain Pro gates; empty/single-point history uses a compact status. Apple's built-in chart selection preserves touch inspection and vertical scrolling.

Release complete: Apple processed 1.0.8 (170), build ID `21a1b47e-4cda-4faf-9634-1b7bbf60625a`; both Team (Expo) and v1 internal groups have access and testing notes are saved. Signed archive `/tmp/BrickVal170Final.xcarchive`, successful upload log `/tmp/brickval170-upload-api.log`. Local full suite passed 215 tests / 434 runs on small and large simulators; strengthened visible-detail checks also passed on both sizes. GitHub run `34197294396` has passed backend and isolated database setup and is still running native verification at handoff. Physical-device confirmation remains pending. Full evidence: `docs/audits/2026-09-08-real-market-history.md`.

## Historical collection chart fix — build 169 (superseded)

The build 168 audit fix hid every chart without two dated observations, while normal lookup responses often contain no historical series. Build 169 restores a clearly labelled single saved-value reference chart in Collection and item detail, keeps unavailable prices unavailable, and preserves recorded prices across rescans/restart (including Used slots). A missing series no longer blanks a fully priced portfolio. Historical movement is shown only from dated observations; historical data is not backfilled or invented.

Verification: `/tmp/BrickValChartRed.xcresult` reproduced missing chart data; `/tmp/BrickValChartFinal.xcresult` passes 198 native unit tests (200 runs). Localization passes 788 strings plus four permission strings across 13 locales. Old Robin fixture without history was inspected on the small simulator in Collection and item detail (`/tmp/brickval-chart-small-fixed.png`, `/tmp/brickval-chart-detail-fixed.png`).

Release: source `defcd86`, signed archive `/tmp/BrickVal169.xcarchive`, upload log `/tmp/brickval169-upload.log` reports success. Apple processing is complete; 1.0.8 (169), build ID `7fc0b0f6-f10b-4657-861d-b5247a05cb90`, is available to internal groups Team (Expo) and v1. Testing notes were saved. GitHub run `34190868867` passed backend, isolated database and native simulator verification.

## Live reliability rollout — 2026-09-08

The production database repair and signed Clerk deletion integration are live. Backend deployment `dpl_FWhpwtHFCcRj7doPKRgYb1dJz3qi` was promoted after authentication/signature checks. Thirteen verified RevenueCat provider records were seeded while preserving all 15 existing Pro flags. Build 168 includes restart-safe local account-deletion cleanup. Version 1.0.8 (168) is processed and available to both existing internal TestFlight groups. GitHub run 34185416653 passed backend, database and native checks; local native verification passed 206 tests across two simulator sizes (416 runs). Physical iPhone referral, purchase, camera and deletion journeys remain unverified. See the September 8 remediation report for evidence and remaining checks. This section supersedes earlier pending-production notes below.


## Reliability fixes — 2026-09-08

See [remediation status](../../docs/audits/2026-09-08-reliability-remediation.md). Collection recovery, real price/history contracts, pending referrals, recipient messaging and accessible bulk layout have local regression coverage. The final Xcode result reports 206 tests across small and large iPhones (416 runs) with zero failures. Largest-text small-screen action reachability was visually inspected. Production configuration and signed Clerk delivery are verified; real-device deletion, purchases and referrals remain pending. See the live rollout status above for release progress.


## Reliability audit — 2026-09-05

Build 167 was uploaded, but **reliability is not signed off**. The [whole-app report](../../docs/audits/2026-09-05-whole-app.md) records 15 prioritized findings and an ordered remedy backlog. Production schema is missing fields/RPCs expected by referral, introductory-credit, and notification code. Local isolated tests also reproduce lost simultaneous referral rewards, scan authorization bypasses, subscription state errors, incorrect market values/history, and destructive collection recovery. Earlier statements that new users cannot claim legacy credit describe intent; the audit reproduces a server validation gap.

Verification: 186 Swift tests, 2 XCTest photo-import tests, and 11 UI tests passed on each small and large simulator; 68 backend tests, type-checking, and 13-language checks passed. Bulk contrast and largest Dynamic Type failed visual review. Real TestFlight referral, account switching/deletion, and Apple purchase/restore journeys remain blocked by unavailable devices/test identities. No product fixes, production migrations, or new release were performed during the audit.

Last verified: 2026-09-05

Latest release status (2026-09-05): native build `1.0.7 (167)` was archived, signed, and uploaded to App Store Connect after the collection branding and compact bulk pricing changes; App Store Connect reports the delivery and import as valid and the build is present for TestFlight processing. Build `1.0.7 (165)` contains the production currency-route deployment fix and explicit ISO-code display on every converted or fallback value; it was signed, uploaded, processed, and is assigned to the existing `TE Team (Expo)` and `V1 v1` internal groups for testing. Previous build `1.0.6 (162)` remains Ready for Distribution. Purchase incident status (2026-09-02): the first live physical-device yearly purchase attempt produced RevenueCat code `3` with `StoreKit.Product.PurchaseError` code `2`, which is Apple's account/device purchase-not-allowed result. The app's product IDs and RevenueCat/Superwall configuration remain unchanged; verify the affected Apple account/device settings and a second unrestricted account before changing purchase configuration.

This is the working context for the canonical BrickVal mobile app. It is intentionally specific to the native SwiftUI app. Repository-wide rules remain in [`AGENTS.md`](../../AGENTS.md).

## Active App

- Native app: `apps/ios-swift/`
- Branch for current native work: `codex/swift-repo-structure`
- Bundle identifier: `com.brickval.app`
- Minimum iOS version: 17.0
- Swift version: 6.0 with strict concurrency enabled
- Current marketing version: `1.0.7`
- Source/UI baseline: native SwiftUI build `46` (`1f58cec`).
- Current source release build number: `167`. Build `100` was uploaded from the wrong Expo project and cannot be deleted through the available App Store Connect API, so later native builds must continue from that App Store sequence. Build `151` re-exported the seed-29 YOLOv8 weights with Core ML NMS enabled and restored Vision object detections. Build `152` briefly removed the bulk manifest caps; the current source-aware contract is restored at 60 camera regions and 60 photo-library regions across the native and hosted request boundaries. Build `153` includes the staged bulk scan and value-transfer reveal. Build `154` contains the referral onboarding and locked bulk preview implementation and was uploaded to App Store Connect on 2026-08-28; version `1.0.6` is processing for TestFlight. Build `155` enables the locked preview by default for new soft users and was archived locally on 2026-08-28; it has not been uploaded. Build `156` adds a temporary Settings entry for previewing the hard-paywall onboarding flow, was uploaded to App Store Connect on 2026-08-28, and is processing for TestFlight. Build `157` limits native Sentry automatic HTTP-failure capture to the configured BrickVal API host; it was Release-compiled locally and was not uploaded. Build `158` fixes the temporary hard-paywall onboarding preview button by routing Settings sheets through one presentation state, adds UI regression coverage, and was uploaded to App Store Connect on 2026-08-28; it is processing for TestFlight. Build `159` isolates the Settings hard-paywall preview from production onboarding state, broadens locked bulk preview eligibility to every app-accessible non-Pro user with no usable introductory or referral credit, adds the frozen-photo fallback for server bulk-limit responses, passed the full native suite, was signed, and was uploaded to App Store Connect on 2026-08-28; package processing is in progress. Build `160` keeps each resolved bulk figure's USD price callout anchored to its detected region after the reveal completes, passed the full native suite with 153 tests and 155 runs, was signed, and was uploaded to App Store Connect on 2026-09-01; package processing is in progress. Build `161` replaces the green scan-symbol tile in the bulk-scan header with the BrickValue app mark and changes the visible wordmark to `BrickValue`, passed the full native suite with 153 tests and 155 runs, was signed, and was uploaded to App Store Connect on 2026-09-01; App Store Connect reports it Complete and TestFlight marks it Ready to Submit. The current source also standardizes bulk photo geometry: photo-library detection combines source-aspect and padded-square local passes, maps square detections back to the upright photo, and applies the 60-region cap after merging; bulk presentation uses one aspect-fit rectangle and recognition/recovery crops are padded 1:1 JPEGs. Build `162` includes these geometry changes and the Pro purchase-failure normalization, passed the complete native suite, was signed, uploaded to App Store Connect on 2026-09-01, and is Ready to Submit in TestFlight. Build `163` contains the 13-language localization and in-app language picker, passed the native test suite and localization audits, was signed, archived as version `1.0.7`, and was uploaded to App Store Connect on 2026-09-04; package processing is in progress. Build `164` adds the 24-currency display setting, USD-based daily rate endpoint/cache, converted price surfaces, localized stale/unavailable fallback copy, and currency tests; it was uploaded to App Store Connect and remains in processing. Build `165` adds explicit ISO-code labels to every market-value surface and the unavailable-rate USD indicator; build `167` adds the collection detail branding header and compact bulk pricing treatment and is uploaded for TestFlight processing.
- Build `165` adds explicit ISO-code labels to every market-value surface and the unavailable-rate USD indicator; the linked production endpoint is live, and App Store Connect reports the build as processed and available in both existing internal testing groups.
- The Pro purchase path now initializes RevenueCat before Superwall, routes both `com.brickval.app.pro.yearly` and `com.brickval.app.pro.monthly` through an injectable RevenueCat client, and normalizes StoreKit/RevenueCat failures into retryable user-facing messages. Cancellation and pending purchases remain non-alerting. Release Sentry purchase diagnostics are limited to product ID, placement, app build, RevenueCat code, and StoreKit domain/code; no Apple ID, receipt, token, email, or raw SDK message is recorded. The source fix is included in signed and uploaded build `1.0.7 (163)`. On 2026-09-01, App Store Connect, RevenueCat, and Superwall were verified: both Apple subscriptions are Approved and available in all regions, the Paid Apps Agreement, tax forms, and bank account are Active, RevenueCat's `pro` entitlement maps to both products, and Superwall's active purchase campaign uses the same product IDs. Physical-device purchase verification remains pending.
- Referral rewards are implemented as a signed-in, server-ledger feature: three distinct invited accounts must each claim a code and complete onboarding before the referrer receives three bulk-scan credits. Credits are consumed atomically at the bulk-scan gate and never change Pro entitlement. Invite links use `https://brickvalue.live/r/<code>` Universal Links with an App Store fallback; referral codes, claims, onboarding qualifications, rewards, and credit consumption are stored in Supabase RPC-backed tables. Account and installation uniqueness use a server-side hash of a Keychain-backed installation UUID. Existing anonymous installations sync one unused local introductory credit to a signed-in account once, bound to that installation hash; new soft users cannot use that path.
- Onboarding screen 5 requests the native StoreKit review prompt once when the screen appears and keeps a visible `Leave a review` action available; iOS may suppress the system prompt according to its own review limits.
- The Invite friends screen keeps the referral progress bar, invite code, share flow, and code-claim flow while using a dark BrickVal hero, clearer reward hierarchy, copy-code action, larger native controls, and explicit status messaging.
- The build `115` bulk backend was deployed to production on 2026-08-12 and verified against photographed 0-, 1-, 2-, and 3-figure cases. Failed scans pause live detection so their error message remains visible until the user retries. Build `135` was archived and uploaded to App Store Connect on 2026-08-18 and is processing for TestFlight.
- Build `137` was archived and verified on 2026-08-19 after the rapid valuation sweep changes and uploaded to App Store Connect. Build `139` was archived and uploaded on 2026-08-20; App Store Connect accepted it and it is processing for TestFlight.
- Build `141` was archived, signed, and uploaded on 2026-08-21 after the immersive bulk reveal UI and regression suite passed. App Store Connect accepted the package and it is processing for TestFlight.
- Build `142` was archived, signed, and uploaded on 2026-08-22 after the direct paywall and update-gate changes passed the release checks. App Store Connect accepted the package and it is processing for TestFlight.
- Build `143` was archived, signed, and uploaded on 2026-08-22 after the photo-library bulk import regression fix and full iOS suite passed. App Store Connect accepted the package and it is processing for TestFlight.
- Build `144` was archived, signed, and uploaded on 2026-08-22 after the upgrade-routing and duplicate bulk-status fixes. App Store Connect accepted the package and it is processing for TestFlight.
- Build `145` was archived, signed, and uploaded on 2026-08-24 after the small-iPhone suite passed with 126 unit tests and 2 UI tests. App Store Connect accepted the package and it is processing for TestFlight.
- Build `146` was archived, signed, and uploaded on 2026-08-24 after the simplified bulk reveal regression suite passed. App Store Connect accepted the package and it is processing for TestFlight.
- Build `148` was archived, signed, and uploaded on 2026-08-26 after 129 unit tests and 3 UI tests passed. App Store Connect accepted the package and it is processing for TestFlight.
- Build `149` was archived, signed, and uploaded on 2026-08-26 after the native suite passed. App Store Connect accepted the package and it is processing for TestFlight.
- Build `151` was archived, signed, and uploaded on 2026-08-26 after the model-contract regression, dense-photo Vision harness, and native suite passed. App Store Connect accepted the package and it is processing for TestFlight.
- Camera capture is available only while the session is searching or holding. Camera preparation failures keep the shutter disabled, offer a real retry, and remain user-facing instead of being reported as handled API errors.
- XcodeGen source of truth: `project.yml`
- Profile customization is account-gated: signed-out users keep the Classic default icon in profile surfaces, while signed-in users can choose an icon and background from Manage Account. The signed-out Manage Account screen is a branded Clerk auth surface using the local BrickValue logo, with no profile/avatar prompt.
- Committed Xcode project: `BrickVal.xcodeproj`

The former Expo app is archived at `apps/expo-previous/`. Treat it as migration reference only. Do not add new mobile feature work there unless the task explicitly requests Expo.

The hosted Next.js app under `src/` remains the backend and web fallback. The native app calls the hosted API at `https://brickvalue.live` through the Swift networking layer. The bulk-scan contract accepts up to 60 regions from either camera or photo-library scans at `/api/minifig/bulk-scan`; the source-aware route was deployed on 2026-08-18 after the old production route rejected 11-region photo requests.

## Source Of Truth

Use these files in this order when working on the native app:

1. The current user request and approved implementation plan.
2. Repository rules in [`AGENTS.md`](../../AGENTS.md).
3. [`docs/design/APPLE_HIG_CODEX.md`](docs/design/APPLE_HIG_CODEX.md) for every iOS design, implementation, and review task.
4. [`.impeccable.md`](.impeccable.md) for BrickVal's users, brand personality, and aesthetic direction.
5. This file for native app structure, workflows, and decisions.
6. [`design-qa.md`](design-qa.md) for visual QA references and simulator expectations.
7. Expo files only when investigating migration behavior or legacy data.

Keep product-language definitions separate from implementation details. The archived Expo [`CONTEXT.md`](../expo-previous/CONTEXT.md) is not the authority for native UI or architecture.

## App Structure

```text
apps/ios-swift/
├── BrickVal/
│   ├── App/          # App shell, tabs, routing, SDK/environment setup
│   ├── Core/         # Camera, models, networking, persistence, design system
│   ├── Features/     # Scan, Collection, Onboarding, Settings
│   └── Resources/    # Assets, Info.plist, entitlements, launch screen
├── BrickValTests/    # Swift Testing unit tests
├── project.yml       # XcodeGen source of truth
├── BrickVal.xcodeproj/
├── README.md
└── design-qa.md
```

Important scan files:

- `BrickVal/Features/Scan/ScannerView.swift`: camera screen, scan mode, sheet routing.
- `BrickVal/Features/Scan/ScanStore.swift`: camera lifecycle, capture, identification, lookup, and scan state.
- `BrickVal/Features/Scan/BulkScanResultsView.swift`: frozen-photo real/locked-preview result presentation, correction, condition, totals, and Add.
- `BrickVal/Features/Scan/ScannerSheet.swift`: sheet payloads and detection-to-result association.
- `BrickVal/Core/Networking/BrickValAPIClient.swift`: hosted API client.
- `BrickVal/Core/Persistence/CollectionStore.swift`: local collection persistence and atomic bulk add.
- `BrickVal/Core/DesignSystem/BrickValStyle.swift`: shared visual tokens.
- `BrickVal/Core/Monetization/`: cached policy, usage snapshots, feature names, and placement names.
- `BrickVal/Core/DesignSystem/ProBadge.swift`: shared text-only `PRO` and `PRO ACTIVE` mark.

## Scan Flow

The native single-minifigure scan flow is:

1. `MinifigureDetector.mlmodel` runs locally against the latest camera pixel buffer at no more than six frames per second.
2. Automatic capture requires one fully visible detection across three stable observations. The manual shutter remains available.
3. The exact triggering frame freezes on screen. A focused JPEG with surrounding context is sent once to `/api/minifig/scan`.
4. Brickognize identifies the figure; Core ML only supplies capture geometry.
5. High-confidence results open directly. Low-confidence results present up to three unique alternatives and load their product cards in one minifigure bulk lookup.

The bundled model is `coreml-v3-500`, trained with Create ML. Its source-data attribution and checksum are recorded in [`docs/third-party-notices.md`](docs/third-party-notices.md).

The native bulk scan flow is:

1. The bundled Core ML model provides live framing boxes at up to three frames per second. A short-lived local tracker retains boxes through detector flicker, so the capture manifest does not lose a visible figure because of one empty frame. Live camera bulk capture remains manual and supports up to 60 front-facing, separated figures.
2. A camera capture sends fresh local boxes as normalized regions with a resized JPEG. A photo-library import first runs the source-aspect model over overlapping 3x3, 4x4, and 5x5 tiles plus a full-image pass, then repeats the bounded pass on a padded 1:1 detector canvas. Square-pass boxes are mapped back to the upright source photo, padding-only proposals are removed, both passes are merged with the existing overlap threshold, sorted spatially, and capped at 60 regions. Photo imports show `Finding minifigures` before recognition.
3. New native clients call `/api/minifig/bulk-scan/start`, which validates the 60-region manifest, optionally merges Google Vision object-localization proposals when the server flag is enabled, and returns a signed ten-minute session. The client then creates one isolated crop per physical region and calls `/api/minifig/bulk-scan/identify-region` with at most four requests in flight. Weak or unresolved crops receive one wider-context retry. Brickognize therefore sees one figure per image rather than a crop containing several neighboring figures. The server prices up to three unique candidates per region and preserves spatial duplicates by region ID. If an app-accessible non-Pro user has no usable introductory or referral bulk credit, the client stops after local detection and cannot create this session; the same frozen-photo preview is used when a stale local allowance reaches a server bulk-limit response.
4. The server returns confirmed results, candidate alternatives, unresolved regions, usage, and a short-lived recovery token. The normal bulk path automatically uses the highest-scoring priced candidate for every region, even when the provider marks it for review; it does not interrupt the user with candidate cards. Candidate review remains only in user-initiated contextual correction. It consumes the introductory bulk allowance only after the first priced region succeeds; referral credits are the fallback after that allowance is exhausted. The compatibility `/api/minifig/bulk-scan` route remains for older builds and uses the same per-region service when a region manifest is present. If an imported photo request fails unexpectedly, the native scanner keeps the frozen photo and regions in place and shows `Try again`; backend and native Sentry events exclude images, request bodies, tokens, and collection data.
5. For a newly enrolled soft user with no introductory or referral credit, the captured image stays local. The on-device detector and scan animation show the real detected count and frames, while identities, prices, cards, and totals remain locked placeholders. No identification, pricing, or scan-consumption request is started, and the user must rescan after subscribing or qualifying.
6. The captured image is frozen over the live camera while real identification runs, with a visible progressive reveal so the user knows the scan is active.
6. Missing, unresolved, non-minifigure, and unpriced results are excluded.
7. The result sheet opens with every priced item selected as Used by default.
8. Selection and New/Used changes update the total immediately.
9. Add saves all selected items through one atomic collection operation. A failed save must not leave a partial collection.
10. Successful Add closes the presentation, resets the scanner, and shows confirmation. Close returns to the live scanner.
11. Tapping any detection frame or result card opens contextual correction with up to three cached candidates. The current match appears first; choosing a replacement updates the frame, card, price, total, selection, and top-find immediately. `None match` leaves the detection visible but unidentified.
12. An unidentified region with no cached candidates may retry once using its original detection box. No free-tap box or nearby detection position is used. Backend recovery compatibility remains for older clients, but the current native UI has no multi-figure missed-selection mode.
13. Referral onboarding applies or skips an optional code after account setup. Completion is acknowledged by `complete_onboarding`; failed acknowledgements persist locally and retry after sign-in or app activation.
14. Hard-cohort users choose Subscribe or Invite 3 friends before entering the app. Every app-accessible non-Pro user with no usable introductory or referral bulk credit can repeat local locked previews without consuming credits; unlocking through purchase or three qualified referrals dismisses the preview and asks for a fresh scan. Pro users and users with a remaining credit take the real scan path.

Older installed builds retain the legacy flow:

1. The user selects Bulk mode and captures one image.
2. The captured image is frozen over the live camera while identification runs, with a visible progress overlay so the user knows the scan is active.
3. The app sends the image to the hosted identification endpoint.
4. Minifigure detections are looked up in `/api/bulk-lookup`.
5. Missing, unresolved, non-minifigure, and unpriced results are excluded.
6. `BulkScanResultItem.make` associates each priced lookup with its detection box.
7. Overlapping detections for the same identifier are treated as one physical item. The highest-confidence detection is kept. Spatially separate copies remain separate.
8. The result sheet opens with every priced item selected as Used by default.
9. Selection and New/Used changes update the total immediately.
10. Add saves all selected items through one atomic collection operation. A failed save must not leave a partial collection.

Bulk result UI requirements:

- Use standard SwiftUI iOS 17 presentation APIs. Do not add Liquid Glass.
- Keep the header, frozen photo, correction affordance, and Add action reachable on a small iPhone without vertical scrolling.
- Bulk result photos use the shared aspect-fit rectangle and black letterboxing so the complete source photo remains visible. Transform detection boxes and price callouts using that exact fitted rectangle.
- Product thumbnails should normalize protocol-relative BrickLink URLs and use an identifier-based fallback when the returned image is missing or unavailable.
- Keep accessibility labels and values for selection, condition, price, and primary actions.

Bulk accuracy decisions and the private evaluation workflow are recorded in [`docs/decisions/0005-bulk-scan-evaluation-and-auto-best-match.md`](docs/decisions/0005-bulk-scan-evaluation-and-auto-best-match.md). The current product behavior is intentionally recall-first: no normal bulk candidate-review interruption, unresolved regions remain recoverable, and detector/provider changes must pass the documented holdout gates before rollout.

## API And Data Rules

- External service credentials stay server-side. The native app uses hosted route handlers and does not contain provider secrets.
- The primary native endpoints are identification, lookup, bulk lookup, part colors, and minifigure feedback. Confirm exact paths in `BrickValAPIClient.swift` before changing contracts.
- The backend may return BrickLink image URLs beginning with `//`. Normalize these to `https://` before creating a Swift `URL`.
- Build 102 performs single-scan box detection on-device and does not call `/api/minifig/detect`. Keep the hosted route available for older installed builds until they are no longer supported.
- Market data and collection records stay canonical USD. The current product requirement adds a Profile → Currency override for 24 major currencies; System default follows the device region independently from language. Converted values use the cached USD-based daily rate, disclose the rate date on detail/share surfaces, retain stale rates for up to seven days, and fall back to USD with a localized notice when conversion is unavailable. StoreKit, RevenueCat, and Superwall subscription prices remain Apple storefront values.
- Do not change backend endpoints or paid-service behavior for a native-only UI fix without an explicit request.
- The current policy enables three successful single-minifigure scans per UTC day, repeat-bulk, 10-unique-item collection, and appearance gates. The 3M/6M history gate remains implemented but disabled by server policy.
- Anonymous scan usage is local to the device. Signed-in usage is enforced by atomic `user_feature_usage` records across devices. New soft users have a zero bulk limit; existing users are marked with a server-persisted introductory-credit grandfather flag.
- Manual number lookups, failed matches, network failures, cancellations, and retries do not consume scan usage.
- Bulk request `scanSource` defaults to `camera` for older clients. The server caps all bulk requests at 60 regions; imported photo detection never silently falls back to an empty region list.

## Localization

- The native app ships Apple string catalogs for English (`en`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Brazilian Portuguese (`pt-BR`), Dutch (`nl`), Japanese (`ja`), Korean (`ko`), Simplified Chinese (`zh-Hans`), Traditional Chinese (`zh-Hant`), Arabic (`ar`), and Hindi (`hi`).
- English is the source and fallback language. System default chooses the best matching supported device language; unsupported languages fall back to English. Profile → Language provides an in-app picker for System default or any supported language, and the choice persists on the device.
- All user-visible screen, onboarding, scan, collection, settings, validation, error, accessibility, notification, and share-card copy must use the catalogs. API identifiers, analytics events, logs, set numbers, and upstream LEGO names remain unchanged.
- Market prices are customer-facing averages, not guaranteed sale prices. Label completed-sale averages as “Average sold price”; label active-listing fallbacks as “Average asking price” and explain the distinction during onboarding, scan processing, results, collection detail, bulk results, share cards, and VoiceOver.
- Strings produced outside SwiftUI views use `BrickValLocalization.localized(...)` so the in-app language override applies immediately to alerts, model state, accessibility values, and notifications.
- Market values stay canonical in USD; displayed currency, dates, percentages, and quantities use the active locale. POSIX formatting is reserved for machine-readable dates and identifiers. Arabic layouts must mirror naturally and avoid manual left/right assumptions.
- Currency display supports the 24 major ISO codes in Profile → Currency plus System default. The override is persisted independently from language; rates come from `/api/mobile/exchange-rates`, refresh daily, remain usable for up to seven days when stale, and fall back to USD with localized copy if no complete table is available. StoreKit, RevenueCat, and Superwall prices are never converted.
- Superwall receives the same effective app locale as the native UI, so its localized paywall follows the in-app language choice. Keep the 13 corresponding paywall locales and StoreKit metadata synchronized in the dashboard.
- Clerk-owned controls may remain English in Dutch and Traditional Chinese. BrickValue-owned account and settings copy remains translated. Purchase, permission, deletion, privacy, and other sensitive copy requires native-language review before release.
- Run `npm run test:localization` from the repository root to verify locale coverage, non-empty catalog values, placeholder parity, required plural forms, and localized permission keys before every native release.

## Build And Test

Run commands from `apps/ios-swift/`.

After changing `project.yml`, regenerate the project:

```bash
xcodegen generate
```

Run all Swift tests on a simulator:

```bash
xcodebuild test \
  -project BrickVal.xcodeproj \
  -scheme BrickVal \
  -destination 'platform=iOS Simulator,name=BrickVal Small iPhone'
```

Native Clerk sign-in requires `Configuration/Secrets.xcconfig`, which is ignored by git and included automatically by `Configuration/Shared.xcconfig`. Keep the publishable key in that local file; never commit it. Before a Release archive, verify that `xcodebuild -showBuildSettings` reports a non-empty `CLERK_PUBLISHABLE_KEY`. If it is empty, the Account screen intentionally shows the configuration-missing state and sign-in cannot open.

Native upgrades also require `REVENUECAT_API_KEY` and `SUPERWALL_API_KEY` in the ignored `Configuration/Secrets.xcconfig`. The BrickVal target's Release pre-build check must remain enabled so an archive cannot silently ship without either purchase-service key.

Paid access is authoritative in RevenueCat. The backend caches `users.is_pro`, but a denied scan rechecks the authenticated Clerk/RevenueCat identity and repairs the cache before returning a paywall response. Native entitlement sync only promotes local access when the server verifies Pro; an unavailable verification must not revoke a locally known Pro user or discard a captured image.

For visual QA, also use the `BrickVal iPhone 17 Pro` simulator when available. Always check the small iPhone before release, especially for sheets, long names, Dynamic Type, and controls near the bottom edge.

The current native verification run on the BrickVal Small iPhone passed 174 tests (176 runs including four dynamic-parameter runs) with zero failures. The wide-photo processing fixture also passed on the small iPhone after its fresh-simulator route was corrected.

The full 100-test Swift suite passed on the small iPhone simulator on 2026-08-15, including bulk recovery state/layout contracts, direct-tap crop planning, collection capacity, scan usage, access-cohort assignment, cached entitlement handling, stale-policy migration, offer-code policy/coordinator behavior, and captured-image layout regressions. Free and Pro gating states were previously checked on the small iPhone and iPhone 17 Pro simulators.

## Release Workflow

- `project.yml` owns version and build settings; do not edit generated project settings as the lasting fix.
- Increment `CURRENT_PROJECT_VERSION` for a new build. Keep `MARKETING_VERSION` unchanged unless the release version changes.
- Treat the native SwiftUI source/UI baseline and App Store upload number as separate: the current interface is based on build 46, while build 165 is the next native upload because Apple build numbers cannot return to 46 after builds 100 and 101.
- Build and test before committing.
- Commit focused changes with a message that states the behavioral fix.
- Push verified native changes to `codex/swift-repo-structure` when useful and relevant.
- TestFlight upload or App Store submission requires an explicit user request. A normal code task does not authorize submission.

## Known Boundaries

- Collection data is local-device only for the MVP; backend collection sync is future work.
- The Expo app is not the current mobile implementation.
- The hosted backend and its external provider integrations are separate ownership boundaries.
- Native paywall and purchase flows require on-device verification when changed; do not assume a successful compile proves purchase completion.
- Referral rewards require Clerk sign-in and the deployed `20260827000000_referral_rewards.sql` plus `20260827010000_referral_onboarding_and_grandfathering.sql` migrations. Qualification occurs at onboarding completion, and the second migration adds installation uniqueness, grandfathered introductory credit, and the one-time account-link sync for existing anonymous installations. PostHog records funnel metadata only; Supabase is authoritative for eligibility, reward grants, and credit balance. Keep `BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED` off until the migration and backend deployment are live.

## Key Decisions

- The active mobile implementation is native SwiftUI under `apps/ios-swift/`.
- Expo is archived and retained for migration reference, not new product work.
- The Next.js app remains the hosted API/backend for identity and pricing; single-scan capture detection runs locally through Core ML.
- Local detection uses one in-flight latest-frame policy, a six-frames-per-second ceiling, and three-frame temporal consistency. It must never identify figures or contain provider credentials.
- `project.yml` is the XcodeGen source of truth; the generated Xcode project is committed for direct opening.
- Bulk scan results are detection-based, not identifier-only: duplicate physical copies may remain separate, while overlapping same-identifier detections are collapsed.
- Bulk collection saves are atomic so free-limit, storage, or persistence failures cannot partially add a scan.
- The bulk result sheet uses a frozen image, standard SwiftUI presentation, and a small-screen layout with visible Add and Retake actions.
- The scanner camera stage is aspect-fitted to a stable 3:4 frame. Frozen images and processing overlays must stay clipped to that frame without moving the mode picker, controls, navigation, or tab bar.
- The scan mode control remains a native segmented Picker with Minifigure and Bulk icons, a 56-point minimum touch frame, and a centered maximum width of 340 points.
- Signed-out account access uses Clerk's native AuthView with a local BrickValue logo and an accent-aware ClerkTheme; signed-in users continue into the Manage Account profile editor.
- Onboarding preserves the original value, scan-reveal, collector-goal, market-data, and collector-review sequence. A brief BrickValue brand screen and larger looping product demo precede those pages; the post-demo screens share one segmented progress treatment. Account setup is followed by optional referral-code entry with Apply or Skip. The final Save Your Progress screen offers direct Apple and Google authentication, while "Skip for now" enters as a guest. Hard-cohort users then receive a final Subscribe or Invite 3 friends access choice; onboarding replays do not re-enroll or re-qualify an account.
- Successful scan and manual lookup results play the bundled cash-register sound through an ambient audio session; audio failure never blocks a result.
- Collection history horizons filter stored market points by actual 30-, 90-, and 180-day date windows. Horizon-specific fallback data and chart identity must also change when the selected horizon changes.
- Content-backed screens use `SkeletonPlaceholder` for initial loading and remote image placeholders. Keep operation progress indicators for active captures, saves, and lookups where the user is waiting on an explicit action.
- Free collection capacity counts unique products, not total quantity or condition slots. New and Used copies of one product share one free slot. Existing over-limit users may edit or remove saved items but cannot add another unique product.
- `ProBadge` is the only feature-level Pro mark. Use `PRO` for locked features and `PRO ACTIVE` for subscribers; do not use a crown or sparkle as the Pro logo.
- A successful new purchase presents one dismissible full-screen welcome that summarizes unlocked features; restore and entitlement-refresh callbacks do not. The welcome contains the optional post-purchase growth survey.
- Contextual Superwall placements fall back to the configured `brickval_upgrade` campaign. If purchasing is unavailable, present the native Subscription screen rather than silently ignoring the action.
- New users can be assigned once to the persisted access experiment. The treatment is a full-app Pro gate; the control keeps the metered experience. Existing users and onboarding replays remain soft-access users. RevenueCat entitlement resolution must finish before the treatment gate can appear, and the server policy remains the kill switch. See [`docs/decisions/0001-new-user-access-experiment.md`](docs/decisions/0001-new-user-access-experiment.md).
- Notifications are event-based and opt-in: soft users may request one daily scan-reset reminder, Pro trial users may request one reminder 48 hours before renewal, and subscribers may opt into billing-action alerts. Hard-gated non-purchasers receive no permission prompt. Local reminders use the iOS scheduler; account alerts use direct APNs. Server notification flags can disable each category without an app release, and notification taps deep-link to Scan or Profile > Subscription. See [`docs/decisions/0002-cohort-notification-sequence.md`](docs/decisions/0002-cohort-notification-sequence.md).
- Product feedback is intentionally limited to three optional surveys: post-purchase conversion, engaged-user PMF, and subscription cancellation. Their native UI is choice-first with emoji sentiment, single/multiple choice tiles, an optional note, and no required typing. The native store applies local cooldowns and event deduplication; `/api/mobile/feedback/surveys` and the private `product_feedback` table apply server validation and deduplication. No scan images, collection data, or contact details are collected. See [`docs/decisions/0003-product-feedback-loop.md`](docs/decisions/0003-product-feedback-loop.md).
- Apple Subscription Offer Code redemption uses the native StoreKit SwiftUI sheet at the app root, with `AppSDKCoordinator` owning presentation, confirmation, cancellation, and retry state. RevenueCat `syncPurchases()` remains the source of entitlement truth, and successful sync updates Superwall and `EntitlementStore` without relaunching. The remote monetization policy is version 6, defaults offer-code UI and locked bulk preview on for app-accessible non-Pro users with no usable introductory or referral credit, and supports the `BRICKVALUE_OFFER_CODES_ENABLED` and `BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED` kill switches. The native client ignores stale policy responses below version 6 and uses its bundled policy, so the preview remains available while an older backend response is still in production. No Apple offer codes are stored or validated by BrickVal; referral codes are handled by the Supabase-backed referral ledger.
- Native Sentry starts during app initialization for Release builds when the local release configuration provides `SENTRY_DSN`. Debug builds clear the DSN and do not initialize Sentry, preventing simulator/UI-test noise from reaching production telemetry. Camera errors remain user-facing and are not sent through handled API-error reporting. Sentry uses the app version/build as the release identifier, `production` as the environment, does not send default PII or scan images, and now limits automatic HTTP-client failure capture to the configured BrickVal API host so auth and purchase SDK failures do not become native app issues. The DSN is intentionally kept out of tracked source configuration. Build 135 adds an injectable `AppErrorReporting` boundary for handled scan failures. The hosted app uses `@sentry/nextjs`, zero tracing, `runtime=backend` tags, and flushes handled bulk-scan events before serverless teardown. Release dSYMs are uploaded with `scripts/upload-sentry-symbols.sh` using environment variables only.
- Native PostHog starts during `BrickValApp` initialization when `POSTHOG_API_KEY` is a valid `phc_...` project key. It uses the US Cloud host, captures application lifecycle and screen views, keeps anonymous events anonymous until Clerk identity is available, identifies users with the stable Clerk ID and a non-PII plan property, reloads feature flags after identification, and resets on logout. Custom events cover onboarding, sign-in, scans, manual lookups, upgrades, and collection saves. The key remains in ignored `Configuration/Secrets.xcconfig`; the tracked example contains only a blank placeholder.
- App Store Connect pricing is AUD 79.99 annual with a seven-day trial and AUD 9.99 monthly without a trial. RevenueCat's live `default` offering includes both products. Superwall campaigns `101303` (`onboarding_hard_access`) and `86740` (`brickval_upgrade`) use the single active paywall `223721` (`Paywall test 1`); the former paywall `254889` is archived. Production remains at a guarded 10 percent hard-access allocation until native build `125` is live, then moves to 50 percent. The paywall retains dynamic localized pricing, a one-week annual introductory offer, and no trial on monthly.

When a future change introduces a major architectural alternative or an irreversible migration, add a separate decision record under `apps/ios-swift/docs/decisions/` and link it here. Keep this section as the concise decision index.

## Maintenance Rule

Update this file when native architecture, build/release settings, current workflow, or a key decision changes. Update `Last verified` whenever current status or simulator/test facts are rechecked. Never add credentials, tokens, private keys, or user data.
# Collection performance work — build 172

CollectionStore now owns background-prepared numeric history for 1M/3M/6M and grouped inventory rows. Collection summary and graph share prepared results; item history comes from the same snapshot. Date-window refresh follows UTC while active. Chart inspection state is isolated from sampling/currency conversion and selection changes no longer restart reveal animation. ProductImagePipeline handles public-photo download sharing, background downsampling and bounded memory/disk caching. Detail history refresh accepts an optional item key and joins/prioritizes existing refresh work. No backend or persisted-schema changes.

Sentry BRICKVAL-M confirms the build-171 production freeze in `NSISO8601DateFormatter.init` through `PortfolioSummaryView` (14.2–15.0 seconds). Initial optimized measurements and Release-config UI tests support the fix; physical-device confirmation and final release status are tracked in `docs/audits/2026-09-09-collection-performance.md`.
