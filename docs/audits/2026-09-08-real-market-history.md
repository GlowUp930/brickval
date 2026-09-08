# Real market-history restoration — September 8, 2026

Build 169 displayed a saved-value reference line because the native app never fetched the dated sales already available through BrickLink. It did not restore market history. Build 170 introduces a backward-compatible history endpoint and automatic native collection refresh; existing items need no rescanning.

## Implementation

- `src/app/api/mobile/collection-history/route.ts`: up to 20 canonical item/type/colour keys, fresh cache reuse, four workers and sequential New/Used provider calls. Successful complete results are cached for 24 hours; partial results are returned with condition-specific errors. Provider timeouts bound a full batch below the request deadline. Responses contain only date, price and quantity, not buyer/seller details.
- `src/lib/scan-request-access.ts`: existing session/guest/deletion checks with an independent six-history-requests-per-minute budget. No scan/referral allowance RPC is invoked.
- `CollectionStore.swift`: automatic missing/stale refresh, 20-item batches, partial merge, local persistence, offline retention, pull-to-refresh retry and removal-generation checks. Ownership, condition and identities are preserved. Market sales remain separate from saved scan observations.
- `PortfolioHistoryBuilder.swift`: daily quantity-weighted real sales, 30/90/180-day windows, known observations carried forward, fixed covered holdings and a common known start. No prices are manufactured before an item's earliest observation. Portfolio history uses current owned quantities, including before collection entry; the current hero valuation stays separate from history-endpoint returns.
- Collection/detail graphs retain green styling and timeframe gates. Single-point/missing history has a compact status. Real date spacing and bounded interpolation replace evenly spaced cubic interpolation. Vertical scrolling and horizontal inspection can coexist.

## Verification

Captured backend sales for Joker 70919 (20 sales) and Tintin 21367 (22 sales) form the dated fixture. The DEBUG-only demo begins with empty-history items, loads through the API dependency and is excluded from Release builds. Unit fixtures retain original dates; the UI demo shifts all dates equally to keep windows stable over time.

Passed: backend tests and reliability assertions, backend production build, weighted daily averages, New/Used separation, fixed partial coverage, no scan-price contamination, distinct timeframe filtering, actual date spacing/no overshoot, existing-item automatic population, offline retention, restart persistence and removed-item response rejection. Exact simulator/release results will be recorded after final verification.

Production endpoint deployment, signed build upload and Apple processing are pending. Physical-device confirmation remains unverified; simulator evidence does not certify an installed TestFlight journey.
