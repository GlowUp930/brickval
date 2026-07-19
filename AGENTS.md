# BrickVal — LEGO Scan & Value App (Native MVP)

## Active Development Branch
**Current restructuring work happens on `codex/swift-repo-structure`.**
Do NOT push to or edit the `codex/loveable-design-practices-ihFVU` branch.

## Default Focus
If a task does not explicitly say otherwise, assume we are working on the native Swift iOS app in `apps/ios-swift/`.

The previous Expo/React Native app now lives in `apps/expo-previous/` as a migration reference only. Do not add new product work there unless the task explicitly asks for Expo.

## Design Source
For mobile UI work, follow `apps/ios-swift/design-qa.md` and the SwiftUI implementation already in `apps/ios-swift/BrickVal/`.

The Collection tab follows the Robinhood-style portfolio direction for layout and visual hierarchy, except where BrickVal product rules, business requirements, available data, or platform constraints require adaptation. Robinhood green (`#00C805`) is the active/value color for the mobile Collection direction.

Keep product-language notes separate from implementation notes. Do not let archived Expo docs override the active Swift app direction.

## What we're building
Native mobile app: scan a LEGO set photo → get its current **USD** market value (not AUD).
Current default scope is iOS publish-readiness using the native Swift app and bundle identifier `com.brickval.app`.
The existing Next.js app remains the hosted API/web backend at `brickvalue.live`. Build only what is in the plan. No extras, no abstractions.

### What's working
- ✅ SwiftUI app shell in `apps/ios-swift/BrickVal/App`
- ✅ Collection, Scan, Onboarding, and Settings feature folders
- ✅ Local persistence modules for collection and preferences
- ✅ Camera module and auto-scan session logic
- ✅ Design system and interactive stock chart
- ✅ Unit tests for collection storage and auto-scan session behavior
- ✅ XcodeGen project source in `apps/ios-swift/project.yml`
- ✅ Hosted backend: Codex Vision set detection, BrickLink, eBay, Brickset, Frankfurter, Supabase cache, Clerk, Stripe webhook

### What's NOT working / stubbed
- ⏸️ Native paywall opens a live Superwall placement with localized StoreKit pricing variables, but the dashboard campaign still needs to stay in sync with the app placement name and product state in App Store Connect
- ⏸️ Paywall flow still needs final on-device verification through purchase completion after the recent pricing-template fix
- ⏸️ Collection storage is local-device only for the MVP; backend sync is future work
- ⏸️ eBay Marketplace Insights: awaiting Application Growth Check approval, falls back to Browse API (active listings)
- ⏸️ Brickset free tier: 100 requests/day limit — may throttle under high load
- ⏸️ Expo app has been moved to `apps/expo-previous/` and should not be treated as current

## Tech Stack
- SwiftUI native iOS app in `apps/ios-swift`
- Xcode project generated from `apps/ios-swift/project.yml`
- Clerk iOS SDK, RevenueCat, Superwall, and Sentry
- Next.js hosted backend at `brickvalue.live` for server-side API calls and web fallback screens
- Codex Sonnet Vision API for set identification
- eBay API, BrickLink API, Brickset API, Frankfurter API, Supabase cache, Clerk, and Stripe remain backend concerns

## Codebase Structure

```
apps/
├── ios-swift/
│   ├── BrickVal.xcodeproj/
│   ├── BrickVal/
│   │   ├── App/                  # App shell, tabs, routing
│   │   ├── Core/                 # Camera, models, persistence, design system
│   │   ├── Features/             # Collection, scan, onboarding, settings
│   │   └── Resources/            # Assets, Info.plist, launch screen
│   ├── BrickValTests/            # Unit tests
│   ├── project.yml               # XcodeGen source of truth
│   └── design-qa.md              # Visual QA notes
├── expo-previous/                # Previous Expo app, reference only

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

# Sentry Error Tracking
SENTRY_DSN              ← backend/web Sentry DSN; Swift Sentry config belongs in the iOS app configuration

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
- When working on Swift UI, check existing views and `apps/ios-swift/design-qa.md` before inventing new states or visual patterns.
- All external API calls (Anthropic, eBay, BrickLink, Frankfurter, Brickset) must be
  made server-side via Route Handlers or Server Actions. API keys must NEVER use
  NEXT_PUBLIC_ prefix.
- Configure serverActions.bodySizeLimit: '10mb' in next.config.ts. ✅ Done.
- Web image uploads should compress images client-side to <1.15 MP before upload using canvas.toBlob().
- Swift image uploads should compress before sending to the hosted API using native image processing.
- Increment scan counter with an atomic Postgres RPC — never read-then-write:
    supabase.rpc("increment_scan", { p_user_id: userId, p_free_limit: 5 })
- Stripe webhook MUST update is_pro in Supabase on every subscription lifecycle event:
  customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.
- Every external API call must be cached in Supabase before going live.
  Run DELETE FROM api_cache WHERE expires_at < now() before every cache write.
- Web screens must be tested at 390px width.
- Swift screens must be checked on a small iPhone simulator size before release.
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
Implement this in SwiftUI in `apps/ios-swift/BrickVal/Features/Scan/ScanResultView.swift`.
This is not optional — it is in the success criteria.

## Integration Status
- Native app: Swift iOS project lives in `apps/ios-swift/`.
- Native paywall: RevenueCat and Superwall are Swift Package dependencies in `apps/ios-swift/project.yml`.
- Native auth/error tracking: Clerk and Sentry are Swift Package dependencies in `apps/ios-swift/project.yml`.
- Previous Expo app: kept at `apps/expo-previous/` for reference only.
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
- `apps/ios-swift/BrickVal/App` — Swift app shell, tabs, and routing
- `apps/ios-swift/BrickVal/Core` — camera, models, persistence, and design system
- `apps/ios-swift/BrickVal/Features` — collection, scan, onboarding, and settings UI
- `apps/ios-swift/BrickVal/Resources` — iOS assets, Info.plist, and launch screen
- `apps/ios-swift/BrickValTests` — Swift unit tests
- `apps/ios-swift/project.yml` — XcodeGen project source
- `apps/expo-previous` — previous Expo app, reference only
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
- `AGENTS.md` — this file, at `/Users/holamchan/brickval/AGENTS.md`

## Dev Commands
- From `apps/ios-swift`: `xcodegen generate` — regenerate the Xcode project after project.yml changes
- From `apps/ios-swift`: `xcodebuild -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,name=iPhone 16' test` — run Swift unit tests
- From `apps/expo-previous`: `npm test` — check the previous Expo app only when using it as reference
- From repo root: `npm run dev` — start hosted Next.js backend/web app when needed
