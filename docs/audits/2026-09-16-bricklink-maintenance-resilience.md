# BrickLink maintenance resilience — 2026-09-16

## Finding

The supplied production failure was a BrickLink maintenance response. The
recognition request had already identified the minifigure, but a non-JSON
maintenance page from BrickLink was treated as a generic upstream failure. The
app therefore discarded a usable identity and showed “Something went wrong.”

## Implemented behavior

- BrickLink responses are classified as temporary, genuine not-found,
  authentication, or configuration failures. Redirects to
  `maintenance.bricklink.com`, HTML responses, timeouts, rate limits, and 5xx
  responses are temporary. Provider bodies and credentials are never exposed.
- Minifigure scans, identifier lookups, and bulk pricing now resolve in this
  order: fresh cache, live BrickLink, a successful saved snapshot up to 30 days
  old during a temporary outage, then an identity-only 200 response. The
  identity-only response has empty pricing/history and never invents a value.
- Older raw BrickLink and lookup cache rows are rehydrated into the snapshot
  store, so existing users can receive the emergency fallback without
  rescanning. Successful refreshes are stored as snapshots and remain available
  offline.
- An identity-only single scan does not consume a scan allowance. Bulk results
  retain recognized figures when their price is unavailable; totals count only
  priced figures. Authentication/configuration failures remain actionable server
  failures instead of being hidden as temporary downtime.
- Native results preserve the identified figure and collection actions. Stale
  prices say “Saved price · updated [date].” Unavailable prices say “Market
  prices are temporarily unavailable” and provide “Check prices again,” which
  requests the identifier only and does not upload the photo or repeat
  recognition.
- Sentry and PostHog receive privacy-safe pricing-path outcomes (`live`,
  `fresh_cache`, `stale_cache`, `identity_only`) with provider state and
  elapsed time. Sentry fingerprints group temporary BrickLink incidents.

## Verification

- Backend type checking passed.
- 86 backend tests passed, including maintenance redirects/HTML, status
  classification, identity-only payloads, cache-age behavior, stale fallback,
  no allowance consumption, and raw-cache rehydration.
- Localization audit passed with 814 app strings and four Info.plist strings
  across 13 locales.
- Native `NetworkPayloadDecodingTests` and the full native unit target passed
  on the BrickVal Small iPhone and iPhone 17 Pro simulators.
- The scanner UI target passed all 17 focused checks on the Small iPhone; the
  failed-scan recovery check also passed on the iPhone 17 Pro. Existing Xcode
  localization plural-format warnings remain unchanged.

## Release status

The backend changes are backward-compatible: older builds ignore the optional
pricing fields, while build 180 can continue decoding successful responses.
The native messaging and retry action require a new TestFlight build. A
production smoke test and physical-device maintenance recovery check remain
open before closing the Sentry issue. The original customer remains unresolved
until a correlated successful recovery or a specific account/provider cause is
confirmed.
