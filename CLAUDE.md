# BrickVal — LEGO Scan & Value App (Lean MVP)

## What we're building
Mobile-first web app: scan a LEGO set photo → get its current USD market value.
This is a Lean MVP. Build only what is in the plan. No extras, no abstractions.

## Current State (updated March 2026)
The core scan-and-value flow is WORKING end-to-end:
1. User signs in (Clerk) → uploads/photographs a LEGO box → Claude Vision extracts set number
2. App fetches BrickLink + eBay market data in parallel → computes pricing → shows animated result
3. Deployed on Vercel with auto-deploy from `main` branch

### What's working
- ✅ Scan flow: camera capture, file upload, manual set number entry
- ✅ Claude Vision set number detection (claude-sonnet-4-5)
- ✅ BrickLink API: sold + stock price guides + item metadata (OAuth 1.0)
- ✅ eBay API: sold + listing prices across US/AU/GB/DE (OAuth 2.0)
- ✅ Price reveal animation (count-up from $0, cubic ease-out, 60fps)
- ✅ Supabase caching for all external API calls (24h TTL)
- ✅ Vercel Cron job for hourly cache cleanup
- ✅ Stripe webhook handler for subscription lifecycle events
- ✅ Clerk authentication
- ✅ Exchange rate conversion via Frankfurter API (cached 24h)
- ✅ All pricing logic centralised in compute-pricing.ts (no duplication)

### What's NOT working / stubbed
- ⏸️ Paywall: `scan-gate.ts` returns `allowed: true` for everyone — Stripe paywall not wired yet
- ⏸️ eBay Marketplace Insights: awaiting Application Growth Check approval, falls back to Browse API (active listings)
- ⏸️ RRP / gain%: no data source after Brickset removal — future Supabase RRP table
- ⏸️ No test coverage (no test framework configured)
- ⏸️ `lucide-react`, `framer-motion`, `clsx` are installed but unused

## Tech Stack
- Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- Claude Sonnet Vision API for set identification
- BrickLink API — PRIMARY market data source (ACTIVE — OAuth 1.0, sold + stock prices + item metadata)
- eBay API — FALLBACK market data source (ACTIVE — OAuth 2.0, sold + listing prices, 4 markets: US/AU/GB/DE)
- Facebook Marketplace — PLANNED future data source
- Frankfurter API for currency rates (24hr Supabase cache)
- Clerk for auth, Stripe for payments ($12.99 USD/month)
- Supabase: 2 tables only — users and api_cache

## Data Flow Architecture
```
User uploads photo
    ↓
/api/identify (POST) — Claude Vision extracts set number
    ↓
Client navigates to /result/{setNumber}
    ↓
SSR page.tsx fetches data (parallel):
├── getExchangeRates() → Frankfurter (cached 24h in Supabase)
├── getEbayMarketData() → eBay OAuth2 → Browse/Insights API (cached 24h)
└── getBrickLinkMarketData() → BrickLink OAuth1 → 5 parallel calls (cached 24h):
    ├── Item metadata (name, image, year, retired)
    ├── Sold new price guide
    ├── Sold used price guide
    ├── Stock new price guide
    └── Stock used price guide
    ↓
computePricing(ebayData, brickLinkData, setNumber, ratesStale)
    → Returns { setInfo: SetInfo, pricing: ComputedPricing }
    ↓
<PriceReveal> renders animated result with sparklines and price tables
```

The same flow also works via POST /api/lookup (JSON API) — both call computePricing().

## Data Sources
**We use BrickLink and eBay only. No other data sources.**
- Set metadata (name, image, year, retirement status) comes from BrickLink item API
- Market pricing comes from BrickLink price guides (sold + stock) and eBay (sold + listing)
- RRP is not currently available (was previously from Brickset, now removed). Future: Supabase-based RRP table.

### Data Source Priority (per condition: new / used)
Hero price uses this waterfall:
  1. BrickLink sold avg (last 6 months of transactions)
  2. eBay sold avg (last 30–60 days, across US/AU/GB/DE)
  3. BrickLink stock avg (active store listings)
  4. eBay listing avg (Browse API fallback)

Display order: BrickLink sold rows → BrickLink stock rows → eBay rows (only when no BrickLink data)

### Planned Future Integrations
- Facebook Marketplace (transaction data)
- Additional platforms TBD

