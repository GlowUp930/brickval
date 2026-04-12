# BrickVal — LEGO Scan & Value App (Lean MVP)

## Active Development Branch
**All design/UI work happens on `claude/design-mockup-handoff-6NWr2`.**
Do NOT push to `claude/stripe-appurl-fix-ihFVU` or `claude/loveable-design-practices-ihFVU`.

## Mobile Redesign Status (branch: claude/design-mockup-handoff-6NWr2)

### Design inspiration
- **Layout/aesthetic**: BrickValue HTML mockup (Google Stitch export) — dark `#0e0e0e` bg, yellow `#ffc32c` primary
- **UI feel**: cal.ai (button system, hover lift, loading states, onboarding wizard)
- **Scanner UX**: Shiny TCG app (full-screen camera, "Set Detected" bottom card)
- **Figma file**: https://www.figma.com/design/iqjiLwCNdcn48msYVxh3BB/Brickvalue

### What's been built (UI-only, all mock data)

#### New components
- `src/components/ui/Button.tsx` — shared button: primary/secondary/ghost/destructive variants, sm/md/lg sizes, loading spinner, startIcon/endIcon, hover lift + shadow (cal.ai pattern)
- `src/components/BottomNav.tsx` — 4-tab fixed bottom nav: Home · Scanner · Collection · Market
- `src/components/home/MobileHome.tsx` — full mobile home dashboard

#### MobileHome layout
1. **Header**: avatar circle + "BrickValue" wordmark (Manrope, yellow) + bell icon
2. **Hero**: large `$12,450.00` collection value + `+2.4%` trending badge
3. **Sparkline**: animated SVG line that draws left→right on mount (1.5s, CSS stroke-dashoffset), area fill fades in, end dot pulses
4. **Scan CTA**: full-width yellow gradient button → `/scan`
5. **Recent Scans**: horizontal scroll cards with BrickLink set images + number badges
6. **Market Trends**: left-yellow-border rows (Retiring Soon / Bullish badges)

#### Updated components
- `src/components/Logo.tsx` — new icon: top-down 2×2 LEGO brick + camera viewfinder brackets; wordmark updated to "BrickVal"
- `src/app/layout.tsx` — Manrope + Space Grotesk fonts added via next/font/google
- `src/app/globals.css` — btn-* CSS classes (hover/focus/active), draw-line/fill-fade/dot-pulse keyframes
- `src/components/onboarding/OnboardingShell.tsx` — Continue + Skip use `<Button>`
- `src/components/onboarding/GetStartedScreen.tsx` — final CTA uses `<Button variant="primary">`

### Design tokens in use (MobileHome / BottomNav)
```
bg:                   #0e0e0e
primary:              #ffc32c
primaryContainer:     #e9b011
onPrimary:            #584000
surfaceContainerLow:  #131313
surfaceContainerHigh: #20201f
onSurface:            #ffffff
onSurfaceVariant:     #adaaaa
font headline:        Manrope (--font-manrope)
font label:           Space Grotesk (--font-space-grotesk)
font body:            Inter / Geist Sans
```

### What comes next
- Scanner page redesign: full-screen camera + animated corner brackets + "Set Detected" slide-up card
- Collection page
- Market page
- Settings page
- Wire Figma MCP (connected, needs new Claude Code session to activate tools)

## What we're building
Mobile-first web app: scan a LEGO set photo → get its current **USD** market value (not AUD).
This is a Lean MVP. Build only what is in the plan. No extras, no abstractions.

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
- Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5
- Claude Sonnet Vision API for set identification
- eBay API for secondary market pricing (ACTIVE — Browse API + Marketplace Insights)
- BrickLink API for secondary market pricing (ACTIVE — OAuth 1.0, primary price source)
- Brickset API v3 for set metadata, RRP, retirement status
- Frankfurter API for EUR→USD rates (24hr Supabase cache)
- Clerk for auth, Stripe for payments ($12.99 USD/month)
- Supabase: 2 tables only — users and api_cache
- Vercel Analytics (enabled in root layout)
- framer-motion (installed, available for animation)

