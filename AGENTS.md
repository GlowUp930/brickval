# BrickVal — LEGO Scan & Value App (Native MVP)

## Failed-scan retry — 2026-09-11

The failed single-scan screen no longer traps taps behind its transparent camera-stage accessibility surface. Try again is directly hittable and accessible, and a deterministic UI regression verifies immediate recovery on small and large simulators. The focused scan lifecycle suite passes. Physical-camera confirmation remains required.

## Collection listing fallback — 2026-09-11

Collection history now uses the same per-condition fallback as the headline price: BrickLink completed rows first, then BrickLink active listings when no sold rows exist. Listing rows are marked separately, anchored to the fetch time because they have no transaction date, and shown in the chart as a current asking-price observation plus in the Market snapshot table. Sold and listing rows are never mixed; listing tables use “Active listings” instead of “Times sold,” and the chart explains when dated sales history is unavailable. The cache key is `collection-history:v3` so existing rows refresh for the source metadata.

## Onboarding startup and preview cleanup — 2026-09-10

The first onboarding surface now opens directly on the demo and keeps Get Started available as soon as that surface appears. The old roughly one-second branded gate was removed; the launch logo still provides the branded handoff. The Get Started action advances to the first detail screen immediately, while the production account, referral, paywall, and subscription paths remain unchanged.

Settings no longer exposes the temporary hard-paywall onboarding preview. Its isolated preview sheet and mode were removed, and the remaining debug-only Settings fixture was renamed to `-showSettingsRootDemo` so no production path depends on the preview.

Focused onboarding/Settings checks pass on both simulator sizes. The 229-test unit suite passes on both sizes, while the full UI run still has two existing collection-navigation failures on each size caused by the fixture's “Could not remove item” alert; they are unrelated to onboarding and are recorded separately. The signed 1.0.8 (176) archive passed validation and was uploaded to App Store Connect; delivery `5ee44d02-2242-440f-9e4d-6e89ad84f49f` is processing for TestFlight. Physical-device verification remains pending.

## Dense bulk price labels — 2026-09-11

Completed bulk scans keep the full localized price on every resolved figure, including dense 60-result photos. Labels adapt between regular, compact, and micro sizes using result count and photo area, then use deterministic lanes around the detected figure. The planner reserves the summary and result rail, keeps chips inside the photo stage, and draws a short leader line when a label moves away from its figure. There is no numbered-only fallback, so the amount remains visible; VoiceOver labels retain the currency code and the 44-point tap target remains available.

Focused layout tests cover 2, 10, 30, and 60 figures, bounds, spacing, reserved areas, stable placement, and leader anchors. The dense bulk UI check passed on the small simulator and was visually inspected on the iPhone 17 Pro simulator. The full 229-test unit suite passed on the small simulator; the iPhone 17 Pro run had one pre-existing time-dependent `portfolioHistoryUsesAddedItemMarketHistory` expectation (`216` versus `240`) and is unrelated to the bulk layout. The large dense UI run reached the completed screen and captured all prices, but its 35-second readiness assertion timed out on the slower simulator; the screenshot shows the full-price chips. Physical-device confirmation remains pending.

## Smooth market charts and first-launch guidance — 2026-09-10

Collection and item charts now use bounded monotone Hermite sampling before the existing Swift Charts monotone interpolation. The line has a smoother live-app shape while preserving stable sample identities, real date spacing, the 240 ms transition, Reduce Motion behavior, touch inspection, and the rule that values cannot overshoot recorded sales. Pricing and history sources are unchanged.

The first-launch Collection and Scan tips now use shorter action-focused copy, numbered icon tiles, a clearer card hierarchy, 44-point dismissal targets, and reduced-motion-safe transitions. The copy reuses the existing 13-language catalog. The full multi-step onboarding flow and scan behavior are unchanged.

Verification: the 229-test native unit suite passes on both the BrickVal Small iPhone and BrickVal iPhone 17 Pro simulators; the focused chart regression passes 11 tests; the 13-language audit passes with 807 app strings plus four Info.plist strings; and the Release archive succeeds. The full UI run retains two existing collection-navigation fixture failures on each size. Final tip cards were visually inspected on the small simulator. Build 1.0.8 (176) was uploaded to App Store Connect and is processing for TestFlight; physical iPhone confirmation remains pending.

## Regional history release — build 175 — 2026-09-10

