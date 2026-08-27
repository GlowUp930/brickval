# BrickVal iOS

This is the canonical BrickVal mobile app.

The app is a native SwiftUI iOS app for scanning LEGO sets, viewing scan results, managing a local collection, and preparing the App Store/TestFlight release path.

## Structure

```text
apps/ios-swift/
├── BrickVal.xcodeproj/
├── BrickVal/
│   ├── App/              # App shell, tabs, routing
│   ├── Core/             # Camera, models, persistence, design system
│   ├── Features/         # Collection, scan, onboarding, settings
│   └── Resources/        # Assets, Info.plist, launch screen
├── BrickValTests/        # Unit tests
├── project.yml           # XcodeGen source of truth
└── design-qa.md          # Visual QA notes and references
```

## Commands

Generate the Xcode project after changing `project.yml`:

```bash
xcodegen generate
```

`project.yml` is the edit source for project structure. `BrickVal.xcodeproj` is committed so the app opens directly in Xcode, but regenerate it after project file changes.

## PostHog analytics

PostHog is configured during `BrickValApp` initialization with lifecycle and screen-view capture enabled. Add the `phc_...` project key to the ignored `Configuration/Secrets.xcconfig` as `POSTHOG_API_KEY`; copy the blank entry from `Configuration/Secrets.example.xcconfig` if needed. The app uses the Clerk user ID for identity, resets analytics on logout, and exposes feature-flag reads through `AppSDKCoordinator`.

Run unit tests from this folder:

```bash
xcodebuild -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,name=iPhone 16' test
```

## Repo Rules

- Keep Swift app work in `apps/ios-swift/`.
- Use `apps/expo-previous/` only as a migration reference.
- Do not add new feature work to the Expo app unless the task explicitly asks for it.
- Keep backend/API work in the root Next.js app under `src/`.
