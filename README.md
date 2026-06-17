# BrickVal

BrickVal is a LEGO scan-and-value product with two parts:

- `brickval-mobile/` is the native Expo app used for Android APK builds and current iOS publish-readiness work.
- `src/` is the hosted Next.js backend/web surface at `brickvalue.live`.

## Start here

- Canonical project brief and current status: [AGENTS.md](/Users/holamchan/brickval/AGENTS.md)
- Web/backend agent brief: [CLAUDE.md](/Users/holamchan/brickval/CLAUDE.md)

## Repo layout

```text
brickval/
├── brickval-mobile/        # Expo native app
├── src/                    # Hosted Next.js backend and web screens
├── supabase/               # Schema and database helpers
├── AGENTS.md               # Canonical product brief
└── README.md               # Repo overview
```

## Common commands

From repo root:

```bash
npm run dev
```

From `brickval-mobile/`:

```bash
npm run start
npm run android
npm run build:preview
npm run build:android
npm run build:ios
npm run submit:ios
```

## Documentation approach

- Keep product scope and live status in the root `AGENTS.md`.
- Move completed implementation plans into an archive folder instead of leaving them mixed with active docs.
