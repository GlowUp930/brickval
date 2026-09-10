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

## Release evidence

- Backend deployment `dpl_F4aceFoU4FMhHuMd9okhhdw8g3qV` is promoted to `brickvalue.live`. Live HTTP 200 returns Joker 20 New/2 Used sales and Tintin 22 New/0 Used sales, no condition errors. Invalid bearer authentication returns 401. No production schema changes were needed.
- Backend: 72 tests and 36 reliability assertions pass; type checking, production build and all 794 native strings plus four permission strings across 13 locales pass.
- Native full suite: `/tmp/BrickVal170Final.xcresult`, 215 tests / 434 runs on iPhone SE (3rd generation) and iPhone 17 Pro, zero failures. Subsequent date-label adjustment received targeted checks. A navigation test intermittently failed to scroll to an offscreen item; the final stronger visible-detail check passes on both sizes (`/tmp/BrickVal170VisibleDetail.xcresult`). Largest-text timeframe controls pass on both sizes. Existing unrelated entitlement badges still truncate at the largest accessibility size.
- Visible multi-point [Collection](evidence/2026-09-08-market-history/collection-small.png) and [item](evidence/2026-09-08-market-history/item-small.png) screenshots were inspected. The detail test now requires the entire chart frame to be on screen, rather than merely finding an offscreen element. Horizontal inspection and vertical navigation are exercised using Apple's built-in chart selection.
- Signed archive: `/tmp/BrickVal170Final.xcarchive`, version 1.0.8 (170), product source `5d2d5ef`. Xcode's stored account credential failed during the first export; upload succeeded using the existing ASC API key (`/tmp/brickval170-upload-api.log`). No new credentials were created. The DEBUG fixture flag is absent from the signed Release executable.

Apple processing is complete: 1.0.8 (170), build ID `21a1b47e-4cda-4faf-9634-1b7bbf60625a`, available to Team (Expo) and v1 internal groups. Testing notes are saved. GitHub run `34197294396` passed backend and isolated database steps; its independent native check is still running at handoff. Physical-device confirmation remains unverified; simulator evidence does not certify an installed TestFlight journey.

## September 10 follow-up: Used rows hidden by fresh incomplete local state

The 75192 Used detail screen reproduced a separate client freshness defect after build 174. Production evidence at 2026-09-10 showed 27 Used rows directly from BrickLink and 26 valid Used rows in the live history cache, with 17 inside 3M. The screenshot's New figures (10 sales and 19 units) matched the same cached response. This rules out missing provider data and response decoding.

A focused native regression reproduced the failure: an item with a sold-price source, empty dated rows and a recent history timestamp skipped refresh and remained empty. `CollectionStore` now refreshes this inconsistent state while retaining the normal 24-hour cache for complete histories. The focused suite passes six tests, the full small-simulator unit suite passes 224 tests across 36 suites, the three backend history tests pass, and localization passes 802 app strings plus four Info.plist strings across 13 locales. The remedy does not rescan items, change ownership, or consume scan/referral credits. TestFlight and affected-device verification remain pending.
