# Expo Native Tab Guardrails

BrickVal uses Expo Router `NativeTabs` for the shared Collection, Scan, and Settings shell. It deliberately accepts each platform's native tab behaviour while keeping BrickVal colours and labels consistent.

## Rules

- Keep exactly three top-level tabs: Collection, Scan, and Settings.
- Configure them in `app/(tabs)/_layout.tsx`; do not add a second custom navigation layer.
- Use SF Symbols on iOS and Material icons on Android through `NativeTabs.Trigger.Icon`.
- Use adaptive system material and theme-aware colours so the bar works in light and dark mode.
- Keep tab icons visually balanced around the platform default size.
- Collection and Settings scroll containers must derive top and bottom padding from the device safe area.
- Scan controls must stay above the tab bar and below the viewfinder.

## Checks after tab changes

Run from `brickval-mobile/`:

```bash
npx tsc --noEmit
npm test
npx expo-doctor
```

Then verify on iOS and Android:

- Header content is clear of the status bar and camera cutout.
- The tab bar does not cover the last visible action or card.
- Active and inactive icons remain readable in light and dark mode.
- Scan controls remain outside the viewfinder and above the tab bar.
