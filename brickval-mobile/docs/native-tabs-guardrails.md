# Tab Bar Guardrails

BrickVal uses Expo Router `Tabs` with a custom React Native tab bar for the main Collection, Scan, and Settings routes.

## Root Cause From July 2026 Debugging

Expo Router `NativeTabs` delegates rendering to Apple `UITabBar` on iOS. That is correct when BrickVal wants system-native tab styling, but it is the wrong tool when the approved design requires a consistent glassy custom tab bar across simulator, TestFlight, and later Android.

Two issues came from using `NativeTabs` for a custom design:

- Native system styling showed as a plain white tab bar on real TestFlight devices instead of the approved glassy bar.
- Native tab icons use image asset behavior that can expose oversized source artwork if raw assets are passed through.

## Rules

- Do not switch the main tab shell back to `NativeTabs` unless the product decision is to accept Apple/Android system tab styling.
- Use the custom tab bar in `app/(tabs)/_layout.tsx` when the design must match the BrickVal glass preview.
- Use purpose-sized native tab assets from `assets/native-tab-icons/`.
- Keep tab icons around `23-28` px inside the rendered bar unless a real-device screenshot proves a different size is needed.
- Collection and Settings scroll containers must include `useSafeAreaInsets()` and derive top/bottom padding from the device safe area.
- Scan controls must sit in the open band above the custom tab bar and below the viewfinder. Do not move them into the viewfinder corner area.

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
- The bottom tab bar is the custom glassy BrickVal bar, not the plain iOS system bar.
- The tab bar does not hide the first visible card/action at the bottom.
- Scan controls sit above the tab bar and below the viewfinder.
- Active state uses LEGO yellow and inactive state stays muted grey.
