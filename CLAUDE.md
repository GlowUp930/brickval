# BrickVal — LEGO Scan & Value App (Lean MVP)

## What we're building
Mobile-first web app: scan a LEGO set photo → get its current USD market value.
This is a Lean MVP. Build only what is in the plan. No extras, no abstractions.

## Tech Stack
- Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- Claude Sonnet Vision API for set identification
- BrickLink API — PRIMARY market data source (ACTIVE — OAuth 1.0, sold + stock prices + item metadata)
- eBay API — FALLBACK market data source (ACTIVE — OAuth 2.0, sold + listing prices, 4 markets: US/AU/GB/DE)
- Facebook Marketplace — PLANNED future data source
- Frankfurter API for currency rates (24hr Supabase cache)
- Clerk for auth, Stripe for payments ($12.99 USD/month)
- Supabase: 2 tables only — users and api_cache

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

## Required Environment Variables
- BRICKVAL_ANTHROPIC_API_KEY  ← named to avoid clash with Claude Code shell env
- BRICKLINK_CONSUMER_KEY
- BRICKLINK_CONSUMER_SECRET
- BRICKLINK_TOKEN_VALUE
- BRICKLINK_TOKEN_SECRET
- EBAY_APP_ID
- EBAY_CERT_ID
- EPN_CAMPAIGN_ID  ← eBay Partner Network affiliate campaign ID
- EBAY_SANDBOX  ← set to "true" for sandbox environment (default: false)
- EBAY_SANDBOX_APP_ID  ← sandbox credentials (only needed when EBAY_SANDBOX=true)
- EBAY_SANDBOX_CERT_ID
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY  ← server-only, never expose to client
- NEXT_PUBLIC_APP_URL

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
- `src/lib/scan-gate.ts` is stubbed — returns `allowed: true` for all users. Stripe paywall not wired yet.
- eBay API: OAuth active (Browse API working). EPN partner. Awaiting Marketplace Insights scope via Application Growth Check.
  Falls back to Browse API (active listings) until approved. EPN tracking + sandbox toggle + retry logic implemented.
  Set EBAY_SANDBOX=true to demo in sandbox for eBay review.
- BrickLink API: ACTIVE — OAuth 1.0 connected. Returns sold + stock price guides (avg/min/max/qty) for
  new and used conditions in USD. Includes individual price_detail[] rows with dates and seller country.
  Item API provides set name, image, year, and retirement status (is_obsolete).
  Cache key: `bricklink:{setNumber}`, 24hr TTL. Falls back gracefully — eBay still works if BrickLink is down.

## Known Architecture TODOs
- Extend BrickLink cache TTL from 24h to 7 days (set metadata + sold data rarely changes)
- Store eBay OAuth tokens in Supabase cache instead of process memory (lost on every cold start)
- Add RRP data via Supabase table for popular sets (to restore gain% display)

## Key File Locations
- `src/lib/bricklink.ts` — BrickLink API (PRIMARY — OAuth 1.0, price guides + item metadata)
- `src/lib/ebay.ts` — eBay API (FALLBACK — OAuth 2.0, sold + listing prices, 4 marketplaces)
- `src/lib/frankfurter.ts` — Exchange rates (free, cached 24h)
- `src/lib/compute-pricing.ts` — Shared pricing computation (SetInfo + ComputedPricing assembly)
- `src/lib/cache.ts` — Supabase-backed cache (getCached / setCached)
- `src/lib/scan-gate.ts` — Paywall/scan limit logic (stubbed, returns allowed: true)
- `src/types/market.ts` — ComputedPricing + SetInfo + BrickLinkDetail + EbaySale
- `src/app/api/lookup/route.ts` — Main data aggregation endpoint (uses compute-pricing.ts)
- `src/app/result/[setNumber]/page.tsx` — SSR result page (uses compute-pricing.ts)
- `src/components/result/PriceReveal.tsx` — Main result display component (uses SetInfo for metadata)

## Dev Commands
- npm run dev — start development server (http://localhost:3000)
- npm run build — production build
- npm run lint — ESLint
