# iOS TestFlight Setup

BrickVal iOS uses the same native app code as Android, with iOS-specific build and purchase configuration.

## Apple Developer

- Enroll the Apple Developer account.
- Create the App Store Connect app for bundle ID `com.brickval.app`.
- Keep the first distribution target as TestFlight.

## RevenueCat

- Add an iOS app under the existing BrickVal RevenueCat project.
- Connect App Store Connect credentials.
- Create or map these products to entitlement `pro`:
  - `brickval_pro_monthly` at `$4.99/month`
  - `brickval_pro_yearly` at `$39.99/year`
- Set the iOS public SDK key in the mobile build environment:
  - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`

## Superwall

- Keep placement name `brickval_upgrade`.
- Add an iOS campaign that uses the iOS RevenueCat products.
- Set the iOS public SDK key in the mobile build environment:
  - `EXPO_PUBLIC_SUPERWALL_IOS_KEY`

## Build Commands

- iOS development client: `npm run build:ios:dev`
- iOS TestFlight build: `npm run build:ios:testflight`
- Submit existing iOS build: `npm run submit:ios:testflight`

Android remains separate:

- Android APK preview: `npm run build:preview`
- Android production AAB: `npm run build:android`
