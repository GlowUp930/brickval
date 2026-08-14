import assert from "node:assert/strict";
import test from "node:test";

import { buildProductFeedbackDedupeKey, isValidProductFeedbackPayload } from "../src/lib/product-feedback";

const base = {
  dedupeKey: "pmf_v1:20",
  anonymousID: "device-1",
  accessCohort: "experiment_soft",
  successfulScanCount: 5,
  appVersion: "1.0.3",
  appBuild: "125",
};

test("validates the required answers for each survey", () => {
  assert.equal(isValidProductFeedbackPayload({
    ...base,
    surveyType: "post_purchase",
    postPurchaseReason: "bulk_scanning",
    acquisitionSource: "youtube",
  }), true);
  assert.equal(isValidProductFeedbackPayload({
    ...base,
    surveyType: "pmf",
    pmfSentiment: "very_disappointed",
    pmfBenefit: "Fast value checks",
    pmfMissing: "Better part support",
  }), true);
  assert.equal(isValidProductFeedbackPayload({
    ...base,
    surveyType: "cancellation",
    cancellationReason: "price",
  }), true);
});

test("rejects unknown answers and oversized text", () => {
  assert.equal(isValidProductFeedbackPayload({
    ...base,
    surveyType: "pmf",
    pmfSentiment: "maybe",
    pmfBenefit: "Benefit",
    pmfMissing: "Missing",
  }), false);
  assert.equal(isValidProductFeedbackPayload({
    ...base,
    surveyType: "cancellation",
    cancellationReason: "price",
    additionalText: "x".repeat(1001),
  }), false);
});

test("scopes deduplication to the user or device", () => {
  assert.equal(buildProductFeedbackDedupeKey("user-1", "pmf_v1:20"), "user-1:pmf_v1:20");
  assert.notEqual(
    buildProductFeedbackDedupeKey("user-1", "pmf_v1:20"),
    buildProductFeedbackDedupeKey("user-2", "pmf_v1:20")
  );
});
