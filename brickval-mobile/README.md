# BrickVal Mobile

BrickVal Mobile is one Expo/React Native app for iOS and Android. It scans LEGO items, retrieves USD valuation data from the hosted BrickVal backend, and manages a collector's local inventory.

## Structure

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and navigation |
| `components/` | Reusable mobile UI |
| `lib/` | Scanner, collection, valuation, theme, auth, and purchase logic |
| `tests/` | Behaviour tests for the mobile logic |
| `docs/` | Active engineering and release guidance |
| `assets/` | Images, icons, and bundled media |

The hosted Next.js backend remains at the repository root under `src/`. The generated `ios/` and `android/` projects are local build output and are not committed.

## Run locally

```bash
npm install
npm run start
```

Useful checks:

```bash
npm test
npx tsc --noEmit
npx expo-doctor
```

Build and release commands are defined in `package.json` and `eas.json`.

## Smart scanner

```text
Camera → BrickVal hosted detector (position/stability)
       → high-quality capture
       → Brickognize (exact item identity)
       → BrickVal market lookup
```

Roboflow credentials and model selection stay server-side. See [docs/minifigure-detector.md](docs/minifigure-detector.md).
