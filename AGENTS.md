# BrickVal — LEGO Scan & Value App (Native MVP)

## ⚠️ IMPORTANT: Dual Codebase Setup
**Two versions exist:**
1. **Web App** (`CLAUDE.md`) — Next.js hosted backend at `brickvalue.live`
2. **Mobile App** (`AGENTS.md` — THIS FILE) — Android native app via Expo/EAS

**For mobile development: Use AGENTS.md as the source of truth. Ignore CLAUDE.md unless explicitly instructed.**

## Active Development Branch
**All development happens on `claude/document-latest-issues-HCaVa` only.**
Do NOT push to or edit other branches without explicit permission.

## What we're building
Android-first native mobile app: scan a LEGO set photo → get its current **USD** market value (not AUD).
The immediate launch target is an Android APK built from `brickval-mobile` with Expo/EAS. iOS is planned later using the existing bundle identifier.
The existing Next.js app remains the hosted API/web backend at `brickvalue.live`. Build only what is in the plan. No extras, no abstractions.

### What's working
- ✅ Expo Router native app shell in `brickval-mobile`
- ✅ Three-tab native structure: Home, Scan, Settings
- ✅ Native first-launch onboarding flow with local goal pick
- ✅ Local on-device collection list with portfolio-style total value dashboard
- ✅ Curved historical market-value chart with dynamic tooltip and timeline labels from saved item transaction history
- ✅ Native scan mode switch for LEGO sets vs minifigures
- ✅ Fullscreen native camera scanner with stability detection and manual shutter
- ✅ Manual set number entry sheet for LEGO sets only
- ✅ Native result card with price count-up reveal
- ✅ Add-to-collection action from the native result card
- ✅ WebView modal for account, upgrade, and full result pages on `brickvalue.live`
- ✅ API bridge from the native app to hosted `/api/identify` and `/api/lookup`
- ✅ Native Superwall placement trigger for the upgrade flow
- ✅ Clerk auth token handoff now includes the Clerk user id for native identity sync
- ✅ Android APK preview build profile via EAS
- ✅ Future iOS identifiers already present in Expo config
- ✅ Hosted backend still supports Codex Vision set number detection, BrickLink, eBay, Brickset, Frankfurter, Supabase cache, Clerk, and Stripe webhook flow

### What's NOT working / stubbed
- ⏸️ iOS app is future work; do not prioritize it until Android APK launch is stable
- ⏸️ Native paywall now opens a live Superwall placement, but the dashboard campaign still needs to be kept in sync with the app placement name
- ⏸️ Collection storage is local-device only for the MVP; backend sync is future work
- ⏸️ eBay Marketplace Insights: awaiting Application Growth Check approval, falls back to Browse API (active listings)
- ⏸️ No native test coverage configured

## Tech Stack
- Expo 55, Expo Router, React Native 0.84, React 19, TypeScript 5.9
- Expo Camera, Expo Haptics, Expo Sensors, Expo Secure Store, Expo Web Browser
- React Native SVG for the native Home value chart
- React Native WebView for hosted account, upgrade, and full result screens
- RevenueCat + Superwall native modules for native subscription paywall flow
- EAS builds: Android APK for preview/internal launch, Android app bundle for production
- Next.js hosted backend at `brickvalue.live` for server-side API calls and web fallback screens
- Codex Sonnet Vision API for set identification
- eBay API, BrickLink API, Brickset API, Frankfurter API, Supabase cache, Clerk, and Stripe remain backend concerns

## Codebase Structure

```
brickval-mobile/
├── app/
│   ├── _layout.tsx               # Expo Router root + native paywall module setup
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Home, Scan, Settings tab shell
│   │   ├── index.tsx             # Home dashboard: value hero, curved horizon graph, dynamic tooltip, timeline, inventory list
│   │   ├── scan.tsx              # Native scan screen with visually distinct set/minifig mode switch
│   │   └── settings.tsx          # Account, upgrade, local collection controls
│   ├── onboarding.tsx            # Native first-launch onboarding flow
│   └── webview-modal.tsx         # Hosted web screens inside native modal
├── components/
│   ├── CameraScanner.tsx         # Fullscreen camera + auto-capture on stability
│   ├── ViewfinderOverlay.tsx     # Scan frame, dim overlay, scanline, hint
│   ├── ResultCard.tsx            # Native result sheet + price reveal animation
│   ├── ManualEntrySheet.tsx      # Native manual LEGO set number input sheet
│   ├── TopBar.tsx                # Header/account entry point
│   └── LegoLoaderNative.tsx      # Native loading state
├── lib/
│   ├── api.ts                    # Native API bridge + set/minifig result normalization
│   ├── collection.ts             # Local collection storage + per-item market history
│   ├── haptics.ts                # Native haptic helpers
│   ├── onboarding.ts             # First-launch onboarding state helpers
│   ├── paywall.ts                # Superwall trigger + identity helpers
│   └── stability.ts              # Camera stability detector
├── app.json                      # Expo app config, Android package, future iOS bundle ID
├── eas.json                      # EAS Android APK preview + production app bundle profiles
└── package.json                  # Expo/React Native scripts and dependencies

src/                              # Hosted Next.js backend and web fallback screens
supabase/                         # Table definitions + increment_scan() RPC
```

