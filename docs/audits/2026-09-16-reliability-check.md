# GitHub reliability check follow-up — 2026-09-16

## Scope

GitHub run [35060061253](https://github.com/GlowUp930/brickval/actions/runs/35060061253)
reported two native UI failures on the iPhone 16e / iOS 26.2 runner. A later
run for the next source revision reproduced the same failures. Backend,
database, and native unit checks were already passing, so this follow-up keeps
the reliability checks enabled and fixes the test/runtime coupling.

## Confirmed causes

- The dense bulk test launched the real progressive reveal and expected all 60
  prices within a 35-second UI-test timeout. The production reveal deliberately
  spaces each result, so the test reached the results surface with only the
  currently revealed price available. This was a test-fixture timing defect,
  not a missing price or a reason to shorten the user-facing reveal.
- The failed-scan retry control was placed inside a clipped camera-stage tree
  that also exposed a transparent accessibility element. XCTest could find the
  button but reported an invalid hit point, and the tap did not clear the
  failure banner.
- The full local UI run exposed a separate DEBUG collection fixture problem:
  its items had no saved pricing snapshot, so item navigation attempted a live
  recovery lookup and showed a misleading “Could not remove item” alert. The
  fixture now contains a saved demo snapshot; production collection behavior
  is unchanged.

## Changes

- Moved `ScannerStatusView` outside the clipped camera content, gave
  `scanner.retry` a minimum 44-point target and a content shape, and marked the
  camera-stage accessibility surface as descriptive-only and non-interactive.
  Failed single scans still clear the frozen image and stale boxes, keep the
  error visible, pause automatic submissions, and leave the shutter ready for
  an explicit capture.
- Added `-showDenseBulkCompletedDemo`, a DEBUG-only presentation that starts
  with the existing 60 resolved fixture entries. The layout test asserts all 60
  stable callout identifiers and their matching full prices directly. The real
  `-showDenseBulkRecoveryDemo` path remains covered by a separate test whose
  timeout is derived from the production reveal schedule. The timing check
  asserts the stable second figure identifier and its full price, matching the
  accessible callout contract rather than a visual character name.
- Added saved pricing to the existing DEBUG collection fixtures so navigation
  does not invoke network recovery or surface a fixture-only error.
- Updated the reliability workflow to select and boot a supported simulator,
  print device/runtime information, save the native result bundle and log, and
  upload those plus a failure screenshot even when tests fail.
- Bumped the native build number to 183 for the replacement signed archive.

No backend, pricing, scan-credit, purchase, or production data contract
changed.

## Verification

Local Release/Debug simulator checks completed:

- Focused retry and production reveal checks: pass on BrickVal Small iPhone and
  iPhone 17 Pro simulators.
- Completed 60-entry dense-price layout check: pass on BrickVal Small iPhone;
  the existing full UI runs also pass on both simulator sizes.
- Native unit target: 246 tests in 39 suites, pass on Small iPhone and iPhone 17
  Pro simulators.
- Full native UI target: 19 tests, zero failures on both simulator sizes.
- Backend: 87 tests/reliability assertions, pass.
- Database reliability script, TypeScript check, and localization audit: pass;
  localization reports 814 app strings plus 4 Info.plist strings across 13
  locales.

Signed Release build 1.0.9 (183) archived successfully at
`/tmp/BrickVal183-reliability.xcarchive`. Code-signature verification passed;
the matching BrickVal dSYM UUID is
`C470E397-83B6-3F76-B528-6D7BCD7EAE1D`.

The exact GitHub iPhone 16e / iOS 26.2 run must pass with the updated workflow
before this issue is considered resolved. No physical iPhone was available in
this session, so camera, VoiceOver, and constrained-device confirmation remain
open release checks.
