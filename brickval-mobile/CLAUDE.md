# BrickVal Mobile — Agent Brief

This folder contains the single Expo/React Native mobile app for iOS and Android.

## Read first

- Follow the repository-root `AGENTS.md` for product and engineering rules.
- Follow `DESIGN.md` for mobile visual direction.
- Use `CONTEXT.md` only for product language and terminology.
- Do not edit the repository-root `src/` backend unless the task explicitly includes backend work.

## Platform rules

- Keep shared behaviour in Expo/React Native; use platform-specific files only when the platforms genuinely differ.
- Treat generated `ios/` and `android/` folders as local build output. Configure native behaviour through Expo config and plugins where practical.
- Keep Roboflow secrets and model selection on the hosted backend.

## Checks

Run from `brickval-mobile/`:

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```
