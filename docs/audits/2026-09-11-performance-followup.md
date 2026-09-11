# Native performance follow-up — 2026-09-11

## Summary

The highest code-backed risks were repeated captured-photo decoding, uncancelled imported-photo work, repeated country filtering during history preparation, and foreground image-cache maintenance. The native source now shares a downsampled preview, cancels stale scan work, partitions market rows once, and moves image decoding and disk trimming away from view rendering. The remaining bulk detector duration and physical-device responsiveness are still measurement gaps; this change does not claim that a constrained iPhone hang is resolved until a device run confirms it.

## Findings and changes

1. **Captured photos were decoded in more than one view.**
   - **Evidence:** `ScannerView`, `BulkProcessingOverlayView`, and `BulkScanResultsView` each previously created a `UIImage` from the same bytes.
   - **Change:** `ScanPreviewPipeline` now creates one orientation-correct, display-sized preview in the background, deduplicates concurrent requests, and bounds decoded memory. Recognition keeps the original bytes.
   - **Validation:** `ScanPreviewPipelineTests` verifies concurrent sharing, 600-pixel downsampling, and invalid-data handling. Scanner UI checks still pass on both simulator sizes.

2. **Imported-photo work could outlive the screen.**
   - **Evidence:** the picker path launched an untracked task, while the detector already performs cancellation checks between tiles. A historical benchmark measured about 102 tile inference passes and 8.5 seconds on simulator fixtures.
   - **Change:** the picker uses a SwiftUI-owned task; capture/retry operations have a tracked task handle; a generation token and cancellation checks prevent stale detector/provider responses from presenting results after replacement, navigation, or backgrounding. The detector tile schedule and model thresholds are unchanged until coverage profiling supports a reduction.
   - **Validation:** `cancellingImportedPhotoDropsStaleDetectorResults` passes. Existing bulk lifecycle and failed-scan checks pass. The 102-pass duration remains a suspected device bottleneck requiring a Release profile with real dense-photo fixtures.

3. **Regional history preparation repeated filtering work.**
   - **Evidence:** each item repeatedly filtered raw rows for every region and then rebuilt chart and snapshot inputs separately.
   - **Change:** each condition is parsed once, partitioned into All regions and observed seller countries, and shared by chart and snapshot preparation. Cancellation checks run inside item, region, and sale loops. Absent countries remain empty and do not create synthetic observations.
   - **Validation:** portfolio history tests pass for sold/listing fallback, seller-country filtering, quantity weighting, date windows, coverage, and stable chart identities. A current optimized-fixture run reports all-window preparation of 1.55 ms for 10 holdings, 6.91 ms for 50, and 27.35 ms for 200; warm chart selection is below 0.2 ms p95 in that run.

4. **Product-image cache work could block foreground requests.**
   - **Evidence:** disk trimming scanned the cache directory during a foreground write, and the same decoded image was registered under two memory keys.
   - **Change:** decoded images use one size-aware key, at most two decodes run concurrently, and disk trimming is throttled and scheduled at utility priority after the request returns. Download deduplication, offline reuse, and cache limits remain intact.
   - **Validation:** `ProductImageTests` passes download sharing, downsampling, retry, offline restart, memory clearing, and bounded disk eviction.

5. **Callout formatting and SDK startup remain unprofiled.**
   - **Status:** no source change was made without a trace showing that these paths block interaction. They remain the next profiling targets if Release traces show a hitch after the photo changes.

## Verification

- Passed: 234 native unit tests on the BrickVal Small iPhone simulator.
- Passed: 234 native unit tests on the BrickVal iPhone 17 Pro simulator.
- Passed: 17 scanner/processing UI tests on the BrickVal Small iPhone simulator.
- Passed: 17 scanner/processing UI tests on the BrickVal iPhone 17 Pro simulator.
- Passed: history timing harness, preview pipeline, ProductImage, portfolio-history, and scan-cancellation regressions.
- Existing simulator warnings about CoreMotion/audio plist fixtures do not affect test outcomes.
- Not yet verified: Release Instruments trace on a physical iPhone, peak memory across ten real scan/navigation cycles, and the constrained-device 102-pass detector workload.

## Release status and next measurement

The implementation is source-tested but not yet a device sign-off. Signed Release build 1.0.8 (178) is archived at `/tmp/BrickVal178.xcarchive`; strict code-signature verification passed and its BrickVal dSYM UUID is `E34108CE-5CD5-3456-833A-4A16804C4DDF`. TestFlight upload was not performed because this task did not authorize submission. Before claiming the lag is resolved, capture Release timings for photo import, cancellation, bulk detection, image scrolling, and 20 chart switches on a physical iPhone. Keep the existing genuine market history, visible individual bulk prices, scan allowances, and accessibility behavior unchanged.