## Codebase Structure

```
src/
├── app/
│   ├── api/
│   │   ├── identify/route.ts     # POST — Claude Vision set number extraction
│   │   ├── lookup/route.ts       # POST — market data aggregation (BrickLink + eBay + Brickset)
│   │   └── webhook/route.ts      # POST — Stripe subscription lifecycle events
│   ├── result/[setNumber]/
│   │   ├── page.tsx              # Server component — fetch + compute + render result
│   │   └── error.tsx             # Error boundary for result page
│   ├── scan/page.tsx             # Scanner UI (image upload + manual entry)
│   ├── upgrade/page.tsx          # Pro upgrade / paywall page
│   ├── layout.tsx                # Root layout with ClerkProvider + Vercel Analytics
│   ├── globals.css               # Tailwind v4 @theme + CSS variables (dark mode)
│   └── page.tsx                  # Homepage — renders <Hero />
├── components/
│   ├── home/Hero.tsx             # Landing page hero (CTA → /scan)
│   ├── result/
│   │   ├── PriceReveal.tsx       # Animated price count-up + market data display
│   │   └── SetDetails.tsx        # Set info (name, theme, pieces, retirement badge)
│   └── scan/
│       ├── ImageUploader.tsx     # Camera + file upload, canvas compression to <1.15MP
│       └── ManualEntry.tsx       # Set number text input → /result/[setNumber]
├── lib/
│   ├── anthropic.ts              # Claude SDK lazy singleton (BRICKVAL_ANTHROPIC_API_KEY)
│   ├── bricklink.ts              # BrickLink OAuth 1.0 — price guide (sold + stock) + item info
│   ├── brickset.ts               # Brickset API v3 — set metadata, RRP, retirement status
│   ├── cache.ts                  # Supabase api_cache read/write helpers (TTL-based)
│   ├── ebay.ts                   # eBay OAuth 2.0 — Browse API + Marketplace Insights
│   ├── frankfurter.ts            # Frankfurter currency API (EUR/USD/AUD/GBP)
│   ├── rapidapi.ts               # RapidAPI bulk LEGO dataset (legacy — not active in flow)
│   ├── scan-gate.ts              # Paywall/scan-limit logic (STUBBED — returns allowed: true)
│   ├── stripe.ts                 # Stripe SDK lazy singleton
│   └── supabase.ts               # Supabase service-role client lazy singleton
├── types/
│   ├── brickset.ts               # BricksetSet interface + getRetirementStatus()
│   ├── market.ts                 # ComputedPricing, EbaySale, BrickLinkDetail, EbayMarketData
│   └── scan.ts                   # IdentifyResponse, LookupResponse, LookupErrorResponse
└── proxy.ts                      # (internal — not used directly by routes)

supabase/
└── schema.sql                    # Table definitions + increment_scan() RPC
```

## Required Environment Variables

