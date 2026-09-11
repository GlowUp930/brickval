# Collection asking-price history fallback — September 11, 2026

## Finding

The headline pricing waterfall already used active BrickLink listings when completed sales were unavailable, but `/api/mobile/collection-history` fetched sold guides only. That left Collection charts and Market snapshot tables empty even when the current asking fallback was visible.

## Remedy

The history route now fetches sold and stock guides, chooses sold rows per condition when present, and otherwise returns active listing rows marked `source: "listing"`. Listing rows have no transaction date, so they are anchored to the fetch time as a current observation. The native model persists the source, keeps sold and asking rows separate, shows a one-point asking chart with an explicit dated-history note, and labels table counts “Active listings.” Cache keys moved to `collection-history:v3` so existing rows refresh.

## Verification

- `npm run typecheck` passed.
- `npm test` passed: 75 tests and 36 reliability assertions.
- Native Release simulator build passed.
- Focused `PortfolioHistoryBuilderTests` invocation completed successfully; full simulator testing remains subject to the existing test-runner hang on this host.

No ownership quantity, current valuation, scan allowance, referral credit, or pricing waterfall behavior changed. Active listing observations are never described as completed sales.
