# BrickVal Mobile Expo Reference — Agent Brief

This folder is archived reference material for the previous Expo/React Native mobile app.

The active mobile app is the native Swift app in `../ios-swift/`. Do not add new product work here unless the task explicitly asks for Expo.

## Read first

- Follow the repository-root `AGENTS.md` for product and engineering rules.
- Treat `DESIGN.md` as historical Expo design guidance only.
- Use `CONTEXT.md` only for product language and terminology.
- Do not edit the repository-root `src/` backend unless the task explicitly includes backend work.

## Platform rules

- Keep shared behaviour in Expo/React Native; use platform-specific files only when the platforms genuinely differ.
- Treat generated `ios/` and `android/` folders as local build output. Configure native behaviour through Expo config and plugins where practical.
- Keep Roboflow secrets and model selection on the hosted backend.

## Checks

Run from `apps/expo-previous/`:

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```
