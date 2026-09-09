# Collection responsiveness — build 172 work

## Finding and changes

The owner reports that build 171 freezes the whole screen while changing a chart timeframe and feels slower than live build 166. Source inspection confirmed repeated `PortfolioHistoryBuilder` evaluation in both the Collection summary and graph, new ISO date formatters for every sale, repeated chart sampling during touch selection, and chart identity resets that replayed the reveal animation. The computation benchmark below reproduces substantial synchronous work; it is not a physical-device trace.

Production confirmation discovered during implementation: [Sentry BRICKVAL-M](https://areyouok-4x.sentry.io/issues/7720899344/) shows a fully blocked 14.2–15.0 second hang on build 171, iPhone 13 Pro / iOS 26.6. Event `98e2c02350b34c52a2233effc176ae79`, September 9 at 15:17:27 AEST, has a symbolicated main-thread stack through `NSISO8601DateFormatter.init` → `CollectionMarketSale.timestamp` → `PortfolioHistoryBuilder.priceSeries/marketHistory/build` → `PortfolioSummaryView.history/previousValue/change/changeSign/body`. This directly confirms a production hang in the path changed here. Matching build-171 symbols enabled the diagnosis. The issue remains open pending replacement-build device verification.

The native implementation now prepares all three numeric history windows off the main actor when holdings/sales or the day change, shares prepared portfolio results, preserves current valuation separately, and selects prepared item/portfolio data on timeframe taps. Dates use Foundation's value-type ISO parser. Chart touch state is isolated from resampling and conversion, date identity is stable, and timeframe switches no longer recreate/reveal the chart. Inventory grouping updates when stored items change.

History refresh remains a separate server allowance with existing authentication. Detail requests are limited to their item; overlapping refreshes reuse successful rows, prioritize the opened item in the next batch, and retain batches of at most 20. Successful history persists in the existing collection file; no data migration or backend change is needed.

Collection/item photos share a native image pipeline, download deduplication, background downsampling, a 32 MiB decoded cache cost limit, and 100 MiB disk cache with oldest-access eviction. Public product images only; no credentials or customer photos are cached by this component. Retry and offline cache reuse are covered by controlled tests.

## Computation measurements

Same iPhone SE (3rd generation) simulator, optimized Swift (`-O`), 20 iterations per collection size, alternating the captured Joker/Tintin sales (20/22 rows per holding). The baseline is build-171 code plus the timing harness. These initial runs use Debug configuration with Release-level Swift optimization so fixture injection is available; do not call them production-device timings.

| Holdings | Before: one history build, p95 | After: all three windows prepared once | After: prepared selection + chart sampling, p95 |
| --- | ---: | ---: | ---: |
| 10 | 22.42 ms | 0.50 ms | 0.082 ms |
| 50 | 102.88 ms | 2.52 ms | 0.096 ms |
| 200 | 411.53 ms | 10.26 ms | 0.082 ms |

The old screen evaluates the builder repeatedly, so its complete render cost exceeds the single-build benchmark. After optimization, warm selection does not rerun the builder. These numbers do not include touch delivery, layout, or display presentation and cannot alone certify the 100/200 ms UI targets.

Evidence: `/tmp/BrickVal172Baseline.xcresult`, `/tmp/brickval172-baseline.log`, `/tmp/BrickVal172Unit.xcresult`, `/tmp/brickval172-unit.log`.

Initial Release-configuration UI run (DEBUG fixture injection, optimization enabled): 200 holdings, 21 warm switches per screen. Tap-handler entry to first display callback after SwiftUI applied chart data: Collection p95 **33.28 ms**, maximum **49.69 ms**; item p95 **32.63 ms**, maximum **33.05 ms**. This is a simulator run-loop/display-callback proxy, not physical touch-to-photon latency. Evidence: `/tmp/BrickVal172ReleaseUI.xcresult`, `/tmp/brickval172-chart-timings.log`. Real multi-point chart, item navigation, scrolling, touch inspection, and largest-text checks passed in that run.

## Verification status

- Passed: 212 native unit tests, including prepared-history correctness, quantity/removal/restart handling, date-window changes, per-item request sharing, batching, no additional history requests for timeframe selection, image download deduplication/downsampling, memory clearing, offline restart, retry, and disk eviction.
- Passed: localization — 794 strings and four permission strings across 13 languages.
- Full Release-configuration simulator run (DEBUG test fixtures): 229 tests / 462 runs across iPhone SE and iPhone 17 Pro. 461 runs passed. One new large-screen UI assertion checked timeframe reachability before destination navigation finished; its recorded activities show it querying the outgoing screen. The test now waits for the destination graph before scrolling, and the focused large-screen rerun passes (`/tmp/BrickVal172LargeInteraction.xcresult`). A follow-up fixture change waits for all prepared windows before the demo becomes interactive; its focused small-screen rerun passes (`/tmp/BrickVal172CIraceFix.xcresult`). The pre-existing bulk-summary check passes locally. The first full CI run failed only on the old fixture race; a fresh CI run for the follow-up commit is in progress. Evidence: `/tmp/BrickVal172Full.xcresult` and `/tmp/brickval172-performance-activities.json`.
- Blocked: physical-device confirmation. Both paired iPhones were unavailable at initial inspection. No claim that the owner's exact freeze is resolved on their phone yet.
- Blocked: exact build-166 runtime/source comparison. Git history does not identify an exact build-166 source snapshot; the remaining `/tmp/BrickVal-1.0.7-166.xcarchive` is incomplete (no application binary/Info.plist), so its name is not verification. Do not substitute older synthetic-history behavior for real-history correctness.
- Separate existing gap: the bulk-correction summary UI assertion from build 171's CI remains outside this performance finding until its cause is established.

## Release

Signed archive `/tmp/BrickVal172.xcarchive` succeeded with the normal Release configuration (no DEBUG fixture override), version 1.0.8 (172). Xcode Organizer uploaded it successfully through the valid Apple account session after the command-line exporter hit its stale account cache. App Store Connect processed build ID `f69f63a0-77e2-48e5-9629-7b86b423620e` as Ready to Submit and attached it to the existing Team (Expo) and v1 internal groups; testing notes are saved. Sentry lists the app debug ID `8e3817f7-fb0e-3f61-aac6-819d1335dc7b` and both framework files; the temporary upload token was revoked immediately after verification. No backend deployment, migration, subscription product change, or pricing change is part of this task.
