# BRICKVAL-12 fatal launch hang investigation

Last verified: 2026-10-20 (Australia/Melbourne).

## Status

The user approved temporary production diagnostics on 2026-10-20. Native
source now records fixed screen names and startup/presentation timings for
the next build, 1.15 (195). The production hang has not been reproduced
locally; this instrumentation is not a verified fix. Build verification and
distribution status are recorded below.

## Production evidence

- [Sentry issue BRICKVAL-12](https://areyouok-4x.sentry.io/issues/7801740466/)
  contains two fatal app-hang events affecting one physical iPhone 11 on
  iOS 17.6.1, production release `com.brickval.app@1.14+194`.
- Both events occurred on 20 October 2026, at approximately 16:29:18 and
  16:29:36 AEDT, in separate foreground launches.
- Sentry reports that the user or watchdog terminated the app after its main
  thread was blocked for at least 2,000 ms. The configured threshold does not
  establish the full duration or identify who terminated the app.
- Both main-thread samples are inside SwiftUI and AttributeGraph updates.
  The newer sample includes key-path projection. The displayed
  `_swiftui_adjustsContentInsetWhenScrollDisabled` symbol alone does not identify
  the responsible app view or prove a particular scroll modifier caused it.
- Apple and Google sign-in icon downloads finish shortly before each event.
  These breadcrumbs establish correlation with authentication UI activity,
  not the exact visible screen or a proven Clerk defect.
- Reported free memory is approximately 108 MiB and 56 MiB. Memory pressure
  is context, not a demonstrated cause.
- Neither event has a replay, screenshot attachment, or an actionable app
  frame above the event loop. Network requests shown before the hang succeed.
- The complete JSON logs were also inspected: all 13 threads in the first
  event and all 16 in the second. The sole app frame in both is the same
  entry-point offset; background threads add no app-level cause.

## Symbol check

Sentry reports the missing debug ID
`A9565FA1-6589-3F1A-858F-9ADBE5E85579`. The local archive
`/tmp/BrickVal194-existing-free-access.xcarchive` contains an arm64 dSYM with
that exact UUID. Local symbolication of the sole app offset `+0x05bbd0`
resolves to `main (BrickValApp.swift:0)`, not a feature implementation frame.
Uploading that dSYM remains useful for future reports but does not itself
explain these samples. Sentry upload credentials are unavailable in this
session.

## Reproduction environment

Only an iOS 26.5 simulator runtime is installed. The two paired physical
devices report iOS 26.6 and 26.0.1 and cannot currently establish a connection.
There is no available iOS 17 environment matching the production failure.

An attempt to obtain an older runtime through Apple's current download catalog
returned `iOS 17.5 (arm64Only) is not available for download.` A separate
universal-architecture request also returned unavailable. This describes the
current catalog response, not a claim that every manual installation route
has been exhausted.

The known BrickVal PostHog replay URL redirected to another project's
onboarding in the current browser account. No replay was available through
that session, and no PostHog setup or access settings were changed.

## Local diagnostic result

A temporary UI probe opened the existing signed-out account fixture and the
subscription gate's real sign-in sheet. It waited for the actual Clerk
identifier control, typed a synthetic address without submitting it, and
asserted that Continue became enabled. Both entry paths remained responsive
on the Small iPhone simulator running iOS 26.5.

The final probe command was:

```sh
xcodebuild test \
  -project apps/ios-swift/BrickVal.xcodeproj \
  -scheme BrickVal \
  -destination 'platform=iOS Simulator,name=BrickVal Small iPhone' \
  -only-testing:BrickValUITests/ScannerProcessingLayoutUITests/testDiagnosticSignedOutAccountRemainsResponsive \
  -resultBundlePath /tmp/BrickVal12-auth-diagnostic-r3.xcresult
```

Output: `Executed 1 test, with 0 failures` in 15.788 seconds;
`** TEST SUCCEEDED **`. The earlier corrected direct-account probe also
passed in 7.347 seconds. The initial probe failed because it queried a
TextField while Clerk exposes the unfocused identifier as StaticText; the
captured hierarchy showed a rendered form. That failure was a probe error,
not reproduction of the production hang.

Artifacts remain local in `/tmp/BrickVal12-auth-diagnostic-r3.xcresult` and
`/tmp/BrickVal12-auth-diagnostic-r3.log`. The temporary probe was removed and
the original test source restored exactly. There is no production regression
test because no command has reproduced the reported iOS 17 hang. No app
source, SDK version, or live configuration was changed.

## Approved diagnostics

`AppHangDiagnostics` records Sentry breadcrumbs under
`brickval.ui_diagnostic`. Its input API accepts enums for screen, phase, and
source screen. The payload contains only `diagnostic_version`, `screen`,
`phase`, `elapsed_since_launch_ms`, and, when a request is matched,
`presentation_ms` and `source_screen`.

Startup begins at SDK coordinator creation, with breadcrumbs emitted after
Sentry initialization and after the app completes local loading/migration.
Account buttons in the subscription gate and Profile log the request before
changing SwiftUI presentation state. Onboarding authentication requests do
the same. Account/authentication and onboarding/access-gate lifecycle hooks
mark appearance and disappearance. Timings use system uptime, so wall-clock
or timezone changes do not affect the measurements. Appearance is a SwiftUI
lifecycle milestone, not proof that every pixel has rendered.

Account and embedded authentication consume separate timers from the same
tap. Dismissal clears unfinished timers, and reopening replaces the prior
request. Signed-in Account does not start an authentication timer. Diagnostic
state is excluded from Observation and does not schedule polling, introduce
extra view state, or initiate new network requests. Breadcrumb emission is
disabled in DEBUG; unit tests use an injected clock and sink.

The diagnostics accept no arbitrary text/properties, user or installation
identifiers, entered email, photos, collection data, or raw SDK errors. They
reuse the existing Release Sentry configuration and hang detection. They are
temporary: remove them once a captured reproduction identifies the cause and
a verified fix has shipped.

The original diagnosing-bugs reproduction/hypothesis/fix phases remain
blocked because no test reproduces BRICKVAL-12. This change follows the
skill's explicitly approved instrumentation fallback; diagnostic tests do
not claim to reproduce or remediate the production hang.

## Diagnostic verification

- Six Sentry configuration/diagnostic tests pass on the Small iPhone
  simulator, including request-to-appearance timing, separate Account/auth
  timers, dismissal cleanup, replacement requests, signed-in Account, and
  the existing failed-request host restriction. The final run is saved at
  `/tmp/BrickVal195-diagnostics-final.xcresult`.
- The new real-gate sign-in smoke test passes: the sheet opens and accepts
  synthetic input without submitting it. The existing hard-access and
  immediate onboarding Get Started checks also pass in
  `/tmp/BrickVal195-diagnostics.xcresult`.
- Localization passes for 868 app strings and four Info.plist strings in all
  13 languages (`/tmp/BrickVal195-localization.log`).
- These are focused checks on iOS 26.5. Physical iOS 17 verification, newly
  captured Sentry breadcrumbs, and confirmation of a hang fix remain open.

## Prepared release

- Signed Release archive:
  `/tmp/BrickVal195-hang-diagnostics.xcarchive`.
- Exported App Store package:
  `/tmp/BrickVal195-export/BrickVal.ipa`.
- Version 1.15, build 195. Archive and local export succeeded. Strict deep
  code-signature checks pass for both the archive and exported package.
- App binary and dSYM share arm64 UUID
  `DBA9D482-2AB5-3287-B062-F15FDA367018`.
- The Release binary contains the diagnostic breadcrumb category and timing
  payload keys. Sentry, Clerk, RevenueCat and Superwall configuration values
  were checked for presence without printing them.
- This package has not been uploaded to TestFlight or submitted to App
  Review. Existing installations do not emit the new breadcrumbs.
- Sentry symbol ingestion is unverified: upload credentials are unavailable.
  Keep the matching archive/dSYM available for upload with the release.

## Required next evidence

Obtain an accessible iPhone running iOS 17 with the failing build and exact
steps, or a captured main-thread performance trace while the failure occurs.
Alternatively, install the diagnostic build and inspect the fixed screen and
presentation milestones in a newly captured hang. TestFlight upload and App
Store submission still require an explicit user request under the native
release workflow. Do not infer a fix from passing tests on a newer OS, replace
authentication speculatively, or close the Sentry issue without verification.
