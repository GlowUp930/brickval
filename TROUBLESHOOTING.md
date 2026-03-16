# BrickVal — Troubleshooting Guide

## Issue: "Something went wrong. Please try again."

This error surfaces in 3 UI locations:
- `ImageUploader` — after uploading a LEGO box photo
- `MinifigResultPage` — after navigating to a minifig result
- `ErrorScreen` / `error.tsx` — SSR error boundary on the set result page

There are 5 code paths that emit this message. Each has a distinct log prefix to identify it.

---

### 1. Claude Vision API failure (`/api/identify`)

**When it happens:** User uploads a photo (set mode). Claude can't be reached or returns an error.

**Server log to look for:**
```
[identify] BRICKVAL_ANTHROPIC_API_KEY is not set — cannot call Claude Vision
```
or
```
[identify] Claude Vision API error: <error message from Anthropic SDK>
```

**Root causes and fixes:**

| Cause | Fix |
|---|---|
| `BRICKVAL_ANTHROPIC_API_KEY` not set in env | Add it to `.env.local` (dev) or Vercel environment variables (prod). Note: must be `BRICKVAL_ANTHROPIC_API_KEY`, not `ANTHROPIC_API_KEY`, to avoid clash with Claude Code shell env. |
| API key is invalid or revoked | Regenerate the key at console.anthropic.com and update the env var |
| Anthropic API overloaded / rate-limited | Transient — retrying resolves it. The SDK error message will mention 529 or 429. |
| Model `claude-sonnet-4-5` unavailable | Update the model name in `src/app/api/identify/route.ts:122` to a current available model |
| Image MIME type rejected by Claude | Ensure compressed image is sent as `image/jpeg`. Canvas `toBlob()` in `ImageUploader` always outputs JPEG. |

---

### 2. Both eBay + BrickLink failed simultaneously (`/api/lookup`, set mode)

**When it happens:** A set lookup is triggered (image scan or manual entry) but BOTH eBay and BrickLink throw exceptions (not just return empty data).

**Server log to look for:**
```
[lookup] Both eBay and BrickLink failed for set <setNumber> — check API credentials and network
```

**Root causes and fixes:**

| Cause | Fix |
|---|---|
| BrickLink env vars missing (`BRICKLINK_CONSUMER_KEY`, `BRICKLINK_CONSUMER_SECRET`, `BRICKLINK_TOKEN_VALUE`, `BRICKLINK_TOKEN_SECRET`) | Add all 4 to env. Any missing var causes `buildAuthHeader` to throw, which is swallowed per-call — all 4 price guides return null. Combined with eBay failure → upstream error. |
| eBay env vars missing (`EBAY_APP_ID`, `EBAY_CERT_ID`) | Add to env. `getCredentials()` throws → `getBrowseToken()` throws → caught in `lookup/route.ts` → `ebayFailed = true`. |
| Both external APIs are down | Transient. Retry resolves it. Supabase cache will serve stale data on next attempt if a prior successful lookup exists. |
| Supabase not configured (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) | The cache layer fails silently (try/catch in `cache.ts`), but this alone doesn't cause the error. Only affects caching. |

**Important distinction:** If only one API fails and the other returns empty data (not an exception), the error shown is "not_found" — not "something went wrong". The upstream 502 only fires when BOTH set `*Failed = true`.

---

### 3. Scan gate threw an exception (`/api/lookup` or SSR result page)

**When it happens:** `checkAndIncrementScan()` throws.

**Server log to look for:**
```
[lookup/minifig] Scan gate error: <error>
[lookup] Scan gate error: <error>
```

**Status:** Currently not possible — `scan-gate.ts` is stubbed and only returns `{ allowed: true }`. This path will become active in Phase 2 when Supabase scan counting is re-enabled.

**Future fix (Phase 2):** If the Supabase `increment_scan` RPC fails, add a fallback that allows the scan and logs the failure rather than blocking the user.

---

### 4. Unhandled exception in SSR result page (`error.tsx` boundary)

**When it happens:** The `/result/[setNumber]` server component throws an unhandled exception that isn't caught by the inline try/catch blocks.

**Server log to look for:** Next.js will log the full stack trace with the error message in the server console.

**Root causes and fixes:**

