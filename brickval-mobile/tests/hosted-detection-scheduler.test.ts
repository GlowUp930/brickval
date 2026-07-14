import assert from "node:assert/strict";
import test from "node:test";

import {
  completeHostedDetection,
  createHostedDetectionSchedule,
  shouldSampleHostedDetection,
  startHostedDetection,
} from "../lib/hosted-detection-scheduler";

test("hosted detection keeps one request active and samples stable scenes every 800ms", () => {
  const initial = createHostedDetectionSchedule();
  assert.equal(shouldSampleHostedDetection(initial, { now: 0, cameraStable: true }), true);

  const active = startHostedDetection(initial, 0);
  assert.equal(shouldSampleHostedDetection(active, { now: 1_000, cameraStable: true }), false);

  const completed = completeHostedDetection(active);
  assert.equal(shouldSampleHostedDetection(completed, { now: 799, cameraStable: true }), false);
  assert.equal(shouldSampleHostedDetection(completed, { now: 800, cameraStable: true }), true);
});

test("hosted detection slows to two seconds after eight unsuccessful samples", () => {
  const backedOff = {
    inFlight: false,
    attempts: 8,
    lastRequestedAt: 8_000,
  };

  assert.equal(shouldSampleHostedDetection(backedOff, { now: 9_999, cameraStable: true }), false);
  assert.equal(shouldSampleHostedDetection(backedOff, { now: 10_000, cameraStable: true }), true);
});
