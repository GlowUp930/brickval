import assert from "node:assert/strict";
import test from "node:test";

import {
  assignDetectionsToRegions,
  mergeBulkDetections,
  mergeBulkRegionProposals,
  planAccuracyBulkRecoveryCrops,
  planPhotoLibraryFallbackCrops,
  planPerRegionRecognitionCrops,
  parseBulkRegionManifest,
  parseBulkRegions,
  planGuidedBulkCrops,
  unresolvedBulkRegions,
} from "../src/lib/bulk-identify";

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

test("guided bulk manifest rejects more than six images", () => {
  const tooManyShards = JSON.stringify({
    shards: Array.from({ length: 7 }, (_, index) => ({ shardId: `s${index}`, imageIndex: index, regions: [] })),
  });
  assert.equal(parseBulkRegionManifest(tooManyShards), null);
});

test("guided bulk manifest accepts sixty regions", () => {
  const manifest = JSON.stringify({
    shards: Array.from({ length: 6 }, (_, imageIndex) => ({
      shardId: `shard-${imageIndex + 1}`,
      imageIndex,
      regions: Array.from({ length: 10 }, (_, regionIndex) => ({
        regionId: `region-${imageIndex * 10 + regionIndex + 1}`,
        boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
      })),
    })),
  });

  assert.equal(
    parseBulkRegionManifest(manifest)?.shards.flatMap((shard) => shard.regions).length,
    60,
  );
});

test("guided bulk ignores provider detections without usable boxes", () => {
  const assigned = assignDetectionsToRegions([
    { id: "sw0001", item_type: "minifig", score: 0.95 },
    { id: "sw0002", item_type: "minifig", score: 0.90 },
  ], [{ regionId: "region-1", boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.7 } }]);

  assert.equal(assigned.length, 0);
});

test("guided bulk ignores detections that do not overlap a local region", () => {
  const assigned = assignDetectionsToRegions([
    {
      id: "sw0001",
      item_type: "minifig",
      score: 0.95,
      bounding_box: { left: 700, top: 700, right: 900, bottom: 900, imageWidth: 1000, imageHeight: 1000 },
    },
  ], [{ regionId: "region-1", boundingBox: { x: 0.05, y: 0.05, width: 0.25, height: 0.5 } }]);

  assert.equal(assigned.length, 0);
});

test("guided crop plan covers ten regions with no more than four crops", () => {
  const regions = Array.from({ length: 10 }, (_, index) => ({
    regionId: `region-${index + 1}`,
    boundingBox: {
      x: (index % 5) * 0.18 + 0.02,
      y: Math.floor(index / 5) * 0.45 + 0.04,
      width: 0.12,
      height: 0.34,
    },
  }));

  const crops = planGuidedBulkCrops(regions);

  assert.ok(crops.length <= 4);
  assert.deepEqual(
    new Set(crops.flatMap((crop) => crop.regions.map((region) => region.regionId))),
    new Set(regions.map((region) => region.regionId))
  );
});

test("guided crop plan groups up to five figures per provider request", () => {
  const regions = Array.from({ length: 3 }, (_, index) => ({
    regionId: `region-${index + 1}`,
    boundingBox: { x: index * 0.3 + 0.04, y: 0.2, width: 0.18, height: 0.55 },
  }));

  const crops = planGuidedBulkCrops(regions);

  assert.equal(crops.length, 1);
  assert.ok(crops.every((crop) => crop.regions.length <= 5));
});

test("bulk crop plan covers sixty regions in at most twelve groups", () => {
  const regions = Array.from({ length: 60 }, (_, index) => ({
    regionId: `region-${index + 1}`,
    boundingBox: {
      x: (index % 10) * 0.09,
      y: Math.floor(index / 10) * 0.14,
      width: 0.07,
      height: 0.12,
    },
  }));

  const crops = planGuidedBulkCrops(regions, 60);

  assert.ok(crops.length <= 12);
  assert.ok(crops.every((crop) => crop.regions.length <= 5));
  assert.equal(crops.flatMap((crop) => crop.regions).length, 60);
});

test("per-region recognition creates one isolated crop for every physical figure", () => {
  const regions = Array.from({ length: 24 }, (_, index) => ({
    regionId: `figure-${index + 1}`,
    boundingBox: {
      x: (index % 6) * 0.15 + 0.02,
      y: Math.floor(index / 6) * 0.23 + 0.03,
      width: 0.10,
      height: 0.18,
    },
  }));

  const crops = planPerRegionRecognitionCrops(regions, 60);

  assert.equal(crops.length, 24);
  assert.ok(crops.every((crop) => crop.regions.length === 1));
  assert.deepEqual(
    crops.map((crop) => crop.regions[0]?.regionId),
    regions.map((region) => region.regionId),
  );
});