```
# Claude Vision
BRICKVAL_ANTHROPIC_API_KEY          ← named to avoid clash with Claude Code shell env

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

## Claude Vision Prompt Strategy
Send the LEGO box image with this prompt:

  "Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit
  number printed on the front lower-right corner, back panel, or near the barcode.
  Return ONLY valid JSON: {"set_number": "75192"} or {"set_number": null} if you cannot
  find a set number with confidence. Do not guess. Do not include hyphens or suffixes."

Parse the JSON response. If set_number is null or parsing fails → show the
"couldn't find set number" error and offer manual entry.

Model: claude-sonnet-4-5, max_tokens: 64, base64 image source.

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
- After each task, explain what you built and what comes next.
- Never start the next task without confirmation.

## Hero Price Priority
The "new" hero price shown in PriceReveal follows this waterfall:

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
- Claude Vision can't identify the set → "We couldn't find a set number in this photo.
  Try a clearer shot of the box or enter the set number manually."
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
Use requestAnimationFrame with cubic ease-out. Target 60fps on iPhone Safari.
Implemented in `src/components/result/PriceReveal.tsx` via `useCountUp()` hook.
This is not optional — it is in the success criteria.

## Integration Status
- `src/lib/scan-gate.ts` is STUBBED — returns `allowed: true` for all users.
  Real scan limits + Stripe paywall not wired yet (Phase 2).
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
- Stripe: webhook handler active, Stripe SDK singleton in place.
  Pricing UI on homepage is hidden (Phase 2).

## Key File Locations
- `src/lib/ebay.ts` — eBay OAuth 2.0, Browse API + Marketplace Insights, multi-marketplace
- `src/lib/bricklink.ts` — BrickLink OAuth 1.0, price guide (sold + stock), item info
- `src/lib/brickset.ts` — Brickset API v3, set metadata + RRP + retirement
- `src/lib/frankfurter.ts` — Frankfurter currency conversion (EUR/USD/AUD/GBP)
- `src/lib/scan-gate.ts` — paywall/scan limit logic (stubbed, returns allowed: true)
- `src/lib/cache.ts` — Supabase api_cache getCached() / setCached() helpers
- `src/lib/anthropic.ts` — Claude SDK singleton (lazy, server-only)
- `src/lib/supabase.ts` — Supabase service-role client singleton (lazy, server-only)
- `src/lib/stripe.ts` — Stripe SDK singleton (lazy, server-only)
- `src/lib/rapidapi.ts` — RapidAPI bulk dataset (legacy, not in active flow)
- `src/app/api/identify/route.ts` — Claude Vision POST endpoint
- `src/app/api/lookup/route.ts` — market data aggregation POST endpoint
- `src/app/api/webhook/route.ts` — Stripe webhook POST endpoint
- `src/app/result/[setNumber]/page.tsx` — server-rendered result page
- `src/components/result/PriceReveal.tsx` — price reveal animation
- `src/types/market.ts` — ComputedPricing and all market data types
- `supabase/schema.sql` — table definitions + increment_scan() RPC
- `CLAUDE.md` — this file, at `/home/user/brickval/CLAUDE.md`

## Dev Commands
- npm run dev — start development server (http://localhost:3000)
- npm run build — production build
- npm run lint — ESLint

## Design Context

### Users
LEGO investors and resellers — adults treating sets as financial assets. They scan in the field (thrift stores, garage sales) under time pressure. Job to be done: "Tell me what this set is worth in the real market, instantly, so I can act."

### Brand Personality
**Fast. Sharp. Alive.** Bold, playful, energetic — the data is serious (this is people's money) but the experience feels alive. Like LEGO itself: deliberately colorful, confident, never boring. Emotional goals: confidence, delight at the price reveal, trust in the data.

### Aesthetic Direction
Dark theme (#0e0e0e). LEGO yellow (#ffc32c) as a precision accent — not wallpaper, used for CTAs, active states, and key moments. Visual feel: between editorial magazine and financial dashboard. Tight type, sharp contrast, deliberate motion. Reference energy: cal.ai interactions, early Robinhood data clarity, Shiny TCG scanner UX.

### Anti-references
1. **NOT toy/kids app** — no rounded-everything, no bright primary-color soup. Users are adults making financial decisions.
2. **NOT heavy e-commerce/marketplace** — not BrickLink's dense tables and product grids. That's the data source, not the design aspiration.

### Design Principles
1. **Speed first.** Investors are in a hurry. Every interaction should feel instant.
2. **Trust through clarity.** Show numbers prominently, cite sources, no ambiguity.
3. **LEGO energy, adult execution.** Bold without being juvenile. Yellow as exclamation point, not wallpaper.
4. **The reveal is everything.** The price count-up is the emotional core. Everything builds toward it.
5. **Not BrickLink, not a toy store.** Editorial confidence — a well-designed finance magazine that covers LEGO.

### Accessibility
Best-effort: good contrast, legible type, 44×44px minimum tap targets, `prefers-reduced-motion` respected.
