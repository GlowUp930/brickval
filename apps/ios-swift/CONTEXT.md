# BrickVal Native iOS Context

Last verified: 2026-08-15

This is the working context for the canonical BrickVal mobile app. It is intentionally specific to the native SwiftUI app. Repository-wide rules remain in [`AGENTS.md`](../../AGENTS.md).

## Active App

- Native app: `apps/ios-swift/`
- Branch for current native work: `codex/swift-repo-structure`
- Bundle identifier: `com.brickval.app`
- Minimum iOS version: 17.0
- Swift version: 6.0 with strict concurrency enabled
- Current marketing version: `1.0.4`
- Source/UI baseline: native SwiftUI build `46` (`1f58cec`).
- Current release build number: `128`. Build `100` was uploaded from the wrong Expo project and cannot be deleted through the available App Store Connect API, so later native builds must continue from that App Store sequence. Build `112` is the final pre-monetization UI pass. Build `113` adds shared Pro labeling, one introductory free bulk scan, a 10-unique-item free collection limit, contextual upgrade flows, and server-controlled future scan/history experiments. Build `114` adds the collection-item removal redesign and hidden onboarding replay gesture. Build `115` adds guided on-device bulk detection. Build `116` adds recall-first bulk recovery, ambiguous-match review, and tap-to-recover for missed figures. Build `118` isolates tap-to-recover uploads around the selected figure to prevent nearby figures from being identified instead. Build `119` makes missed-figure recovery direct and unobstructed by removing broad tap guides from the photo. Build `120` fixes recovery candidate layout collapse, centers recovery crops on direct taps, and replaces the recovery circle with animated corner focus brackets. Build `121` returns manual recovery matches to the bulk review with a visible confirmation and the recovered card in view. Build `122` was the last App Store Connect upload for the validated pricing and paywall configuration. Build `124` updates the Sentry integration to preserve framework dSYMs for crash symbolication. Build `125` moves hard-access enforcement to the app root and prepares the persistent 50/50 new-user paywall experiment while preserving the staged 10 percent production allocation until this build is live. Build `126` adds the choice-first product feedback surveys and notification-safe survey delivery. Build `128` is the verified TestFlight build uploaded after the production Pro-entitlement reconciliation fix. The centered-stage profile editor remains available from Manage Account rather than the main Profile tab. App Store Connect version `1.0.4` is the active TestFlight train.
- The build `115` bulk backend was deployed to production on 2026-08-12 and verified against photographed 0-, 1-, 2-, and 3-figure cases. Failed scans pause live detection so their error message remains visible until the user retries.
- XcodeGen source of truth: `project.yml`
- Profile customization is account-gated: signed-out users keep the Classic default icon in profile surfaces, while signed-in users can choose an icon and background from Manage Account. The signed-out Manage Account screen is a branded Clerk auth surface using the local BrickValue logo, with no profile/avatar prompt.
- Committed Xcode project: `BrickVal.xcodeproj`

The former Expo app is archived at `apps/expo-previous/`. Treat it as migration reference only. Do not add new mobile feature work there unless the task explicitly requests Expo.

The hosted Next.js app under `src/` remains the backend and web fallback. The native app calls the hosted API at `https://brickvalue.live` through the Swift networking layer.

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
- `BrickVal/Features/Scan/BulkScanResultsView.swift`: frozen-photo result sheet, selection, condition, totals, Add, and Retake.
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

1. The bundled Core ML model provides live framing boxes at up to three frames per second. A short-lived local tracker retains boxes through detector flicker, so the capture manifest does not lose a visible figure because of one empty frame. Bulk capture remains manual and supports up to 10 front-facing, separated figures.
2. The user captures one exact camera frame. Fresh local boxes are sent as normalized regions with a resized JPEG.
3. `/api/minifig/bulk-scan` runs one full-image recognition request plus guided crops and overlapping coverage crops. The backend favors recall over latency, associates results to physical regions, collapses overlapping provider duplicates, and prices unique identifiers.
4. The server returns confirmed results, ambiguous candidates for user review, unresolved regions for tap-to-recover, and a short-lived recovery token. It consumes the introductory bulk allowance only when at least one priced result or review candidate remains.
5. The captured image is frozen over the live camera while identification runs, with a visible progress overlay so the user knows the scan is active.
6. Missing, unresolved, non-minifigure, and unpriced results are excluded.
7. The result sheet opens with every priced item selected as Used by default.
8. Selection and New/Used changes update the total immediately.
9. Add saves all selected items through one atomic collection operation. A failed save must not leave a partial collection.
10. Successful Add closes the sheet, resets the scanner, and shows confirmation. Retake or Close returns to the live scanner.
11. Recovery is a multi-figure workflow: users enter `Review X missed figures`, tap up to 10 physical figures in order, and see numbered accent corner brackets. Tapping an existing bracket removes that selection and renumbers the remaining queue.
12. `Check X figures` processes selected crops with at most two concurrent recovery requests and determinate progress. Successful candidates are reviewed one figure at a time in tap order; `None match` skips an outcome and the final banner reports partial success.
13. Recovery cancellation invalidates stale responses. Cancelling during processing preserves the numbered selections for adjustment and retry; cancelling normal selection or candidate review returns to the unchanged result list. Retake always returns to the live scanner.
14. Recovery tokens remain valid for 10 minutes and are budgeted server-side at 20 calls per token window, allowing up to 10 selected figures plus one retry each. The backend rate-limit key hashes the signed token and never uses the client IP.

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
- Keep the header, frozen photo, Add action, and Retake action reachable on a small iPhone without vertical scrolling.
- If the result photo is cropped to fit the available space, transform detection boxes using the same aspect-fill rectangle as the image.
- Product thumbnails should normalize protocol-relative BrickLink URLs and use an identifier-based fallback when the returned image is missing or unavailable.
- Keep accessibility labels and values for selection, condition, price, and primary actions.

