# Sentry app-hang and detector diagnosis — 2026-09-11

## Conclusion

The supplied Sentry issue does **not** justify retraining or replacing the minifigure model. It is an app-hang issue from build 1.0.7 (166), and the captured main-thread stack is UIKit/SwiftUI transaction work rather than Core ML inference. The current bulk detector can still add resource pressure: a controlled simulator benchmark measured about 8.5 seconds for its 102-tile photo pass. The safer next step is to reduce and measure the detector workload and move photo decoding out of the main UI path before changing model weights.

## Evidence

The [Sentry issue](https://areyouok-4x.sentry.io/share/issue/f8f47fa14eab4cd0975d9aadc8c2fb46/) (`BRICKVAL-T`) contains two production app-hang events for one anonymous user:

- Release `com.brickval.app@1.0.7+166`, physical iPhone 11 Pro Max (`iPhone12,5`), iOS 26.6.1.
- One event reports a fully blocked 7.4–8.2 second hang; the other reports a non-fully blocked 4.8–5.6 second hang.
- At capture, the device reported about 64.5 MiB free memory and serious thermal state. The app was foreground and active.
- Breadcrumbs show the PhotosUI picker, app background/foreground transitions, and Clerk/Superwall/RevenueCat refresh activity. There is no scanner API request or model-specific breadcrumb at the hang boundary.
- The main stack is SwiftUI/UIKit update and Core Animation transaction commit. It contains no Core ML or BrickVal application frame that can be mapped to source.
- Sentry reports the build-166 BrickVal dSYM is missing (`6ec1c964-e05e-33fe-a30e-d0822d50f28c`), so the exact in-app line cannot be recovered from this event.

The native source keeps Core ML in `actor CoreMLMinifigureDetector` and reaches it through awaited calls from `ScanStore`; this is background work by design. The imported-photo path currently runs one full-image pass plus overlapping 3×3, 4×4, and 5×5 passes on both the original and padded-square canvas (102 Vision requests total) in [`CoreMLMinifigureDetector.swift`](../../apps/ios-swift/BrickVal/Core/Detection/CoreMLMinifigureDetector.swift). A throwaway benchmark on a 1,170×2,532 portrait fixture measured `inference_ms=8543`, `tile_count=102` on the small iPhone simulator. The simulator emitted an MPSGraph compatibility warning, so this is a workload signal rather than a physical-device timing claim. The temporary benchmark was removed after measurement; its log is `/tmp/brickval-model-benchmark-all.log`.

The scanner UI also has a separate performance risk. [`ScannerView.swift`](../../apps/ios-swift/BrickVal/Features/Scan/ScannerView.swift) decodes `frozenImageData` with `UIImage(data:)` while calculating the bulk image rectangle during view rendering, and `FrozenScanImageView` decodes the same data from a view task. A large photo can therefore make main-thread UI commits expensive while the detector is using CPU and memory in the background. This is a source-level finding, not a claim that the unsymbolicated event proves that exact line.

## Classification

### Confirmed defects or facts

1. Build 166 produced severe app-hang events on one physical iPhone under low-memory and serious-thermal conditions.
2. The event cannot be symbolicated because the build-166 app dSYM is missing.
3. The main event stack points to UI/animation transaction work, not a model call.
4. The current imported-photo detector performs 102 serial tile inferences; the controlled simulator benchmark took 8.5 seconds.

### Suspected contributors

1. Synchronous or repeated decoding of a large picker image on the main UI path while the detector is active.
2. Detector CPU/memory load prolonging thermal and memory pressure, indirectly making UI commits slower.
3. Foreground SDK refreshes overlapping picker dismissal and scanner view reconstruction.
4. FileProvider/PhotosUI handoff work delaying the return path.

### Blocked or untested

1. The exact physical reproduction on the affected iPhone 11 Pro Max is blocked; no matching device is connected.
2. A simulator picker loop could open the picker but could not expose an accessible photo for selection, so it is not a valid reproduction of the reported return path.
3. Build 166 cannot be mapped to a source line until its original archive/dSYM is recovered.
4. Current build 176 has not been profiled under the same physical memory and thermal state. Simulator results do not establish recovery on the owner's phone.

## Feedback loops run

- `xcodebuild test -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,id=D72A48E4-D384-47D8-8A5E-E9EE9C0B0668' -only-testing:BrickValTests/CoreMLMinifigureDetectorTests -only-testing:BrickValTests/ScanStoreLifecycleTests -quiet` passed the focused model and scanner lifecycle checks.
- `xcodebuild test -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,id=D72A48E4-D384-47D8-8A5E-E9EE9C0B0668' -only-testing:BrickValUITests/ScannerProcessingLayoutUITests/testCapturedImageDoesNotExpandScannerIntoAdjacentControls -quiet` passed. This checks scanner layout with a captured image, not the physical picker hang.
- The temporary 102-tile benchmark completed and recorded the 8,543 ms result above. The surrounding native run had one unrelated, time-sensitive collection-history expectation failure; all Core ML and scan-lifecycle tests passed.
- The source inspection confirmed the model call is actor-isolated and awaited. That is a good separation for model work, but it does not remove the main-thread image-decoding risk.

## Recommended order

1. **Release blocker:** make dSYM upload part of every Release archive/upload and verify the app UUID in Sentry before shipping. The existing `scripts/upload-sentry-symbols.sh` is available, but this issue proves that a release can still reach production without its app symbols.
2. **Next native fix:** decode image dimensions and thumbnails with ImageIO off the main actor; remove `UIImage(data:)` from `ScannerView.body` and keep one bounded decoded image for the frozen photo. Add a picker-return performance test with a seeded simulator photo and a physical iPhone run.
3. **Next detector fix:** downsample before tiling and introduce a bounded/adaptive tile budget (with cancellation when the scene leaves the foreground). Evaluate recall and precision on the existing dense-photo holdout before changing tile counts or model thresholds.
4. **Instrumentation:** add prediction-specific Sentry breadcrumbs/analytics containing model version, tile count, inference duration, scan source, and cancellation state. Do not include images, raw identities, or request bodies.
5. **Physical verification:** profile an iPhone 11 Pro Max in the picker → import flow with Instruments under normal and constrained thermal/memory conditions. Repeat after the image and detector workload changes.

## Model decision

Keep `coreml-v3-500` and `yolo-v8-seed29-nms-bulk-1024` unchanged for this incident. The evidence supports a pipeline and UI responsiveness investigation, not a recognition-quality failure. A model retrain becomes justified only if scan telemetry or a holdout evaluation shows incorrect detections, unacceptable inference time after the workload is bounded, or a reproducible model-specific failure on the main path.

