# BrickVal

BrickVal is a LEGO scan-and-value product.

The active mobile app is the native Swift/iOS app in `apps/ios-swift/`. The previous Expo/React Native app is kept in `apps/expo-previous/` as a reference while we migrate useful product decisions and UI patterns.

## Repo Decision

Swift stays in this GitHub repo because it is the same BrickVal product, shares the same backend contracts, and benefits from one PR history for product/API/mobile changes. A separate repo only makes sense later if the iOS app has a separate team, separate release governance, or no longer changes together with the backend.

## Repo Layout

```text
brickval/
├── apps/
│   ├── ios-swift/       # Canonical iOS app
│   └── expo-previous/   # Previous Expo app, reference only
├── src/                 # Hosted Next.js backend and web screens
├── supabase/            # Schema and database helpers
├── AGENTS.md            # Canonical working brief
└── README.md            # Repo overview
```

## Start Here

- iOS app: `apps/ios-swift/README.md`
- Product and working rules: `AGENTS.md`
- Web/backend brief: `CLAUDE.md`

## Common Commands

From repo root:

```bash
npm run dev
```

From `apps/ios-swift/`:

```bash
xcodegen generate
xcodebuild -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,name=iPhone 16' test
```

From `apps/expo-previous/`, only when checking the old implementation:

```bash
npm test
npx tsc --noEmit
```