## API And Data Rules

- External service credentials stay server-side. The native app uses hosted route handlers and does not contain provider secrets.
- The primary native endpoints are identification, lookup, bulk lookup, part colors, and minifigure feedback. Confirm exact paths in `BrickValAPIClient.swift` before changing contracts.
- The backend may return BrickLink image URLs beginning with `//`. Normalize these to `https://` before creating a Swift `URL`.
- Build 102 performs single-scan box detection on-device and does not call `/api/minifig/detect`. Keep the hosted route available for older installed builds until they are no longer supported.
- Prices displayed in the native app are USD unless the current product requirement explicitly changes this.
- Do not change backend endpoints or paid-service behavior for a native-only UI fix without an explicit request.
- The current policy enables three successful single-minifigure scans per UTC day, repeat-bulk, 10-unique-item collection, and appearance gates. The 3M/6M history gate remains implemented but disabled by server policy.
- Anonymous scan usage is local to the device. Signed-in usage is enforced by atomic `user_feature_usage` records across devices.
- Manual number lookups, failed matches, network failures, cancellations, and retries do not consume scan usage.

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

The full 100-test Swift suite passed on the small iPhone simulator on 2026-08-15, including bulk recovery state/layout contracts, direct-tap crop planning, collection capacity, scan usage, access-cohort assignment, cached entitlement handling, stale-policy migration, offer-code policy/coordinator behavior, and captured-image layout regressions. Free and Pro gating states were previously checked on the small iPhone and iPhone 17 Pro simulators.

## Release Workflow

- `project.yml` owns version and build settings; do not edit generated project settings as the lasting fix.
- Increment `CURRENT_PROJECT_VERSION` for a new build. Keep `MARKETING_VERSION` unchanged unless the release version changes.
- Treat the native SwiftUI source/UI baseline and App Store upload number as separate: the current interface is based on build 46, while build 125 is the current release because Apple build numbers cannot return to 46 after builds 100 and 101.
- Build and test before committing.
- Commit focused changes with a message that states the behavioral fix.
- Push verified native changes to `codex/swift-repo-structure` when useful and relevant.
- TestFlight upload or App Store submission requires an explicit user request. A normal code task does not authorize submission.

## Known Boundaries

- Collection data is local-device only for the MVP; backend collection sync is future work.
- The Expo app is not the current mobile implementation.
- The hosted backend and its external provider integrations are separate ownership boundaries.
- Native paywall and purchase flows require on-device verification when changed; do not assume a successful compile proves purchase completion.

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
- Onboarding preserves the original value, scan-reveal, collector-goal, market-data, and collector-review sequence. A brief BrickValue brand screen and larger looping product demo precede those pages; the six post-demo screens share one segmented progress treatment. The final Save Your Progress screen offers direct Apple and Google authentication, while "Skip for now" enters as a guest. The video screen also offers the full branded auth sheet, so account creation remains optional throughout.
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
- Apple Subscription Offer Code redemption uses the native StoreKit SwiftUI sheet at the app root, with `AppSDKCoordinator` owning presentation, confirmation, cancellation, and retry state. RevenueCat `syncPurchases()` remains the source of entitlement truth, and successful sync updates Superwall and `EntitlementStore` without relaunching. The remote monetization policy is version 4, defaults offer-code UI on, and supports the `BRICKVALUE_OFFER_CODES_ENABLED` kill switch. No codes are stored or validated by BrickValue.
- App Store Connect pricing is AUD 79.99 annual with a seven-day trial and AUD 9.99 monthly without a trial. RevenueCat's live `default` offering includes both products. Superwall campaigns `101303` (`onboarding_hard_access`) and `86740` (`brickval_upgrade`) use the single active paywall `223721` (`Paywall test 1`); the former paywall `254889` is archived. Production remains at a guarded 10 percent hard-access allocation until native build `125` is live, then moves to 50 percent. The paywall retains dynamic localized pricing, a one-week annual introductory offer, and no trial on monthly.

When a future change introduces a major architectural alternative or an irreversible migration, add a separate decision record under `apps/ios-swift/docs/decisions/` and link it here. Keep this section as the concise decision index.

## Maintenance Rule

Update this file when native architecture, build/release settings, current workflow, or a key decision changes. Update `Last verified` whenever current status or simulator/test facts are rechecked. Never add credentials, tokens, private keys, or user data.
