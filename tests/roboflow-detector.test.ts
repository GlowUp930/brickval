import assert from "node:assert/strict";
import test from "node:test";

import { runHostedMinifigureDetection } from "../src/lib/roboflow-detector";

test("hosted detection returns normalized minifigure boxes and timing", async () => {
  const result = await runHostedMinifigureDetection(new Blob(["image"]), {
    consumeQuota: async () => true,
    infer: async () => ({
      image: { width: 416, height: 416 },
      predictions: [{
        x: 208,
        y: 166.4,
        width: 166.4,
        height: 249.6,
        confidence: 0.86,
        class: "Lego-Minifigures",
        detection_id: "prediction-1",
      }],
    }),
    now: (() => {
      const values = [10, 190];
      return () => values.shift() ?? 190;
    })(),
  });

  assert.equal(result.status, "available");
  assert.equal(result.detectorModelVersion, "lego-364li/1");
  assert.equal(result.detectMs, 180);
  assert.deepEqual(result.observations, [{
    confidence: 0.86,
    boundingBox: { x: 0.3, y: 0.1, width: 0.4, height: 0.6 },
    fullyVisible: true,
    regionId: "prediction-1",
  }]);
});

test("the monthly cap disables hosted detection without calling Roboflow", async () => {
  let inferenceRequested = false;
  const result = await runHostedMinifigureDetection(new Blob(["image"]), {
    consumeQuota: async () => false,
    infer: async () => {
      inferenceRequested = true;
      return {};
    },
    now: () => 0,
  });

  assert.deepEqual(result, {
    status: "cap-reached",
    detectorModelVersion: "lego-364li/1",
    detectMs: 0,
    observations: [],
  });
  assert.equal(inferenceRequested, false);
});