| Cause | Fix |
|---|---|
| `computePricing()` throws on unexpected data shape | `computePricing` in `src/lib/compute-pricing.ts` uses optional chaining throughout — unlikely to throw. If it does, check BrickLink API response shape. |
| Next.js `redirect()` called inside try/catch | Known Next.js gotcha: `redirect()` throws a special error internally. Do NOT wrap `redirect()` in try/catch. Current code correctly calls it outside try blocks. |

---

### 5. Hero.tsx waitlist form error

**When it happens:** Waitlist email submission fails on the landing page.

**Location:** `src/components/home/Hero.tsx` — hardcoded error string "Something went wrong. Try again."

**Root cause:** The waitlist form posts to an API endpoint that may not be configured. Not related to scan functionality.

---

## Quick Diagnostic Checklist

If "something went wrong" is reported:

1. **Check server logs** — the `[identify]` or `[lookup]` prefix will tell you which API failed
2. **Verify env vars are set** — especially `BRICKVAL_ANTHROPIC_API_KEY`, `BRICKLINK_*`, and `EBAY_*`
3. **Test APIs independently:**
   - BrickLink: try a direct GET to `https://api.bricklink.com/api/store/v1/items/SET/75192-1` with OAuth headers
   - eBay: check the token endpoint is reachable and `EBAY_APP_ID`/`EBAY_CERT_ID` are production (not sandbox) credentials unless `EBAY_SANDBOX=true`
   - Anthropic: check `console.anthropic.com` for API key status
4. **Check Supabase cache** — run `SELECT * FROM api_cache WHERE cache_key LIKE 'bricklink:%' LIMIT 5` to confirm cache writes are working

---

## Resolution Log

### 2026-03-16 — Ongoing "Something went wrong" on scan

**Reported:** Users seeing "Something went wrong. Please try again." on image scans and set lookups repeatedly.

**Investigation findings:**
- Error message is used in 5 distinct code paths — no way to tell from UI alone which one fired
- `error.tsx` error boundary was styled with hardcoded gray Tailwind classes (inconsistent with dark theme, visually broken)
- `identify/route.ts` caught Claude Vision errors but only logged `err` object — the actual error message was buried
- `lookup/route.ts` upstream (502) case had no log identifying which APIs failed

**Changes made (commit: tbd):**
1. `src/app/api/identify/route.ts` — Added early `BRICKVAL_ANTHROPIC_API_KEY` presence check with explicit log. Changed catch block to log `err.message` string directly for clarity.
2. `src/app/api/lookup/route.ts` — Added log to the upstream error branch naming the set number and indicating credential/network failure.
3. `src/app/result/[setNumber]/error.tsx` — Replaced hardcoded gray Tailwind classes with CSS variable styles matching the app dark theme.

**Root cause (most likely) — first investigated:** `BRICKVAL_ANTHROPIC_API_KEY` not configured; user confirmed key was set.

**Second investigation:** Incorrectly created `src/middleware.ts` — but `src/proxy.ts` was already the Clerk middleware (mislabeled in CLAUDE.md as "internal"). Next.js 16 treats both filenames as middleware; having both caused a deploy error:
```
Both middleware file "./src/src/middleware.ts" and proxy file "./src/src/proxy.ts" are detected.
```
`src/middleware.ts` was removed to fix the build. `src/proxy.ts` is the correct Clerk middleware and was working all along.

**Confirmed root cause:** `src/lib/cache.ts` `setCached()` had a Supabase fire-and-forget cleanup call **outside** the try/catch block (line 40). The `supabase` export is a lazy Proxy — its getter calls `getSupabase()` synchronously, which throws if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing/wrong. That synchronous throw escaped `setCached`'s try/catch, rejecting the promise returned by `setCached`. Both `getBrickLinkMarketData` and `getEbayMarketData` `await setCached(...)` without a surrounding try/catch, so both threw → `brickLinkFailed = true`, `ebayFailed = true` → "Both BrickLink and eBay are temporarily unavailable."

**Resolution:** Moved the fire-and-forget cleanup line inside the `try` block in `setCached`. Any Supabase error (missing env vars, network failure, wrong credentials) is now caught and logged as a warning — the cache silently degrades and the BrickLink/eBay data still returns normally.
