import type { NonSetDetection } from "./identify-nonset";

export const MAX_GUIDED_BULK_IMAGES = 4;
export const MAX_GUIDED_BULK_REGIONS = 40;
export const MAX_GUIDED_REGIONS_PER_IMAGE = 10;
export const MAX_GUIDED_BULK_BYTES = Math.floor(3.5 * 1024 * 1024);

export type NormalizedRegionBox = { x: number; y: number; width: number; height: number };
export type BulkManifestRegion = { regionId: string; boundingBox: NormalizedRegionBox };
export type BulkManifestShard = {
  shardId: string;
  imageIndex: number;
  regions: BulkManifestRegion[];
};
export type BulkRegionManifest = { shards: BulkManifestShard[] };

export function parseBulkRegionManifest(value: unknown): BulkRegionManifest | null {
  if (typeof value !== "string") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!isRecord(raw) || !Array.isArray(raw.shards) || raw.shards.length < 1 || raw.shards.length > MAX_GUIDED_BULK_IMAGES) {
    return null;
  }
  const seenRegionIds = new Set<string>();
  const seenImageIndexes = new Set<number>();
  const shards: BulkManifestShard[] = [];
  let regionCount = 0;

  for (const candidate of raw.shards) {
    if (!isRecord(candidate) || typeof candidate.shardId !== "string" || !Number.isInteger(candidate.imageIndex)) return null;
    const imageIndex = Number(candidate.imageIndex);
    if (imageIndex < 0 || imageIndex >= MAX_GUIDED_BULK_IMAGES || seenImageIndexes.has(imageIndex)) return null;
    if (!Array.isArray(candidate.regions) || candidate.regions.length < 1 || candidate.regions.length > MAX_GUIDED_REGIONS_PER_IMAGE) return null;
    seenImageIndexes.add(imageIndex);
    const regions: BulkManifestRegion[] = [];
    for (const rawRegion of candidate.regions) {
      if (!isRecord(rawRegion) || typeof rawRegion.regionId !== "string" || seenRegionIds.has(rawRegion.regionId)) return null;
      const boundingBox = parseBox(rawRegion.boundingBox);
      if (!rawRegion.regionId.trim() || !boundingBox) return null;
      seenRegionIds.add(rawRegion.regionId);
      regions.push({ regionId: rawRegion.regionId, boundingBox });
      regionCount += 1;
      if (regionCount > MAX_GUIDED_BULK_REGIONS) return null;
    }
    shards.push({ shardId: candidate.shardId, imageIndex, regions });
  }
  return { shards };
}

export function assignDetectionsToRegions(
  detections: NonSetDetection[],
  regions: BulkManifestRegion[]
): NonSetDetection[] {
  const available = new Set(regions.map((_, index) => index));
  const assigned: NonSetDetection[] = [];
  for (const detection of detections) {
    if (available.size === 0) break;
    let bestIndex: number | null = null;
    let bestOverlap = -1;
    const box = normalizeDetectionBox(detection);
    for (const index of available) {
      const overlap = box ? intersectionOverUnion(box, regions[index].boundingBox) : 0;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = index;
      }
    }
    if (bestIndex === null) continue;
    available.delete(bestIndex);
    assigned.push({ ...detection, regionId: regions[bestIndex].regionId });
  }
  return assigned;
}

function normalizeDetectionBox(detection: NonSetDetection): NormalizedRegionBox | null {
  const box = detection.bounding_box;
  if (!box || box.imageWidth <= 0 || box.imageHeight <= 0) return null;
  return {
    x: box.left / box.imageWidth,
    y: box.top / box.imageHeight,
    width: (box.right - box.left) / box.imageWidth,
    height: (box.bottom - box.top) / box.imageHeight,
  };
}

function intersectionOverUnion(a: NormalizedRegionBox, b: NormalizedRegionBox): number {
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - Math.max(a.x, b.x)) * Math.max(0, bottom - Math.max(a.y, b.y));
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function parseBox(value: unknown): NormalizedRegionBox | null {
  if (!isRecord(value)) return null;
  const box = {
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
  };
  if (Object.values(box).some((part) => !Number.isFinite(part))) return null;
  if (box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0) return null;
  if (box.x + box.width > 1.001 || box.y + box.height > 1.001) return null;
  return box;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
