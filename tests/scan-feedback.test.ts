import assert from "node:assert/strict";
import test from "node:test";

import { planFeedbackImageCollection } from "../src/lib/scan-feedback";

test("feedback never stores an image without explicit consent", () => {
  assert.equal(planFeedbackImageCollection({ consent: false, outcome: "low-confidence", random: 0 }), false);
});

test("feedback prioritizes failures and low-confidence scans", () => {
  assert.equal(planFeedbackImageCollection({ consent: true, outcome: "brickognize-rejected", random: 0.99 }), true);
  assert.equal(planFeedbackImageCollection({ consent: true, outcome: "low-confidence", random: 0.99 }), true);
  assert.equal(planFeedbackImageCollection({ consent: true, outcome: "gallery-recovery", random: 0.99 }), true);
});

test("feedback samples five percent of successful scans", () => {
  assert.equal(planFeedbackImageCollection({ consent: true, outcome: "matched", random: 0.049 }), true);
  assert.equal(planFeedbackImageCollection({ consent: true, outcome: "matched", random: 0.05 }), false);
});
