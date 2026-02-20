# BrickVal — LEGO Scan & Value App (Lean MVP)

## What we're building
Mobile-first web app: scan a LEGO set photo → get its current AUD market value.
This is a Lean MVP. Build only what is in the plan. No extras, no abstractions.

## Tech Stack
- Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- Claude Sonnet Vision API for set identification
- Brickset API v3 for set data + USD RRP (24hr Supabase cache per set)
- RapidAPI LEGO Market Prices for secondary market value (Supabase cache, see plan for size-based strategy)
- Frankfurter API for EUR→AUD and USD→AUD rates (24hr Supabase cache)
- Clerk for auth, Stripe for payments ($12.99 AUD/month)
- Supabase: 2 tables only — users and api_cache

## Required Environment Variables
- ANTHROPIC_API_KEY
- BRICKSET_API_KEY
- RAPIDAPI_KEY  (+ x-rapidapi-host header value for the specific endpoint)
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

## Non-negotiable rules
- Build ONLY what is in the current task. Nothing extra.
- No helper functions, utilities, or abstractions for one-time operations.
- No "future proofing." No unused fields. No optional features.
- All external API calls (Anthropic, Brickset, RapidAPI, Frankfurter) must be made
  server-side via Route Handlers or Server Actions. API keys must NEVER use NEXT_PUBLIC_ prefix.
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

## Price Formula
rrp_aud   = rrp_usd * usd_to_aud
market_aud = avg_price_eur * eur_to_aud
gain_pct  = ((market_aud - rrp_aud) / rrp_aud) * 100
Show "RRP: ~A$X (converted from USD)" with tilde to indicate approximation.

## Error states to handle
- Claude Vision can't identify the set → "We couldn't find a set number in this photo.
  Try a clearer shot of the box or enter the set number manually."
- Set not found in Brickset → "We don't have data for this set number.
  Double-check the number and try again."
- No market pricing available → Show set info + USD RRP but note
  "Market price not available for this set."
- Non-LEGO photo uploaded → "This doesn't look like a LEGO set.
  Try uploading a photo of a LEGO box."
- API rate limit / failure → "Something went wrong. Please try again in a moment."
- Exchange rate fetch fails → Show EUR price with note
  "Currency conversion unavailable — showing EUR price."
- Retirement status unknown → Show "Status unknown" badge, not "Active."

## The wow moment
The price reveal animation is the core emotional beat of the product.
Animate the AUD market value counting up from $0 to the final number over 1.5 seconds.
Use requestAnimationFrame with cubic ease-out. Target 60fps on iPhone Safari.
This is not optional — it is in the success criteria.

## Dev Commands
- npm run dev — start development server (http://localhost:3000)
- npm run build — production build
- npm run lint — ESLint