## File Tree
```
src/
├── app/
│   ├── api/
│   │   ├── cron/cache-cleanup/route.ts  — Vercel Cron: hourly expired cache row deletion
│   │   ├── identify/route.ts            — Claude Vision: photo → set number
│   │   ├── lookup/route.ts              — JSON API: set number → pricing (uses compute-pricing.ts)
│   │   └── webhook/route.ts             — Stripe subscription lifecycle events
│   ├── result/[setNumber]/
│   │   ├── page.tsx                     — SSR result page (uses compute-pricing.ts)
│   │   └── error.tsx                    — Error boundary
│   ├── scan/page.tsx                    — Camera/upload + manual entry
│   ├── upgrade/
│   │   ├── page.tsx                     — Pro upsell page
│   │   └── actions.ts                   — Stripe checkout session
│   ├── globals.css                      — CSS variables (dark theme only)
│   ├── layout.tsx                       — Root layout (Clerk + Vercel Analytics)
│   └── page.tsx                         — Homepage (Hero component)
├── components/
│   ├── home/Hero.tsx                    — Landing page hero
│   ├── result/PriceReveal.tsx           — Price display: sparklines, tabs, tables (~494 lines)
│   └── scan/
│       ├── ImageUploader.tsx            — Camera/upload with client-side compression
│       └── ManualEntry.tsx              — Set number input form
├── lib/
│   ├── anthropic.ts                     — Claude API singleton
│   ├── bricklink.ts                     — BrickLink OAuth 1.0 (price guides + item data, ~272 lines)
│   ├── cache.ts                         — Supabase api_cache (getCached / setCached, no DELETE)
│   ├── compute-pricing.ts              — Shared pricing computation (single source of truth)
│   ├── ebay.ts                          — eBay OAuth 2.0 (4 marketplaces, ~437 lines)
│   ├── frankfurter.ts                   — Exchange rates (free, cached 24h)
│   ├── scan-gate.ts                     — Paywall logic (STUBBED — returns allowed: true)
│   ├── stripe.ts                        — Stripe client singleton
│   └── supabase.ts                      — Supabase service role client
└── types/
    ├── market.ts                        — ComputedPricing, SetInfo, BrickLinkDetail, EbaySale
    └── scan.ts                          — IdentifyResponse, LookupResponse
```

## Styling
- Dark theme only (no light mode toggle). CSS variables in globals.css.
- Key colours: `--background: #0d0d0f`, `--accent: #f5c518` (yellow), `--foreground: #f0f0f5`
- Tailwind CSS v4 + inline `style={{ color: "var(--xxx)" }}` pattern throughout
- Geist Sans + Geist Mono fonts via Google Fonts

## Required Environment Variables
- BRICKVAL_ANTHROPIC_API_KEY  ← named to avoid clash with Claude Code shell env
- BRICKLINK_CONSUMER_KEY, BRICKLINK_CONSUMER_SECRET, BRICKLINK_TOKEN_VALUE, BRICKLINK_TOKEN_SECRET
- EBAY_APP_ID, EBAY_CERT_ID
- EPN_CAMPAIGN_ID  ← eBay Partner Network affiliate campaign ID
- EBAY_SANDBOX  ← set to "true" for sandbox environment (default: false)
- EBAY_SANDBOX_APP_ID, EBAY_SANDBOX_CERT_ID  ← only needed when EBAY_SANDBOX=true
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  ← server-only, never expose to client
- NEXT_PUBLIC_APP_URL
- CRON_SECRET  ← Vercel sends as Authorization header for cron jobs

## Claude Vision Prompt Strategy
Send the LEGO box image with this prompt:

  "Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit
  number printed on the front lower-right corner, back panel, or near the barcode.
  Return ONLY valid JSON: {"set_number": "75192"} or {"set_number": null} if you cannot
  find a set number with confidence. Do not guess. Do not include hyphens or suffixes."

Parse the JSON response. If set_number is null or parsing fails → show the
"couldn't find set number" error and offer manual entry.

Model: claude-sonnet-4-5, max_tokens: 64, base64 image source.

## Price Formula
All prices stored and displayed in USD.
hero_price_usd = BrickLink sold avg ?? eBay sold avg ?? BrickLink stock avg
RRP and gain% not currently shown (no data source for RRP after Brickset removal).
Future: Add RRP via Supabase table for popular sets, then gain_pct = ((hero_price_usd - rrp_usd) / rrp_usd) * 100.

## Non-negotiable rules
- Build ONLY what is in the current task. Nothing extra.
- No helper functions, utilities, or abstractions for one-time operations.
- No "future proofing." No unused fields. No optional features.
- All external API calls (Anthropic, eBay, BrickLink, Frankfurter) must be made
  server-side via Route Handlers or Server Actions. API keys must NEVER use NEXT_PUBLIC_ prefix.
- Configure serverActions.bodySizeLimit: '10mb' in next.config.ts. ✅ Done.
- Compress images client-side to <1.15 MP before upload using canvas.toBlob().
- Increment scan counter with an atomic Postgres RPC — never read-then-write:
    supabase.rpc("increment_scan", { p_user_id: userId, p_free_limit: 5 })
- Stripe webhook MUST update is_pro in Supabase on every subscription lifecycle event:
  customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed.
