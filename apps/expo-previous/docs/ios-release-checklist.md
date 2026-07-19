# Expo iOS release checklist

Use this checklist for the shared Expo app before submitting the same release candidate to TestFlight.

## Automated checks

- `npm test`
- `npx tsc --noEmit`
- `npx expo-doctor`
- Production EAS build completes with the configured app identifier and release channel.

## Real-device checks

- Camera permission, foreground/background recovery, focus, torch, gallery, and manual capture.
- Smart minifigure capture, bulk review, set scan, part colour choice, low-confidence review, and network error states.
- Collection persistence, quantities, conditions, price history, theme, onboarding, and account session survive an app update.
- Sign-in/out, account deletion, purchase, restore purchase, Superwall placement, and entitlement sync.
- Small and large supported iPhones; light/dark; large text; VoiceOver; Reduce Motion.
- Sentry receives no scan images and consented detector feedback follows the privacy disclosure.

## Detector gate

- Complete `detector-acceptance-template.csv` with 100 positive and 100 negative real-camera samples.
- Keep the custom detector TestFlight-only if ordinary figures are missed or false captures are frequent.
- Confirm dataset provenance, attribution, and commercial-use permission before public release.
