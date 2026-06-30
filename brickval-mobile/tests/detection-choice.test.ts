import assert from "node:assert/strict";
import test from "node:test";

import {
  getBatchableMinifigIds,
  getDetectionChoiceMessage,
  getDetectionReviewSummary,
  getDetectionReviewTitle,
  shouldPauseForDetectionChoice,
  toggleBulkMinifigSelection,
} from "../lib/detection-choice";

test("shouldPauseForDetectionChoice shows a picker for multiple detections", () => {
  assert.equal(
    shouldPauseForDetectionChoice(
      [
        { id: "a", item_type: "minifig", score: 0.91 },
        { id: "b", item_type: "part", score: 0.72 },
      ],
      0.8
    ),
    true
  );
});

test("shouldPauseForDetectionChoice shows a picker for one low-confidence detection", () => {
  assert.equal(
    shouldPauseForDetectionChoice([{ id: "a", item_type: "minifig", score: 0.61 }], 0.8),
    true
  );
});

test("shouldPauseForDetectionChoice skips the picker for one confident detection", () => {
  assert.equal(
    shouldPauseForDetectionChoice([{ id: "a", item_type: "minifig", score: 0.93 }], 0.8),
    false
  );
});

test("getDetectionChoiceMessage changes based on confidence and count", () => {
  assert.equal(
    getDetectionChoiceMessage([{ id: "a", item_type: "minifig", score: 0.61 }], 0.8),
    "We found one possible match, but confidence is low. Pick to confirm before viewing value."
  );
  assert.equal(
    getDetectionChoiceMessage(
      [
        { id: "a", item_type: "minifig", score: 0.91 },
        { id: "b", item_type: "part", score: 0.72 },
      ],
      0.8
    ),
    "Review the items found in this photo. Pick one to price first."
  );
});

test("getDetectionReviewTitle labels multiple detections as a bulk review", () => {
  assert.equal(
    getDetectionReviewTitle([
      { id: "a", item_type: "minifig", score: 0.91 },
      { id: "b", item_type: "part", score: 0.72 },
    ]),
    "Review bulk scan"
  );

  assert.equal(getDetectionReviewTitle([{ id: "a", item_type: "minifig", score: 0.61 }]), "Confirm match");
});

test("getDetectionReviewSummary summarizes minifigure and part counts", () => {
  assert.equal(
    getDetectionReviewSummary([
      { id: "a", item_type: "minifig", score: 0.91 },
      { id: "b", item_type: "minifig", score: 0.82 },
      { id: "c", item_type: "part", score: 0.72 },
    ]),
    "2 minifigs · 1 part"
  );
});

test("getBatchableMinifigIds excludes parts from batch pricing", () => {
  assert.deepEqual(
    getBatchableMinifigIds([
      { id: "sw0001", item_type: "minifig", score: 0.91 },
      { id: "3001", item_type: "part", score: 0.72 },
      { id: "sw0002", item_type: "minifig", score: 0.82 },
    ]),
    ["sw0001", "sw0002"]
  );
});

test("toggleBulkMinifigSelection adds and removes ids without changing other selections", () => {
  assert.deepEqual(toggleBulkMinifigSelection(["sw0001"], "sw0002"), ["sw0001", "sw0002"]);
  assert.deepEqual(toggleBulkMinifigSelection(["sw0001", "sw0002"], "sw0001"), ["sw0002"]);
});
