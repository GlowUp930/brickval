# Native Tabs Guardrails

BrickVal uses Expo Router native tabs for the main Collection, Scan, and Settings routes.

## Root Cause From July 2026 Debugging

NativeTabs renders image icons from their intrinsic asset size. Passing the original attached `512x512` PNG icons directly made the iOS tab bar render oversized icon artwork as a large glass pill over app content.

NativeTabs also does not add the same top content spacing that our previous React Navigation `Tabs` shell effectively masked, so scroll screens need explicit safe-area-aware top padding.

## Rules

- Do not pass large source artwork directly into `NativeTabs.Trigger.Icon`.
- Use purpose-sized native tab assets from `assets/native-tab-icons/`.
- Keep native tab icons around `28x28` px unless a simulator screenshot proves a different size is needed.
- Collection and Settings scroll containers must include `useSafeAreaInsets()` and derive top/bottom padding from the device safe area.
- Scan already uses the safe-area-aware `TopBar`; do not add duplicate top padding to the scanner root without checking the camera layout.

## Required Checks After Tab Changes

Run these from `brickval-mobile`:

```bash
npx tsc --noEmit
npm test
npx expo-doctor
SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --device "iPhone 17 Pro" --no-bundler
```

Then capture a simulator screenshot at 390px-class iPhone width and verify:

- Header content is not under the Dynamic Island or status bar.
- The bottom tab icons are normal tab-icon size, not enlarged source artwork.
- The tab bar does not hide the first visible card/action at the bottom.
- Active state uses LEGO yellow and inactive state stays muted grey.