## Required Environment Variables

```
# Codex Vision
BRICKVAL_ANTHROPIC_API_KEY          ← named to avoid clash with Codex shell env

# BrickLink OAuth 1.0
BRICKLINK_CONSUMER_KEY
BRICKLINK_CONSUMER_SECRET
BRICKLINK_TOKEN_VALUE
BRICKLINK_TOKEN_SECRET

# eBay (production)
EBAY_APP_ID
EBAY_CERT_ID
EPN_CAMPAIGN_ID                     ← eBay Partner Network affiliate campaign ID
EBAY_SANDBOX                        ← "true" for sandbox mode (default: false)
EBAY_SANDBOX_APP_ID                 ← only needed when EBAY_SANDBOX=true
EBAY_SANDBOX_CERT_ID

# Brickset API
BRICKSET_API_KEY

# Auth + Payments
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# Supabase
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY           ← server-only, never expose to client

# App
NEXT_PUBLIC_APP_URL

# Legacy (not active in current flow)
RAPIDAPI_KEY
```

## Codex Vision Prompt Strategy
Send the LEGO box image with this prompt:

  "Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit
  number printed on the front lower-right corner, back panel, or near the barcode.
  Return ONLY valid JSON: {"set_number": "75192"} or {"set_number": null} if you cannot
  find a set number with confidence. Do not guess. Do not include hyphens or suffixes."

Parse the JSON response. If set_number is null or parsing fails → show the
"couldn't find set number" error and offer manual entry.

Model: Codex-sonnet-4-5, max_tokens: 64, base64 image source.

## Non-negotiable rules
- Build ONLY what is in the current task. Nothing extra.
- No helper functions, utilities, or abstractions for one-time operations.
- No "future proofing." No unused fields. No optional features.
- All external API calls (Anthropic, eBay, BrickLink, Frankfurter, Brickset) must be
  made server-side via Route Handlers or Server Actions. API keys must NEVER use
  NEXT_PUBLIC_ prefix.
- Configure serverActions.bodySizeLimit: '10mb' in next.config.ts. ✅ Done.
- Compress images client-side to <1.15 MP before upload using canvas.toBlob().
- Increment scan counter with an atomic Postgres RPC — never read-then-write:
    supabase.rpc("increment_scan", { p_user_id: userId, p_free_limit: 5 })
- Stripe webhook MUST update is_pro in Supabase on every subscription lifecycle event:
  customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.
- Every external API call must be cached in Supabase before going live.
  Run DELETE FROM api_cache WHERE expires_at < now() before every cache write.
- Mobile-first. Every screen tested at 390px width.
- Every API call must have a clear user-facing error state. No silent failures.
- Manual typed input is only for LEGO set numbers. Do not show a minifigure ID input path in the native scanner.
- After each task, explain what you built and what comes next.
- Never start the next task without confirmation.

## Hero Price Priority
The "new" hero price shown in the native result card follows this backend waterfall:

  heroNewAvgUsd = blNewAvg ?? ebayNewAvgUsd ?? blStockNewAvg

1. BrickLink sold (last 6 months) — primary, most accurate
2. eBay sold average (Marketplace Insights or Browse API)
3. BrickLink stock (active store listings) — fallback

## Price Formula
gain_pct = ((heroNewAvgUsd - rrp_usd) / rrp_usd) * 100
Show "RRP: ~$X" with tilde to indicate approximation.
rrp_aud = rrp_usd * usd_to_aud (from Frankfurter, 24hr cache)

