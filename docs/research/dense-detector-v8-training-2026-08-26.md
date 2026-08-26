# Bulk Minifigure Detector v8 Candidate

Date: 2026-08-26
Status: Candidate evaluated; production model retained

## Scope

This iteration trained a fresh pretrained YOLOv8n bulk detector using the supplied
88-image export: 60 new images plus the previous 28-image dataset. The existing
single-figure detector and identification flow were not changed.

The current production model remains `yolo-v7-stock-bulk-1024` in
`apps/ios-swift/BrickVal/Resources/Models/BulkMinifigureDetector.mlpackage`.
No Core ML export, app replacement, or TestFlight build was made because the
protected phone-camera holdout was not present in the supplied files.

## Dataset Review

The raw export contained 3,692 boxes across 88 images:

| Split | Images | Raw boxes | Clean boxes |
| --- | ---: | ---: | ---: |
| Train | 63 | 2,774 | 2,744 |
| Valid | 15 | 482 | 479 |
| Test | 10 | 436 | 433 |
| Total | 88 | 3,692 | 3,656 |

The 19 automatically flagged images were reviewed structurally and visually.
Cleaning removed five labels on loose accessories or merged multi-figure regions
and consolidated 30 contained/duplicate labels. Removed objects remain visible
and unlabelled, so they act as hard negatives. Rotated or long boxes were not
removed merely because of aspect ratio; legitimate sideways and oversized
figures were retained.

The cleaned temporary dataset and machine-readable counts were kept outside the
repository at `/tmp/brickval-yolov8-v8-clean/cleaning-report.json`.

## Training

Both runs used a fresh `yolov8n.pt` checkpoint at 1024px with AdamW, fixed seeds
17 and 29, batch size 1, no mosaic, no mixup, no copy-paste, no vertical flip,
small rotation/translation/scale, horizontal flip, and conservative HSV changes.

The first MPS run was discarded after an Ultralytics tensor-shape crash. The
replacement seed-17 run produced a valid checkpoint; its validation crashed late
in MPS validation, so the checkpoint was evaluated on CPU. Seed 29 completed 100
epochs and was also evaluated on CPU.

## Results

The confidence threshold was tuned on the development split only. `0.30` was
selected because it reduced false positives and duplicates while retaining more
than 90% recall on development data:

| Candidate | Split / pipeline | Precision | Recall | FP/photo | Duplicates/GT |
| --- | --- | ---: | ---: | ---: | ---: |
| Seed 17 | Valid, full image | 93.6% | 91.0% | 2.00 | 0.021 |
| Seed 29 | Valid, full image | 95.2% | 91.6% | 1.47 | 0.008 |
| Seed 17 | Clean test, full image | 87.5% | 90.3% | 5.60 | 0.046 |
| Seed 29 | Clean test, full image | 95.5% | 93.1% | 1.90 | 0.009 |
| Seed 17 | Dense holdout, iOS tiles | 91.3% | 92.3% | 6.00 | 0.000 |
| Seed 29 | Dense holdout, iOS tiles | 93.7% | 93.0% | 4.25 | 0.000 |

The cleaned dense holdout contains 273 boxes after removing two malformed labels;
the original report counted 275 boxes before cleaning. The seed-29 candidate’s
dedicated tall/oversized subset contained 51 figures, with 45 matched (88.2%
recall) and zero duplicate detections. This is below the desired robustness for
long-legged figures even though aggregate dense metrics pass.

The prior production report recorded 90.7% precision / 81.1% recall on the dense
benchmark and 70.0% precision / 55.3% recall on the independent phone-camera
session at its evaluated threshold. Those figures are historical baseline
measurements; the phone session image files and labels were not included in the
current workspace, so neither candidate can be validated against that protected
holdout now.

## Release Decision

**Do not replace the production model.** The candidate passes the available
cleaned dense holdout and materially reduces duplicate detections, but the full
release gate requires both protected holdouts at at least 90% precision and recall.
The independent 19-photo / 38-box phone-camera holdout is missing, and the tall
subset is below 90% recall.

The next data needed is:

1. The original independent phone-camera photos and YOLO labels, including the
   38 protected boxes.
2. At least 20 additional real-phone images containing long-legged or oversized
   figures, with one whole-body box per figure.
3. Several negative scenes containing accessories, vehicles, animals, loose parts,
   and empty/background regions with no labels on those non-figures.

Once those assets are available, rerun the exact tiled benchmark before exporting
Core ML. Until then, keep `yolo-v7-stock-bulk-1024` in the app.
