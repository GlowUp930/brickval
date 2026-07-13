import type { NormalizedBoundingBox } from "./auto-scan";

export const MAX_BULK_REGIONS = 40;
export const MAX_REGIONS_PER_SHARD = 10;

export interface BulkScanRegion {
  regionId: string;
  confidence: number;
  boundingBox: NormalizedBoundingBox;
}

export interface BulkScanShard {
  shardId: string;
  regionIds: string[];
  crop: NormalizedBoundingBox;
}

export interface BulkScanPlan {
  regions: BulkScanRegion[];
  shards: BulkScanShard[];
  overflowRegionIds: string[];
}

export function planBulkScan(input: BulkScanRegion[]): BulkScanPlan {
  const deduped = dedupePhysicalRegions(input);
  const ranked = [...deduped].sort((a, b) => regionQuality(b) - regionQuality(a));
  const selectedIds = new Set(ranked.slice(0, MAX_BULK_REGIONS).map((region) => region.regionId));
  const overflowRegionIds = ranked.slice(MAX_BULK_REGIONS).map((region) => region.regionId);
  const regions = deduped
    .filter((region) => selectedIds.has(region.regionId))
    .sort(spatialOrder);
  const shards: BulkScanShard[] = [];

  for (let index = 0; index < regions.length; index += MAX_REGIONS_PER_SHARD) {
    const shardRegions = regions.slice(index, index + MAX_REGIONS_PER_SHARD);
    shards.push({
      shardId: `shard-${shards.length + 1}`,
      regionIds: shardRegions.map((region) => region.regionId),
      crop: enclosingCrop(shardRegions),
    });
  }

  return { regions, shards, overflowRegionIds };
}

function dedupePhysicalRegions(regions: BulkScanRegion[]): BulkScanRegion[] {
  const byId = new Map<string, BulkScanRegion>();
  for (const region of regions) {
    if (!region.regionId.trim()) continue;
    const existing = byId.get(region.regionId);
    if (!existing || existing.confidence < region.confidence) byId.set(region.regionId, region);
  }
  return [...byId.values()];
}

function spatialOrder(a: BulkScanRegion, b: BulkScanRegion): number {
  const rowDelta = centerY(a) - centerY(b);
  return Math.abs(rowDelta) > 0.08 ? rowDelta : centerX(a) - centerX(b);
}

function centerX(region: BulkScanRegion): number {
  return region.boundingBox.x + region.boundingBox.width / 2;
}

function centerY(region: BulkScanRegion): number {
  return region.boundingBox.y + region.boundingBox.height / 2;
}

function regionQuality(region: BulkScanRegion): number {
  const distanceFromCenter = Math.hypot(centerX(region) - 0.5, centerY(region) - 0.5);
  return region.confidence - distanceFromCenter * 0.08;
}

function enclosingCrop(regions: BulkScanRegion[]): NormalizedBoundingBox {
  const padding = 0.035;
  const left = Math.max(0, Math.min(...regions.map((region) => region.boundingBox.x)) - padding);
  const top = Math.max(0, Math.min(...regions.map((region) => region.boundingBox.y)) - padding);
  const right = Math.min(
    1,
    Math.max(...regions.map((region) => region.boundingBox.x + region.boundingBox.width)) + padding
  );
  const bottom = Math.min(
    1,
    Math.max(...regions.map((region) => region.boundingBox.y + region.boundingBox.height)) + padding
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
}
