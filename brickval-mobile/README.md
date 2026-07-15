# BrickVal Mobile

BrickVal scans LEGO sets, minifigures, and parts, retrieves USD valuation data, and manages a collector's inventory.

## Folder map

| Folder | Purpose |
| --- | --- |
| `ios-swift/` | Native SwiftUI iPhone app (production iOS target) |
| `android-react-native/` | Expo Android app and temporary iOS rollback build |
| `docs/` | Shared architecture, detector, release, and platform guidance |
| `.agents/` | Local development skills |

The backend remains in the repository root under `src/`; mobile clients use its existing API payloads.

## Smart scanner

```text
Camera → BrickVal hosted detector (position/stability)
       → high-quality capture
       → Brickognize (exact item identity)
       → BrickVal market lookup
```

Roboflow credentials and model selection remain server-side. See [docs/minifigure-detector.md](docs/minifigure-detector.md).

## Native iOS setup

1. Install Xcode and XcodeGen.
2. Copy `ios-swift/Configuration/Secrets.example.xcconfig` to `Secrets.xcconfig` and provide development keys locally or through CI.
3. Run `xcodegen generate` from `ios-swift/`.
4. Open `ios-swift/BrickVal.xcodeproj`.

Do not remove the Expo iOS fallback until the native migration and TestFlight release checklist are complete.