- Every external API call must be cached in Supabase before going live.
- NEVER run DELETE inside setCached() — cache cleanup runs via Vercel Cron only (/api/cron/cache-cleanup).
- Mobile-first. Every screen tested at 390px width.
- Every API call must have a clear user-facing error state. No silent failures.
- After each task, explain what you built and what comes next.
- Never start the next task without confirmation.

## Error states to handle
- Claude Vision can't identify the set → "We couldn't find a set number in this photo.
  Try a clearer shot of the box or enter the set number manually."
- Set not found → "We don't have data for this set number.
  Double-check the number and try again."
- No market pricing available → Show set number + note
  "Market price not available for this set."
- Non-LEGO photo uploaded → "This doesn't look like a LEGO set.
  Try uploading a photo of a LEGO box."
- API rate limit / failure → "Something went wrong. Please try again in a moment."
- Exchange rate fetch fails → Show USD price only, omit currency note.

## The wow moment
The price reveal animation is the core emotional beat of the product.
Animate the USD market value counting up from $0 to the final number over 1.5 seconds.
Use requestAnimationFrame with cubic ease-out. Target 60fps on iPhone Safari.
This is not optional — it is in the success criteria.

## Integration Status
- `scan-gate.ts` is STUBBED — returns `allowed: true` for all users. Stripe paywall not wired yet.
- eBay API: OAuth active (Browse API working). EPN partner. Awaiting Marketplace Insights scope.
  Falls back to Browse API (active listings) until approved. Sandbox toggle + retry logic implemented.
- BrickLink API: ACTIVE — OAuth 1.0 connected. 5 parallel API calls per set (item + 4 price guides).
  Cache key: `bricklink:{setNumber}`, 24hr TTL. Falls back gracefully — eBay still works if BrickLink down.
- eBay OAuth tokens stored in process memory (lost on cold start/deploy — low priority fix).
- Vercel Cron: hourly cache cleanup configured. CRON_SECRET set in Vercel env vars.
- Stripe webhook: handles created, resumed, updated, deleted, paused, payment_succeeded, payment_failed.

## Key Decisions Made (don't re-discuss)
- Brickset was fully removed. We do NOT use Brickset at all. BrickLink item API provides set metadata.
- BrickLink image URLs are protocol-relative ("//img.bricklink.com/...") — must prepend "https:".
- Cache cleanup moved from inline DELETE in setCached() to Vercel Cron job (avoids N concurrent full-table scans).
- Pricing computation is centralised in compute-pricing.ts — both route.ts and page.tsx call computePricing().
- BrickLink cache TTL staying at 24h for now (low volume, 7-day extension deferred until needed).
- eBay OAuth token in-memory storage is acceptable for now (re-auth adds ~200ms on cold start, no cost).
- No piece count, theme badge, or RRP/gain% currently shown (data gaps from Brickset removal).
- next.config.ts remotePatterns: img.bricklink.com (not images.brickset.com).
- Hero price NEVER crosses conditions — "New" tab only shows new data, "Used" tab only shows used data.
- Stripe webhook reads clerk_user_id from subscription metadata first, then falls back to customer metadata.

## Known Gotchas
- BrickLink `image_url` starts with `//` not `https://` — handled in compute-pricing.ts.
- `git add src/app/result/[setNumber]/page.tsx` fails due to shell bracket expansion — use `git add -u` or quote the path.
- eBay `insightsScopeAvailable` is cached in memory — first call after cold start tests if Insights scope works, then caches the result.
- `EbaySale` type is needed in route.ts catch block for `[] as EbaySale[]` type assertion.

## Outstanding TODOs (in priority order)
1. Include BrickLink stock data in "has data" check — stock-only sets are currently rejected as "not found" (P1)
2. Separate API outages from "set not found" — both currently show same error message (P1)
3. Fix scan counting: page refresh consumes a scan — gate should fire once per scan flow, not per render (P1 — before paywall)
4. Add free-user provisioning: increment_scan RPC returns denied if no users row exists (P1 — before paywall)
5. Add per-user rate limit on `/api/identify` to prevent Claude Vision abuse (P1)
6. Fix trend badge math: older/newer halves are swapped due to newest-first sort (P2)
7. Update product copy: Hero says "AUD", upgrade page says "AUD/month" + mentions RRP, upgrade page uses light theme (P2)
8. Store eBay OAuth tokens in Supabase cache instead of process memory (P2 — low urgency)
9. Add RRP data via Supabase table for popular sets (P2 — restores gain% display)
10. Wire up scan-gate.ts to actual Stripe subscription status (Phase 2 — paywall)
11. Remove unused npm packages: lucide-react, framer-motion, clsx (P2 — minor cleanup)

## Dev Commands
- npm run dev — start development server (http://localhost:3000)
- npm run build — production build
- npm run lint — ESLint