test("bulk manifests accept sixty regions and reject a sixty-first region", () => {
  const value = JSON.stringify(Array.from({ length: 60 }, (_, index) => ({
    regionId: `region-${index + 1}`,
    boundingBox: { x: (index % 10) * 0.09, y: Math.floor(index / 10) * 0.14, width: 0.07, height: 0.12 },
  })));
  const tooMany = JSON.stringify([...JSON.parse(value) as unknown[], {
    regionId: "region-61",
    boundingBox: { x: 0.1, y: 0.9, width: 0.07, height: 0.08 },
  }]);

  assert.equal(parseBulkRegions(value, 60)?.length, 60);
  assert.equal(parseBulkRegions(tooMany, 60), null);
});

test("photo-library fallback keeps small figures covered across the image", () => {
  const crops = planPhotoLibraryFallbackCrops();

  assert.equal(crops.length, 8);
  assert.ok(crops.every((crop) => crop.width > 0 && crop.height > 0));
  assert.ok(crops.some((crop) => crop.x > 0));
  assert.ok(crops.some((crop) => crop.y > 0));
});

test("cloud proposals augment local regions without collapsing separate figures", () => {
  const merged = mergeBulkRegionProposals([
    { regionId: "local-1", boundingBox: { x: 0.05, y: 0.1, width: 0.12, height: 0.24 } },
  ], [
    { x: 0.052, y: 0.102, width: 0.12, height: 0.24 },
    { x: 0.45, y: 0.1, width: 0.12, height: 0.24 },
    { x: 0.72, y: 0.1, width: 0.12, height: 0.24 },
  ], 60);

  assert.equal(merged.length, 3);
  assert.equal(merged[0]?.regionId, "local-1");
  assert.deepEqual(merged.map((region) => region.boundingBox.x), [0.05, 0.45, 0.72]);
});

test("bulk merge collapses duplicate provider responses for one physical region", () => {
  const box = { left: 100, top: 100, right: 300, bottom: 500, imageWidth: 1000, imageHeight: 1000 };
  const merged = mergeBulkDetections([
    { id: "sw0001", item_type: "minifig", score: 0.86, regionId: "local-1", bounding_box: box },
    { id: "sw0001", item_type: "minifig", score: 0.94, regionId: "local-1", bounding_box: box },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.score, 0.94);
});

test("bulk merge preserves spatially separate copies of the same minifigure", () => {
  const merged = mergeBulkDetections([
    {
      id: "sw0001",
      item_type: "minifig",
      score: 0.94,
      bounding_box: { left: 50, top: 100, right: 250, bottom: 500, imageWidth: 1000, imageHeight: 1000 },
    },
    {
      id: "sw0001",
      item_type: "minifig",
      score: 0.92,
      bounding_box: { left: 650, top: 100, right: 850, bottom: 500, imageWidth: 1000, imageHeight: 1000 },
    },
  ]);

  assert.equal(merged.length, 2);
});

test("isolated guided identity outranks a conflicting full-image guess", () => {
  const box = { left: 100, top: 100, right: 300, bottom: 500, imageWidth: 1000, imageHeight: 1000 };
  const merged = mergeBulkDetections([
    { id: "wrong-id", item_type: "minifig", score: 0.98, bounding_box: box },
    { id: "correct-id", item_type: "minifig", score: 0.91, regionId: "local-1", bounding_box: box },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, "correct-id");
});

test("targeted recovery includes only unresolved local regions", () => {
  const regions = [
    { regionId: "left", boundingBox: { x: 0.05, y: 0.1, width: 0.3, height: 0.7 } },
    { regionId: "right", boundingBox: { x: 0.6, y: 0.1, width: 0.3, height: 0.7 } },
  ];

  const unresolved = unresolvedBulkRegions(regions, [
    { id: "sw0001", item_type: "minifig", score: 0.94, regionId: "left" },
  ]);

  assert.deepEqual(unresolved.map((region) => region.regionId), ["right"]);
});

test("accuracy recovery adds broad coverage when local detection misses figures", () => {
  const crops = planAccuracyBulkRecoveryCrops();

  assert.equal(crops.length, 6);
  assert.ok(crops.every((crop) => crop.width > 0 && crop.height > 0));
  assert.ok(crops.some((crop) => crop.y > 0));
});
