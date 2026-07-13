import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeBrickognizeSearchResponse,
  normalizeBrickognizeDetections,
  withStableRegionIds,
} from "../src/lib/identify-nonset";

test("normalization preserves identical minifigures in separate physical regions", () => {
  const detections = normalizeBrickognizeDetections([
    {
      id: "sw0001",
      type: "fig",
      score: 0.95,
      bounding_box: { left: 10, top: 20, right: 110, bottom: 220, imageWidth: 500, imageHeight: 500 },
    },
    {
      id: "sw0001",
      type: "fig",
      score: 0.93,
      bounding_box: { left: 300, top: 20, right: 400, bottom: 220, imageWidth: 500, imageHeight: 500 },
    },
  ]);

  assert.equal(detections.minifigs.length, 2);
  assert.deepEqual(detections.minifigs.map((item) => item.id), ["sw0001", "sw0001"]);
});

test("Brickognize analysis keeps runner-up confidence for automatic-match gating", () => {
  const analysis = analyzeBrickognizeSearchResponse({
    detected_items: [{
      bounding_boxes: [{ left: 10, upper: 20, right: 110, lower: 220, image_width: 500, image_height: 500, score: 0.95 }],
      candidate_items: [
        { id: "fig-sw0001", type: "fig", score: 0.91, external_items: [{ external_id: "sw0001" }] },
        { id: "fig-sw0002", type: "fig", score: 0.86, external_items: [{ external_id: "sw0002" }] },
      ],
    }],
  });

  assert.deepEqual(analysis.detections.minifigs[0]?.alternatives, [
    { id: "sw0001", score: 0.91 },
    { id: "sw0002", score: 0.86 },
  ]);
});

test("physical detections receive stable spatial region IDs", () => {
  const normalized = normalizeBrickognizeDetections([
    {
      id: "sw0001",
      type: "fig",
      score: 0.95,
      bounding_box: { left: 300, top: 20, right: 400, bottom: 220, imageWidth: 500, imageHeight: 500 },
    },
    {
      id: "sw0001",
      type: "fig",
      score: 0.93,
      bounding_box: { left: 10, top: 20, right: 110, bottom: 220, imageWidth: 500, imageHeight: 500 },
    },
  ]);
  const regions = withStableRegionIds(normalized.all);

  assert.deepEqual(regions.map((item) => item.regionId), ["region-2", "region-1"]);
});
