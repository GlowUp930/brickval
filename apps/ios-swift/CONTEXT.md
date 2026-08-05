# BrickVal Native iOS Context

Last verified: 2026-08-03

This is the working context for the canonical BrickVal mobile app. It is intentionally specific to the native SwiftUI app. Repository-wide rules remain in [`AGENTS.md`](../../AGENTS.md).

## Active App

- Native app: `apps/ios-swift/`
- Branch for current native work: `codex/swift-repo-structure`
- Bundle identifier: `com.brickval.app`
- Minimum iOS version: 17.0
- Swift version: 6.0 with strict concurrency enabled
- Current marketing version: `1.0.1`
- Source/UI baseline: native SwiftUI build `46` (`1f58cec`).
- Current TestFlight upload number: `101`. Build `100` was uploaded from the wrong Expo project and cannot be deleted through the available App Store Connect API, so Apple requires the corrected native upload to use a higher number.
- XcodeGen source of truth: `project.yml`
- Committed Xcode project: `BrickVal.xcodeproj`

The former Expo app is archived at `apps/expo-previous/`. Treat it as migration reference only. Do not add new mobile feature work there unless the task explicitly requests Expo.

The hosted Next.js app under `src/` remains the backend and web fallback. The native app calls the hosted API at `https://brickvalue.live` through the Swift networking layer.

## Source Of Truth

Use these files in this order when working on the native app:

1. The current user request and approved implementation plan.
2. Repository rules in [`AGENTS.md`](../../AGENTS.md).
3. This file for native app structure, workflows, and decisions.
4. [`design-qa.md`](design-qa.md) for visual QA references and simulator expectations.
5. Expo files only when investigating migration behavior or legacy data.

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

## Scan Flow

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
- The hosted auto-detection route uses Roboflow when available and falls back to Brickognize box detection when Roboflow returns a billing/credit `402`. Do not remove this fallback unless a replacement detector is verified in production.
- Prices displayed in the native app are USD unless the current product requirement explicitly changes this.
- Do not change backend endpoints or paid-service behavior for a native-only UI fix without an explicit request.

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

For visual QA, also use the `BrickVal iPhone 17 Pro` simulator when available. Always check the small iPhone before release, especially for sheets, long names, Dynamic Type, and controls near the bottom edge.

The last verified test run contained 32 tests and passed on the small iPhone simulator.

## Release Workflow

- `project.yml` owns version and build settings; do not edit generated project settings as the lasting fix.
- Increment `CURRENT_PROJECT_VERSION` for a new build. Keep `MARKETING_VERSION` unchanged unless the release version changes.
- Treat the native SwiftUI source/UI baseline and App Store upload number as separate: the current interface is based on build 46, while build 101 is the required next upload because the mistaken Expo build 100 already exists in App Store Connect.
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
- The Next.js app remains the hosted API/backend for native scanning.
- `project.yml` is the XcodeGen source of truth; the generated Xcode project is committed for direct opening.
- Bulk scan results are detection-based, not identifier-only: duplicate physical copies may remain separate, while overlapping same-identifier detections are collapsed.
- Bulk collection saves are atomic so free-limit, storage, or persistence failures cannot partially add a scan.
- The bulk result sheet uses a frozen image, standard SwiftUI presentation, and a small-screen layout with visible Add and Retake actions.
- Successful scan and manual lookup results play the bundled cash-register sound through an ambient audio session; audio failure never blocks a result.
- Collection history horizons filter stored market points by actual 30-, 90-, and 180-day date windows. Horizon-specific fallback data and chart identity must also change when the selected horizon changes.
- Content-backed screens use `SkeletonPlaceholder` for initial loading and remote image placeholders. Keep operation progress indicators for active captures, saves, and lookups where the user is waiting on an explicit action.

When a future change introduces a major architectural alternative or an irreversible migration, add a separate decision record under `apps/ios-swift/docs/decisions/` and link it here. Keep this section as the concise decision index.

## Maintenance Rule

Update this file when native architecture, build/release settings, current workflow, or a key decision changes. Update `Last verified` whenever current status or simulator/test facts are rechecked. Never add credentials, tokens, private keys, or user data.
