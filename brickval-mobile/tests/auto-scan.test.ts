import assert from "node:assert/strict";
import test from "node:test";

import {
  createAutoScanSession,
  observeAutoScanFrame,
  observeAutoScanStability,
  observeAutoScanTarget,
} from "../lib/auto-scan";

test("single auto-scan requires two consistent minifigure observations", () => {
  const searching = createAutoScanSession();
  const emptyView = observeAutoScanTarget(searching, null);

  assert.equal(emptyView.phase, "searching");
  assert.equal(emptyView.captureRequested, false);

  const first = observeAutoScanTarget(emptyView, {
    trackingId: "target-1",
    confidence: 0.76,
    frameCoverage: 0.34,
    fullyVisible: true,
  });
  const second = observeAutoScanTarget(first, {
    trackingId: "target-1",
    confidence: 0.75,
    frameCoverage: 0.35,
    fullyVisible: true,
  });
  assert.equal(first.phase, "searching");
  assert.equal(second.phase, "detected");
  assert.equal(second.captureRequested, false);
});

test("single auto-scan blocks when more than one minifigure is visible", () => {
  const target = {
    confidence: 0.92,
    boundingBox: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 },
    timestamp: 1_000,
    fullyVisible: true,
    regionId: "target-1",
  };
  const blocked = observeAutoScanFrame(createAutoScanSession(), [
    target,
    { ...target, regionId: "target-2", boundingBox: { ...target.boundingBox, x: 0.6 } },
  ]);

  assert.equal(blocked.phase, "searching");
  assert.equal(blocked.blockReason, "multiple");
  assert.equal(blocked.captureRequested, false);
});

test("moving target boxes restart the two-observation gate", () => {
  const base = {
    confidence: 0.92,
    boundingBox: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 },
    timestamp: 1_000,
    fullyVisible: true,
    regionId: "target-1",
  };
  const first = observeAutoScanFrame(createAutoScanSession(), [base]);
  const moved = observeAutoScanFrame(first, [{ ...base, timestamp: 1_150, boundingBox: { ...base.boundingBox, x: 0.45 } }]);

  assert.equal(moved.phase, "searching");
  assert.equal(moved.consistentObservationCount, 1);
});

test("consistent hosted boxes match even when prediction IDs change", () => {
  const base = {
    confidence: 0.82,
    boundingBox: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 },
    timestamp: 1_000,
    fullyVisible: true,
    regionId: "prediction-1",
  };
  const first = observeAutoScanFrame(createAutoScanSession(), [base]);
  const detected = observeAutoScanFrame(first, [{ ...base, timestamp: 1_800, regionId: "prediction-2" }]);

  assert.equal(detected.phase, "detected");
});

test("center-cropped detections use sample coverage after mapping to the full frame", () => {
  const observation = {
    confidence: 0.95,
    boundingBox: { x: 0.34, y: 0.36, width: 0.327, height: 0.244 },
    detectionFrameCoverage: 0.173,
    timestamp: 1_000,
    fullyVisible: true,
    regionId: "prediction-1",
  };
  const first = observeAutoScanFrame(createAutoScanSession(), [observation]);
  const detected = observeAutoScanFrame(first, [{ ...observation, timestamp: 1_800 }]);

  assert.equal(detected.phase, "detected");
});

test("single auto-scan requests capture only after target and phone stay stable", () => {
  const target = {
    trackingId: "target-1",
    confidence: 0.92,
    frameCoverage: 0.34,
    fullyVisible: true,
  };
  const first = observeAutoScanTarget(createAutoScanSession(), target);
  const second = observeAutoScanTarget(first, target);
  const detected = observeAutoScanTarget(second, target);

  const holding = observeAutoScanStability(detected, {
    now: 1_000,
    deviceStable: true,
    targetStable: true,
  });
  assert.equal(holding.phase, "holding");
  assert.equal(holding.captureRequested, false);

  const ready = observeAutoScanStability(holding, {
    now: 1_600,
    deviceStable: true,
    targetStable: true,
  });
  assert.equal(ready.phase, "capturing");
  assert.equal(ready.captureRequested, true);
});