The seller-country market filter is now included in native release 1.0.8 (175). The backend is live at `brickvalue.live` from Vercel deployment `dpl_5gjKSf8pA9CrnHoioMJEQsTchzTG`; a live 75192 request returned 42 New and 26 Used dated rows across 17 seller countries, and an expired bearer session returned 401. Guest history access remains bounded by the existing request budget. The signed archive `/tmp/BrickVal175.xcarchive` passed code-signature verification, and Xcode Organizer shows build 175 as Uploaded to Apple for TestFlight processing. Physical-device verification and Sentry symbol ingestion remain explicit follow-up checks; no simulator result is treated as device sign-off.

## Seller-country market filters — 2026-09-10

Regional history is seller-country driven rather than US-only. The history response keeps a normalized two-letter `seller_country_code`; the native cache contract is `collection-history:v3`. Collection and item charts prepare All regions plus every seller country present in saved BrickLink rows in one background pass. Users can choose a country from the globe menu, and the choice is remembered separately for Collection and each item. The filter changes only dated graphs, snapshots, coverage, and graph-derived change; current headline prices, valuation, retail comparisons, ownership, and scan pricing stay unchanged. Rows without a country remain in All regions and are never treated as belonging to a country. Backend/native regression coverage passes and the implementation is shipped in build 175; physical-device verification remains pending.

## Collection Used-history recovery — 2026-09-10

Build 174 can show a valid Used sold-price headline while leaving the graph empty when an earlier incomplete history response saved a fresh timestamp. The live 75192 cache contains 17 Used sales in the 3M window, and its New counts exactly match the affected screen, so the provider and public history payload are healthy. Native refresh now treats empty dated rows as incomplete whenever the saved pricing source says completed sales exist, and refetches those rows without rescanning or consuming scan/referral credits. The regression and all 224 native unit tests pass on the small simulator; this source fix still needs a later TestFlight build and physical-device confirmation.

## Collection performance — 2026-09-09

Build 172 work removes synchronous history reconstruction from Collection/item rendering, prepares all timeframes off the main actor, shares chart data, and caches/downsamples public product images. Sentry BRICKVAL-M confirms build 171's 14–15 second main-thread hang in date parsing through `PortfolioSummaryView`; this is a real production defect. Keep history preparation out of view computed properties and preserve genuine dated sales, coverage, current valuation separation, and Pro rules. The large-screen navigation test and follow-up prepared-fixture rerun pass locally; a fresh CI run is in progress. See `docs/audits/2026-09-09-collection-performance.md` for measurements and current release status. Device confirmation remains required; simulator timings do not establish recovery on the owner's phone.

## Purchase diagnostics — 2026-09-09

Build 171 adds correlated purchase/restore attempts in PostHog and Sentry, with hashed RevenueCat identity, Apple permission/storefront, OS, elapsed time and original error codes. Purchase behavior, products and pricing remain unchanged; no automatic retries. Full native verification passes 222 tests / 448 runs on small and large simulators, plus all 13 locales. The original build-162/166 Apple purchase-not-allowed case remains unresolved: its customer is unidentified, and no physical test device is available. See `docs/audits/2026-09-09-purchase-attempts.md` for release status and recovery criteria. Never treat no new errors as proof that this customer recovered.

Release: 1.0.8 (171) is processed and available to both internal TestFlight groups; matching Sentry symbols are verified. Final GitHub run `34310113931` passes purchase/unit, graph, backend and database checks but fails an older bulk-summary UI assertion, also seen before this task. Keep that separate verification gap explicit; local passing suites do not mean the whole CI run passed.

## Collection chart regression — 2026-09-08

Build 170 replaces build 169's insufficient saved-value placeholder with real dated BrickLink sales. Collection automatically loads and persists history for existing items through `/api/mobile/collection-history`, separately from scan prices. Graphs use quantity-weighted daily observations, current holdings and explicit coverage; a single point is not a historical graph. History has a separate request budget and never spends scan/referral credits. See `docs/audits/2026-09-08-real-market-history.md` and native CONTEXT.md for verification and release status.

## Live reliability rollout — 2026-09-08

The production database repair and signed Clerk deletion integration are live. Backend deployment `dpl_FWhpwtHFCcRj7doPKRgYb1dJz3qi` was promoted after authentication/signature checks. Thirteen verified RevenueCat provider records were seeded while preserving all 15 existing Pro flags. Build 168 includes restart-safe local account-deletion cleanup. Version 1.0.8 (168) is processed and available to both existing internal TestFlight groups. GitHub run 34185416653 passed backend, database and native checks; local native verification passed 206 tests across two simulator sizes (416 runs). Physical iPhone referral, purchase, camera and deletion journeys remain unverified. See the September 8 remediation report for evidence and remaining checks. This section supersedes earlier pending-production notes below.


## Reliability remediation status — 2026-09-08

