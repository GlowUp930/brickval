import assert from "node:assert/strict";
import test from "node:test";

import { mapFallbackDetections } from "../src/lib/smart-scan-fallback";

test("fallback maps only boxed minifigures into hosted observations", () => {
  const observations = mapFallbackDetections([
    {
      id: "sh0318",
      item_type: "minifig",
      score: 0.86,
      regionId: "figure-1",
      bounding_box: {
        left: 100,
        top: 50,
        right: 300,
        bottom: 450,
        imageWidth: 1000,
        imageHeight: 500,
      },
    },
    { id: "3001", item_type: "part", score: 0.99 },
    { id: "missing-box", item_type: "minifig", score: 0.90 },
  ]);

  assert.deepEqual(observations, [{
    confidence: 0.86,
    boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.8 },
    fullyVisible: true,
    regionId: "figure-1",
  }]);
});