## ComputedPricing key fields (src/types/market.ts)
- `rrp_usd`, `rrp_aud` — from Brickset US retailPrice
- `gain_pct` — based on BrickLink sold new avg vs RRP
- `ebay_new_avg_usd`, `ebay_used_avg_usd` — eBay averages (USD)
- `bricklink_new_avg_usd/min/max/qty` — BrickLink sold new (last 6 months)
- `bricklink_used_avg_usd/min/max/qty` — BrickLink sold used
- `bricklink_stock_new_avg_usd/qty` — BrickLink active store listings (new)
- `bricklink_stock_used_avg_usd/qty` — BrickLink active store listings (used)
- `bricklink_sold_new/used_details[]` — individual transaction rows
- `bricklink_stock_new/used_details[]` — individual listing rows
- `data_source: "sold" | "listing"` — "sold" = real transactions, "listing" = asking prices
- `exchange_rate_stale` — true if Frankfurter was down and fallback rates were used

## Database Schema (supabase/schema.sql)

```sql
CREATE TABLE users (
  id             text PRIMARY KEY,     -- Clerk userId
  scans_used     int  DEFAULT 0,
  is_pro         boolean DEFAULT false,
  hit_paywall_at timestamp,            -- first time user hit the free scan gate
  created_at     timestamp DEFAULT now()
);

CREATE TABLE api_cache (
  cache_key  text PRIMARY KEY,         -- e.g. "brickset:75192", "fx:EUR-USD-AUD"
  data       jsonb NOT NULL,
  expires_at timestamp NOT NULL
);
-- Index: api_cache_expires_at_idx on (expires_at)

CREATE TABLE waitlist (
  email      text PRIMARY KEY,
  created_at timestamp DEFAULT now()
);
```

