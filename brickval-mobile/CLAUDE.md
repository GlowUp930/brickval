# BrickVal Mobile (Expo) — AI Agent Brief

This folder (`brickval-mobile/`) is the **native mobile app** (Expo Router).

## Read this first
- **Ignore the repo-root `CLAUDE.md`** (it is for the web/Next.js app).
- The canonical product brief + rules live in **`/Users/holamchan/brickval/brickval-mobile/AGENTS.md`**.
- Work only in this mobile app unless explicitly told otherwise.

## Non‑negotiables (mobile)
- **Branch:** do all work on `codex/stripe-appurl-fix-ihFVU` only.
- **Do not edit:** `src/` (hosted Next.js backend/web) unless the task explicitly says to.
- **No extras:** build only what the user asked for; no abstractions or “future-proofing”.
- **When editing files:** only touch explicitly named files or files you can justify as required; show a `git diff` summary at the end.

## What this app is
- Android-first native app: scan LEGO set photo → show **USD** market value.
- Key folders:
  - `app/` routes (Expo Router)
  - `components/` UI pieces
  - `lib/` storage + API bridge to `brickvalue.live`

## Dev commands (run from `brickval-mobile/`)
- `npm run start`
- `npm run android`
