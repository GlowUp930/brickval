import assert from "node:assert/strict";
import test from "node:test";

import { planBulkScan } from "../lib/bulk-scan-plan";

test("bulk planning preserves every physical region even when figure identities match", () => {
  const plan = planBulkScan([
    { regionId: "region-1", confidence: 0.94, boundingBox: { x: 0.1, y: 0.2, width: 0.2, height: 0.4 } },
    { regionId: "region-2", confidence: 0.91, boundingBox: { x: 0.6, y: 0.2, width: 0.2, height: 0.4 } },
  ]);

  assert.deepEqual(plan.regions.map((region) => region.regionId), ["region-1", "region-2"]);
  assert.deepEqual(plan.shards[0]?.regionIds, ["region-1", "region-2"]);
});

test("bulk planning creates at most four ten-region shards and marks overflow", () => {
  const regions = Array.from({ length: 43 }, (_, index) => ({
    regionId: `region-${index + 1}`,
    confidence: 0.99 - index * 0.001,
    boundingBox: {
      x: (index % 8) / 8,
      y: Math.floor(index / 8) / 6,
      width: 0.08,
      height: 0.12,
    },
  }));
  const plan = planBulkScan(regions);

  assert.equal(plan.regions.length, 40);
  assert.equal(plan.shards.length, 4);
  assert.equal(plan.shards.every((shard) => shard.regionIds.length <= 10), true);
  assert.equal(plan.overflowRegionIds.length, 3);
});