The [remediation report](docs/audits/2026-09-08-reliability-remediation.md) tracks the implemented fixes and rollout evidence. Production database repair, verified provider reconciliation and signed Clerk deletion delivery are complete. Local verification passes 69 backend tests, 27 reliability assertions and 206 native tests on two simulator sizes (416 runs), plus isolated database, type checking and 13-language checks. Physical-device journeys remain unverified; source and simulator coverage are not full reliability sign-off.

## Reliability audit status — 2026-09-05

The [whole-app audit](docs/audits/2026-09-05-whole-app.md) is the latest reliability assessment for build 167. Automated suites pass, but reliability sign-off is withheld: production lacks required referral/intro-credit and notification schema; targeted tests reproduce lost concurrent referral rewards, scan authorization bypasses, subscription errors, invented pricing/history, and collection recovery data loss. Physical-device referral and Apple purchase verification remain blocked. This audit made no product fixes or production changes; implementation and release are separate work.

Older implementation-status notes below are historical, not verification evidence. In particular, `scan-gate.ts` contains implemented metering with failure paths; it is not merely a stub. The audit report and evidence should guide the next reliability task.

## Active Development Branch
**Current restructuring work happens on `codex/swift-repo-structure`.**
Do NOT push to or edit the `codex/loveable-design-practices-ihFVU` branch.

## Repository Source Of Truth
The active repository for the native app and backend is `/Users/holamchan/brickval`.
The native SwiftUI source is `/Users/holamchan/brickval/apps/ios-swift/` and is the source used for TestFlight builds.
`/Users/holamchan/Desktop/brickval-mobile/ios` is a separate legacy Expo checkout and must not be used as the source for native builds or releases.
When building, testing, committing, or pushing the current app, work from `/Users/holamchan/brickval` on `codex/swift-repo-structure`.

## Default Focus
If a task does not explicitly say otherwise, assume we are working on the native Swift iOS app in `apps/ios-swift/`.

The previous Expo/React Native app now lives in `apps/expo-previous/` as a migration reference only. Do not add new product work there unless the task explicitly asks for Expo.

## Design Source
For mobile UI work, follow `apps/ios-swift/design-qa.md` and the SwiftUI implementation already in `apps/ios-swift/BrickVal/`.

The Collection tab follows the Robinhood-style portfolio direction for layout and visual hierarchy, except where BrickVal product rules, business requirements, available data, or platform constraints require adaptation. Robinhood green (`#00C805`) is the active/value color for the mobile Collection direction.

Keep product-language notes separate from implementation notes. Do not let archived Expo docs override the active Swift app direction.

## What we're building
Native mobile app: scan a LEGO set photo → get its current market value from canonical **USD** data, with optional locale-aware display conversion.
Current default scope is iOS publish-readiness using the native Swift app and bundle identifier `com.brickval.app`.
The existing Next.js app remains the hosted API/web backend at `brickvalue.live`. Build only what is in the plan. No extras, no abstractions.

### What's working
- ✅ SwiftUI app shell in `apps/ios-swift/BrickVal/App`
- ✅ Collection, Scan, Onboarding, and Settings feature folders
- ✅ Local persistence modules for collection and preferences
- ✅ Camera module and auto-scan session logic
- ✅ Progressive bulk results session with bounded four-request pricing, spatial reveal ordering, compact result rail, contextual cached-candidate correction, and exact-region retry for unidentified detections
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
- Clerk iOS SDK, RevenueCat, Superwall, Sentry, and PostHog
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

# Product analytics
POSTHOG_API_KEY         ← PostHog project key beginning with phc_; keep it in the ignored native Secrets.xcconfig

# App
NEXT_PUBLIC_APP_URL

# Native iOS rollout
BRICKVALUE_MINIMUM_IOS_BUILD       ← optional forced-update gate; set only after the replacement build is live
BRICKVALUE_IOS_UPDATE_URL          ← optional App Store/TestFlight update URL
BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED ← optional locked soft-paywall preview rollback switch; defaults on for app-accessible non-Pro users with no usable introductory or referral bulk credit in policy v6

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
- Exchange rates (including legacy eBay normalization): `fx:all-rates-v3` — 7-day TTL, refreshed after 24 hours
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
- Exchange rate fetch fails → Show the canonical USD price with the `USD` code and a note
  "Currency conversion unavailable — showing USD price."
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
- Native product analytics: PostHog is a Swift Package dependency in `apps/ios-swift/project.yml`; it starts during native app initialization, captures lifecycle/screen events, identifies Clerk users by stable ID, and resets on logout. The project key is local-only in `Configuration/Secrets.xcconfig`.
- Previous Expo app: kept at `apps/expo-previous/` for reference only.
- Backend scan gate: `src/lib/scan-gate.ts` implements metering and durable bulk authorization. See the remediation report for production rollout dependencies.
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
- Frankfurter API: ✅ ACTIVE — ECB-sourced daily USD rates for the 24 display currencies; refreshed after 24 hours, retained for up to seven days, with stale and USD fallback handling.
- RapidAPI bulk dataset: LEGACY — integrated but not active in current lookup flow.
  Replaced by eBay + BrickLink as primary data sources.
