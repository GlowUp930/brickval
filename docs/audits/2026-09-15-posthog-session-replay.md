# PostHog native session replay setup — 2026-09-15

## Finding

The PostHog project was configured to record mobile sessions, with sampling at
100%, no trigger conditions, and no minimum duration. The replay page still
showed “Recording is on. Waiting for the first session.” The native app was the
gap: `PostHogConfig.sessionReplay` was left at the SDK default (`false`), so the
project setting could not start recordings from the SwiftUI app.

This is a confirmed configuration defect. The empty replay page does not prove
that users are not opening the app; it only means a real session from a build
with native replay enabled has not been observed yet.

## Implemented fix

`PostHogAnalytics` now enables the iOS replay integration during app startup and
uses screenshot mode, which the PostHog SDK requires for SwiftUI views. The
privacy controls are explicit: all text inputs, images, and sandboxed system
views remain masked, network capture is limited to timing/metadata, and console
logs are disabled. The existing US Cloud host and release PostHog key are
unchanged. No user photos, request bodies, receipts, passwords, or provider
credentials are added to analytics.

The project-side settings were checked in PostHog on 15 September 2026:

- Record user sessions: on.
- Sample rate: 100% (default).
- Recording triggers: none; all sessions are eligible.
- Minimum duration: none.
- Mobile settings: no additional mobile trigger or sample restriction.
- Retention: 30 days on the current project plan.

## Verification

- Debug iOS build: passed with PostHog 3.59.3.
- Native unit suite: 237 tests in 38 suites passed on the BrickVal Small iPhone
  simulator.
- Release configuration: a valid `phc_…` key is present through the ignored
  `Secrets.xcconfig`; the key value is not stored in this report.
- Source inspection confirms the replay integration is now included by the SDK
  setup and that SwiftUI screenshot mode is enabled before setup.

Release build 1.0.9 (180) includes this fix. The signed archive
`/tmp/BrickVal180-109.xcarchive` passed strict deep-signature verification and
contains the matching BrickVal dSYM (UUID
`B40E6B3E-60C7-314F-9F34-FDC0A52A9E70`). The 241-test native suite passed in 39
suites on the BrickVal Small iPhone simulator. Xcode uploaded the build to App
Store Connect successfully on 15 September; App Store Connect currently lists
the upload as **Processing**. TestFlight availability and a real masked replay
remain pending until Apple finishes processing and a physical device generates
a session.

The dashboard remains a pending production check. Install a new build that
contains this change, use the app for at least a few seconds, navigate between
screens, and then verify a real recording appears after PostHog processing.
Filter simulator sessions out of product reports with `is_simulator = false`.
Physical-device and production-recording confirmation is still required before
calling replay fully verified.

PostHog's iOS setup and privacy guidance are documented in [Session Replay for iOS](https://posthog.com/docs/session-replay/installation/ios) and [privacy controls](https://posthog.com/docs/session-replay/privacy?tab=iOS).
