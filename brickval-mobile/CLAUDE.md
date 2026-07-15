# BrickVal Mobile — AI Agent Brief

This folder contains two mobile implementations during the native iOS migration.

## Read first

- Follow the repository-root `AGENTS.md`.
- `ios-swift/` is the production-target iOS app: Swift 6, SwiftUI, iOS 17+.
- `android-react-native/` is the Android app and temporary iOS rollback build.
- `docs/` contains shared and platform-specific guidance.
- Do not edit the repo-root `src/` backend unless the task explicitly includes backend work.

## Platform rules

- iOS UI must be SwiftUI. UIKit is limited to required system bridges such as the AVFoundation preview layer.
- Android/Expo guidance applies only inside `android-react-native/`.
- Smart minifigure positioning uses the hosted BrickVal detector endpoint. Do not add Roboflow secrets or an unvalidated bundled model to either app.
- Keep the Expo iOS fallback until native SwiftUI passes migration, TestFlight, purchases, and camera parity checks.

## Commands

Native iOS:

```bash
cd ios-swift
xcodegen generate
xcodebuild -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

Android/React Native:

```bash
cd android-react-native
npm test
npx tsc --noEmit
npx expo-doctor
```