- Stripe: webhook handler active, Stripe SDK singleton in place on the hosted backend.

## Key File Locations
- `apps/ios-swift/BrickVal/App` — Swift app shell, tabs, and routing
- `apps/ios-swift/BrickVal/Core` — camera, models, persistence, and design system
- `apps/ios-swift/BrickVal/Core/Analytics/PostHogAnalytics.swift` — PostHog setup, identity/reset, events, and feature flags
- `apps/ios-swift/BrickVal/Features` — collection, scan, onboarding, and settings UI
- `apps/ios-swift/BrickVal/Resources` — iOS assets, Info.plist, and launch screen
- `apps/ios-swift/BrickValTests` — Swift unit tests
- `apps/ios-swift/project.yml` — XcodeGen project source
- `apps/expo-previous` — previous Expo app, reference only
- `src/lib/ebay.ts` — eBay OAuth 2.0, Browse API + Marketplace Insights, multi-marketplace
- `src/lib/bricklink.ts` — BrickLink OAuth 1.0, price guide (sold + stock), item info
- `src/lib/brickset.ts` — Brickset API v3, set metadata + RRP + retirement
- `src/lib/frankfurter.ts` — Frankfurter USD-based rates plus legacy eBay normalization fields
- `src/app/api/mobile/exchange-rates/route.ts` — mobile USD-based display-rate contract for the 24 supported currencies
- `src/lib/scan-gate.ts` — paywall/scan limits and durable bulk authorization
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
- From `apps/ios-swift`: `xcodebuild -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,name=BrickVal Small iPhone' test` — run Swift unit tests
- From `apps/expo-previous`: `npm test` — check the previous Expo app only when using it as reference
- From repo root: `npm run dev` — start hosted Next.js backend/web app when needed

## Localization
- Native localization uses `apps/ios-swift/BrickVal/Resources/Localizable.xcstrings` and `InfoPlist.xcstrings` for English (`en`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Brazilian Portuguese (`pt-BR`), Dutch (`nl`), Japanese (`ja`), Korean (`ko`), Simplified Chinese (`zh-Hans`), Traditional Chinese (`zh-Hant`), Arabic (`ar`), and Hindi (`hi`).
- English is the source and fallback. System default selects the best supported device language; Profile → Language offers an in-app picker for System default or any supported language and persists that choice locally. Unsupported device languages fall back to English.
- Keep API identifiers, analytics events, logs, set numbers, and upstream LEGO names unchanged. Keep market values canonical USD, then format the selected display currency, dates, percentages, and quantities with the active locale; use POSIX only for machine-readable dates and identifiers.
- Every customer-facing market value includes the actual active ISO currency code beside the localized amount; unavailable conversion explicitly falls back to and identifies `USD`.
- Every displayed market price is identified as an average. Sold data uses “Average sold price” with a completed-sales explanation; active-listing fallback uses “Average asking price” and says it is not a completed sale. Onboarding, scan processing, result, collection-detail, bulk, share-card, and VoiceOver copy must keep this distinction clear.
- Strings created outside SwiftUI views use `BrickValLocalization.localized(...)` so an in-app override applies immediately to alerts, model state, accessibility values, and notifications.
- Run `npm run test:localization` before native releases. It checks all 13 locales, non-empty values, interpolation placeholders, plural forms, and permission strings. Arabic mirroring, Dynamic Type, and sensitive-copy native review remain part of release QA.
- Currency display supports USD, EUR, GBP, AUD, CAD, NZD, JPY, CNY, HKD, TWD, KRW, SGD, INR, BRL, MXN, CHF, SEK, NOK, DKK, PLN, CZK, AED, SAR, and ZAR. Profile → Currency offers these codes plus System default; the override is independent from language and persists locally.
- Market data and analytics remain canonical USD. The app refreshes USD-based rates daily, keeps successful rates for up to seven days, marks retained rates stale, and temporarily shows USD with a localized notice when no usable rate exists. StoreKit, RevenueCat, and Superwall subscription prices always come directly from Apple and are not converted.
