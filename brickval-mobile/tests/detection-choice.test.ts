import assert from "node:assert/strict";
import test from "node:test";

import { getDetectionChoiceMessage, shouldPauseForDetectionChoice } from "../lib/detection-choice";

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
    "We found more than one LEGO minifigure or part in this photo. Pick one to view its value."
  );
});
