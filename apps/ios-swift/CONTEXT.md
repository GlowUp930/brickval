# BrickVal Native iOS Context

Last verified: 2026-08-11

This is the working context for the canonical BrickVal mobile app. It is intentionally specific to the native SwiftUI app. Repository-wide rules remain in [`AGENTS.md`](../../AGENTS.md).

## Active App

- Native app: `apps/ios-swift/`
- Branch for current native work: `codex/swift-repo-structure`
- Bundle identifier: `com.brickval.app`
- Minimum iOS version: 17.0
- Swift version: 6.0 with strict concurrency enabled
- Current marketing version: `1.0.1`
- Source/UI baseline: native SwiftUI build `46` (`1f58cec`).
- Current release build number: `114`. Build `100` was uploaded from the wrong Expo project and cannot be deleted through the available App Store Connect API, so later native builds must continue from that App Store sequence. Build `112` is the final pre-monetization UI pass. Build `113` adds shared Pro labeling, one introductory free bulk scan, a 10-unique-item free collection limit, contextual upgrade flows, and server-controlled future scan/history experiments. Build `114` adds the collection-item removal redesign and hidden onboarding replay gesture. The centered-stage profile editor remains available from Manage Account rather than the main Profile tab. App Store Connect version `1.0.1` remains the active version.
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
11. Successful Add closes the sheet, resets the scanner, and shows confirmation. Retake or Close returns to the live scanner.

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

For visual QA, also use the `BrickVal iPhone 17 Pro` simulator when available. Always check the small iPhone before release, especially for sheets, long names, Dynamic Type, and controls near the bottom edge.

The full 60-test Swift suite passed on the small iPhone simulator on 2026-08-11, including collection capacity, scan usage, access-cohort assignment, cached entitlement handling, stale-policy migration, and captured-image layout regressions. Free and Pro gating states were also checked on the small iPhone and iPhone 17 Pro simulators.

## Release Workflow

- `project.yml` owns version and build settings; do not edit generated project settings as the lasting fix.
- Increment `CURRENT_PROJECT_VERSION` for a new build. Keep `MARKETING_VERSION` unchanged unless the release version changes.
- Treat the native SwiftUI source/UI baseline and App Store upload number as separate: the current interface is based on build 46, while build 114 is the current release because Apple build numbers cannot return to 46 after builds 100 and 101.
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
- Successful free-to-Pro entitlement transitions present one dismissible full-screen welcome that summarizes unlocked features. Repeated entitlement callbacks must not dismiss a pending welcome, and future cancellations followed by reactivation may show it again.
- Contextual Superwall placements fall back to the configured `brickval_upgrade` campaign. If purchasing is unavailable, present the native Subscription screen rather than silently ignoring the action.
- New users can be assigned once to a persisted 50/50 access experiment. The control keeps metered soft access; the treatment requires Pro immediately before the first real scan. Existing users and onboarding replays remain soft-access users. RevenueCat entitlement resolution must finish before the treatment gate can appear, and the server policy remains the kill switch. The bundled and server defaults keep this experiment disabled until the annual introductory offer and dedicated Superwall placement are verified. See [`docs/decisions/0001-new-user-access-experiment.md`](docs/decisions/0001-new-user-access-experiment.md).
- App Store Connect has scheduled the experiment pricing for 2026-08-12: AUD 79.99 annual with a seven-day trial and AUD 12.99 monthly without a trial, with existing subscriber prices preserved. RevenueCat's live `default` offering includes both products. Keep the hard-access experiment disabled until Superwall's `onboarding_hard_access` mapping is verified on device.

When a future change introduces a major architectural alternative or an irreversible migration, add a separate decision record under `apps/ios-swift/docs/decisions/` and link it here. Keep this section as the concise decision index.

## Maintenance Rule

Update this file when native architecture, build/release settings, current workflow, or a key decision changes. Update `Last verified` whenever current status or simulator/test facts are rechecked. Never add credentials, tokens, private keys, or user data.
