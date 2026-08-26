# Bulk Match Correction Flow

## Decision

Bulk scanning should complete as a spatial, value-first reveal. Detection remains visible after the reveal, and correction is contextual: tap the detected frame or its result card to inspect up to three cached candidates. The default match is accepted automatically, so correction is available without interrupting successful scans.

## Research Notes

- [Apple machine learning HIG](https://developer.apple.com/design/human-interface-guidelines/machine-learning/) favors making model mistakes understandable and recoverable. BrickVal keeps the detected region visible and puts correction next to the affected figure instead of asking users to restart the lot.
- [Brickit](https://brickit.app/) uses region-first interaction: the object in the image stays the anchor for the next action. BrickVal keeps that anchor through the completed result state and opens a compact match sheet from the frame.
- [Google Lens help](https://support.google.com/websearch/answer/1325808?co=GENIE.Platform%3AiOS&hl=en) reinforces selecting the specific visual region when the system needs a better match. BrickVal retries only the exact known detection box for an unidentified region; it does not infer a nearby figure or create a freeform crop.

## Interaction Rules

- Green frame: identified and selected.
- Quiet grey frame: identified and deselected.
- Neutral dashed frame with a question mark: detected but unidentified.
- A frame tap or result-card match control opens the same sheet.
- The current match appears first, followed by at most two cached alternatives.
- `None of these` makes the region unidentified and removes it from totals and collection payloads.
- An unidentified region with no cached candidates can use one exact-region retry. Expired recovery tokens remain a visible error.
- A replacement preserves the region ID, condition, and selection state where available, then updates the card, price, total, identified count, and top-find calculation.
- The only primary completed action is `Add N to Collection`; there is no persistent `+ Missed` or multi-figure recovery mode.

## Telemetry Boundary

Correction metadata is recorded through the existing OSLog path only: correction opened, candidate rank selected, retry outcome, detected count, identified count, and corrected count. The image and encoded crop are never included in these events.
