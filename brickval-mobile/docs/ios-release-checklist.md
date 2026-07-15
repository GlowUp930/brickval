# Native iOS release checklist

The Expo iOS fallback remains in `android-react-native/ios` until every item below passes on the same release candidate.

## Automated checks

- SwiftUI app builds with strict Swift concurrency for iOS 17+.
- Swift Testing suite passes.
- Android's 62 logic tests, TypeScript, Expo Doctor, and production bundle export pass after repository moves.
- `Package.resolved` contains the approved Clerk, RevenueCat, Superwall, and Sentry versions.

## Update migration

- Install the currently shipped Expo app on a physical iPhone.
- Create a mixed collection with quantities, conditions, history, theme, accent, consent, and onboarding state.
- Install the native build over it without uninstalling.
- Verify every migrated value and confirm the old Keychain entries remain available for rollback.
- Verify Clerk session continuity or one normal sign-in, then restore the RevenueCat `pro` entitlement.

## Real-device TestFlight

- Camera permission, foreground/background lifecycle, interruption recovery, focus, torch, manual capture, and gallery.
- Smart single capture, bulk minifigure review, set scan, part colour choice, low-confidence review, and offline/quota/rate-limit fallback.
- Account sign-in/out, account deletion, purchase, restore purchase, Superwall placement, and entitlement sync.
- iOS 17 and iOS 26; small and large iPhones; light/dark; large Dynamic Type; VoiceOver; Reduce Motion.
- Confirm Sentry receives no scan images and consented detector feedback follows the privacy disclosure.

## Detector gate

- Complete `detector-acceptance-template.csv` with 100 positive and 100 negative real-camera samples.
- Keep the custom detector TestFlight-only if ordinary figures are missed or false auto-captures are frequent.
- Confirm dataset provenance, attribution, and commercial-use permission before public rollout.

Only after all checks pass: release native iOS, monitor rollback signals, then remove the Expo iOS implementation in a separate change.
