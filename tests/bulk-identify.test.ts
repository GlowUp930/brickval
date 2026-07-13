import assert from "node:assert/strict";
import test from "node:test";

import { assignDetectionsToRegions, parseBulkRegionManifest } from "../src/lib/bulk-identify";

test("guided bulk results are keyed to physical region IDs", () => {
  const regions = [
    { regionId: "region-left", boundingBox: { x: 0.05, y: 0.1, width: 0.35, height: 0.8 } },
    { regionId: "region-right", boundingBox: { x: 0.6, y: 0.1, width: 0.35, height: 0.8 } },
  ];
  const assigned = assignDetectionsToRegions([
    { id: "sw0001", item_type: "minifig", score: 0.95, bounding_box: { left: 600, top: 100, right: 950, bottom: 900, imageWidth: 1000, imageHeight: 1000 } },
    { id: "sw0001", item_type: "minifig", score: 0.93, bounding_box: { left: 50, top: 100, right: 400, bottom: 900, imageWidth: 1000, imageHeight: 1000 } },
  ], regions);

  assert.deepEqual(assigned.map((item) => item.regionId), ["region-right", "region-left"]);
});

test("guided bulk manifest rejects more than four images or forty regions", () => {
  const tooManyShards = JSON.stringify({
    shards: Array.from({ length: 5 }, (_, index) => ({ shardId: `s${index}`, imageIndex: index, regions: [] })),
  });
  assert.equal(parseBulkRegionManifest(tooManyShards), null);
});

test("guided bulk ignores provider detections outside the local region manifest", () => {
  const assigned = assignDetectionsToRegions([
    { id: "sw0001", item_type: "minifig", score: 0.95 },
    { id: "sw0002", item_type: "minifig", score: 0.90 },
  ], [{ regionId: "region-1", boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.7 } }]);

  assert.equal(assigned.length, 1);
  assert.equal(assigned[0]?.regionId, "region-1");
});