RLS is enabled on all tables. Service role key bypasses RLS — no public policies needed.
**CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` must be the **service role** key (secret, longer),
NOT the anon/public key. Using the anon key will cause 42501 RLS errors on waitlist inserts.

The `increment_scan(p_user_id, p_free_limit)` RPC:
- Atomically increments scans_used (handles free limit and pro users)
- Returns `{ allowed, scans_used, is_pro }` jsonb
- If user row does not exist → returns `{ allowed: false, scans_used: 0, is_pro: false }`

## Cache Key Conventions
- Brickset set data: `brickset:{setNumber}` — 24hr TTL
- BrickLink market data: `bricklink:{setNumber}` — 24hr TTL
- eBay market data: `ebay:{setNumber}` — 24hr TTL
- Exchange rates: `fx:EUR-USD-AUD` — 24hr TTL
- RapidAPI bulk dataset: `rapidapi:all` — 7-day TTL (legacy)

## Error states to handle
- Codex Vision can't identify the set → "We couldn't find a set number in this photo.
  Try a clearer shot of the box or enter the set number manually."
- Minifigure scan can't identify the figure → "We couldn't identify the minifigure.
  Try a clearer front-facing shot." Do not offer typed ID input for minifigure mode.
- Set not found → "We don't have data for this set number.
  Double-check the number and try again."
- No market pricing available → Show set info + USD RRP but note
  "Market price not available for this set."
- Non-LEGO photo uploaded → "This doesn't look like a LEGO set.
  Try uploading a photo of a LEGO box."
- API rate limit / failure → "Something went wrong. Please try again in a moment."
- Exchange rate fetch fails → Show EUR price with note
  "Currency conversion unavailable — showing EUR price."
- Retirement status unknown → Show "Status unknown" badge, not "Active."
- Paywall hit → 402 response: "You've used all 5 free scans. Upgrade to BrickVal Pro."

## The wow moment
The price reveal animation is the core emotional beat of the product.
Animate the USD market value counting up from $0 to the final number over ~900ms.
Use cubic ease-out and target smooth 60fps native animation.
Implemented in `brickval-mobile/components/ResultCard.tsx` with React Native Animated.
This is not optional — it is in the success criteria.

## Integration Status
- Native app: Android APK preview build profile exists in `brickval-mobile/eas.json`.
- Native app: WebView modal opens hosted account, upgrade, and full result screens on `brickvalue.live`.
- Native paywall: RevenueCat + Superwall modules are configured in `brickval-mobile/app/_layout.tsx`; the `brickval_upgrade` placement is wired from the app, and the dashboard campaign controls the live paywall shown to users. Lifetime purchase still uses the hosted Stripe upgrade page as the fallback path.
- Backend scan gate: `src/lib/scan-gate.ts` is STUBBED — returns `allowed: true` for all users.
  Real backend scan limits + Stripe paywall still need final wiring.
- eBay API: OAuth active (Browse API working). EPN partner.
  Awaiting Marketplace Insights scope via Application Growth Check.
  Falls back to Browse API (active listings) until approved.
  EPN tracking + sandbox toggle + retry logic implemented.
  Set EBAY_SANDBOX=true to demo in sandbox for eBay review.
- BrickLink API: ✅ ACTIVE — OAuth 1.0 connected.
  Price guide (sold last 6 months + active stock) for new + used conditions in USD.
  Item info (name, pieces, image) also fetched. Cache key: `bricklink:{setNumber}`, 24hr TTL.
  Handles "-1" set number suffix variant automatically.
  Falls back gracefully if API is down — eBay data still works independently.
- Brickset API: ✅ ACTIVE — provides RRP (US/UK/CA/DE), theme, pieces, minifigs,
  retirement status, set images. Appends "-1" suffix for Brickset format.
  Free tier limit: 100 requests/day.
- Frankfurter API: ✅ ACTIVE — ECB-sourced rates, 24hr cache, hardcoded fallbacks.
- RapidAPI bulk dataset: LEGACY — integrated but not active in current lookup flow.
  Replaced by eBay + BrickLink as primary data sources.
- Stripe: webhook handler active, Stripe SDK singleton in place on the hosted backend.

## Key File Locations
- `brickval-mobile/app/_layout.tsx` — Expo Router root + native paywall setup
- `brickval-mobile/app/(tabs)/index.tsx` — home dashboard with value hero, curved horizon graph, dynamic tooltip, timeline, and saved inventory list
- `brickval-mobile/app/(tabs)/scan.tsx` — native scanner screen with visually distinct set/minifig mode switch
- `brickval-mobile/app/(tabs)/settings.tsx` — settings tab
- `brickval-mobile/app/webview-modal.tsx` — hosted web screens inside native modal
- `brickval-mobile/components/CameraScanner.tsx` — fullscreen camera scanner
- `brickval-mobile/components/ResultCard.tsx` — native result card + price reveal
- `brickval-mobile/components/ManualEntrySheet.tsx` — manual LEGO set number input
- `brickval-mobile/lib/api.ts` — native API bridge to `brickvalue.live` plus set/minifig result normalization
- `brickval-mobile/lib/collection.ts` — local collection storage, item type tagging, and per-item market history
- `brickval-mobile/eas.json` — Android APK preview + production build profiles
- `brickval-mobile/app.json` — Expo app config, Android package, future iOS bundle ID
- `src/lib/ebay.ts` — eBay OAuth 2.0, Browse API + Marketplace Insights, multi-marketplace
- `src/lib/bricklink.ts` — BrickLink OAuth 1.0, price guide (sold + stock), item info
- `src/lib/brickset.ts` — Brickset API v3, set metadata + RRP + retirement
- `src/lib/frankfurter.ts` — Frankfurter currency conversion (EUR/USD/AUD/GBP)
- `src/lib/scan-gate.ts` — paywall/scan limit logic (stubbed, returns allowed: true)
- `src/lib/cache.ts` — Supabase api_cache getCached() / setCached() helpers
- `src/lib/anthropic.ts` — Codex SDK singleton (lazy, server-only)
- `src/lib/supabase.ts` — Supabase service-role client singleton (lazy, server-only)
- `src/lib/stripe.ts` — Stripe SDK singleton (lazy, server-only)
- `src/lib/rapidapi.ts` — RapidAPI bulk dataset (legacy, not in active flow)
- `src/app/api/identify/route.ts` — Codex Vision POST endpoint
- `src/app/api/lookup/route.ts` — market data aggregation POST endpoint
- `src/app/api/webhook/route.ts` — Stripe webhook POST endpoint
- `src/app/result/[setNumber]/page.tsx` — hosted full result page used by WebView
- `src/components/result/PriceReveal.tsx` — hosted web price reveal animation
- `src/types/market.ts` — ComputedPricing and all market data types
- `supabase/schema.sql` — table definitions + increment_scan() RPC
- `AGENTS.md` — this file, at `/home/user/brickval/AGENTS.md` (mobile development source of truth)

## Dev Commands
- From `brickval-mobile`: `npm run start` — start Expo
- From `brickval-mobile`: `npm run android` — run Expo Android workflow
- From `brickval-mobile`: `npm run build:preview` — build Android APK for internal preview
- From `brickval-mobile`: `npm run build:android` — build Android production app bundle
- From repo root: `npm run dev` — start hosted Next.js backend/web app when needed
