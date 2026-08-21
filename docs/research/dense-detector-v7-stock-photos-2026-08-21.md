# Dense minifigure detector v7 stock-photo training report

Date: 2026-08-21

## Scope

The user supplied 39 stock-photo files from:

`/Users/holamchan/Documents/lego-stock-pic/lego-bulk-training /`

The files contained exact duplicates, resized duplicates, and one duplicate clipboard image. After deduplication there were 32 unique scenes. Six scenes were held out from training; 26 scenes were used as provisional supplemental training data.

## Label quality

The supplied images had no YOLO labels. The existing detector generated provisional labels at confidence 0.30. The 26 training scenes contributed 801 provisional boxes.

These labels are not equivalent to manual annotation. They are useful for a low-cost adaptation experiment, but some figures are certainly missed and some boxes may be false. The six stock-photo holdouts were not used in training and were not presented as a final accuracy benchmark because they do not have manually verified labels.

## Training

The candidate combined the existing v1 dataset with the 26 provisional stock-photo scenes and was fine-tuned from the v1 checkpoint with the weights loaded correctly.

- Model: YOLOv8n
- Input size: 1,024 pixels
- Completed epochs: 2
- Best checkpoint: `/tmp/brickval-yolo-work-v3/runs/stock-photos-finetune/weights/best.pt`
- Broad validation: precision 78.6%, recall 55.8%, mAP50 65.3%, mAP50-95 35.5%

The third epoch stopped on an Ultralytics/MPS tensor-size error. The saved best checkpoint was valid and was used for all comparisons.

## Protected holdout results

Metrics use one-to-one box matching at IoU 0.50. Recall means figures found; precision means detections that were real figures.

### Full-image inference at confidence 0.15

| Holdout | v1 baseline | v7 stock-photo candidate |
| --- | ---: | ---: |
| Supplied dense test, 275 boxes | 86.6% precision / 77.8% recall | 88.9% precision / 81.5% recall |
| Independent phone session, 38 boxes | 47.4% precision / 23.7% recall | 63.6% precision / 55.3% recall |

At confidence 0.20, v7 reached 90.7% precision and 81.1% recall on the dense test, and 70.0% precision and 55.3% recall on the independent phone session.

### Tiled inference

With 70% image tiles and 20% overlap, the dense test reached 91.6% precision and 83.3% recall at confidence 0.40. The independent phone session reached 59.4% precision and 50.0% recall at confidence 0.30.

Tiling improves dense-scene recall but adds false detections on the phone photos. The candidate does not meet the 90% precision-and-recall gate.

## Decision

This is a real improvement, especially on unseen phone-camera conditions, but it is not release quality for a 90% accuracy claim. Per the explicit test request, the checkpoint is integrated into build 140 for bulk scanning only, behind the existing bulk detection path. It must not replace the single-figure model or be treated as production-validated until manually labelled phone-camera data confirms the target.

Before another training run, the 26 stock-photo scenes should be permission-cleared and manually corrected. The next evaluation should use a manually labelled stock-photo holdout as well as the existing phone-camera holdout. More varied real phone photos remain higher-value than more marketplace images.
