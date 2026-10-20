# BRICKVAL-12 fatal launch hang investigation

Last verified: 2026-10-20 (Australia/Melbourne).

## Status

Investigation is incomplete. The production hang is confirmed, but its cause
has not been reproduced locally. No app fix or release is established.

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

## Required next evidence

Obtain an accessible iPhone running iOS 17 with the failing build and exact
steps, or a captured main-thread performance trace while the failure occurs.
If reproduction remains unavailable, a separately authorized diagnostic build
can record a fixed set of screen/presentation names before requesting account
presentation and after the authentication view appears, plus elapsed startup
and presentation times. It should reuse Sentry's existing hang capture and
exclude entered text, account identifiers, photos, and arbitrary properties.
This is proposed instrumentation, not an implemented fix or an approved
production release. Do not infer a fix from passing tests on a newer OS, replace
authentication speculatively, or close the Sentry issue without verification.
