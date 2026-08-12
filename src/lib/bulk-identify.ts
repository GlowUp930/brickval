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
export type GuidedBulkCrop = {
  boundingBox: NormalizedRegionBox;
  regions: BulkManifestRegion[];
};

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

export function parseBulkRegions(value: unknown): BulkManifestRegion[] | null {
  if (typeof value !== "string") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length > 10) return null;
  const seen = new Set<string>();
  const regions: BulkManifestRegion[] = [];
  for (const candidate of raw) {
    if (!isRecord(candidate) || typeof candidate.regionId !== "string") return null;
    const regionId = candidate.regionId.trim();
    const boundingBox = parseBox(candidate.boundingBox);
    if (!regionId || seen.has(regionId) || !boundingBox) return null;
    seen.add(regionId);
    regions.push({ regionId, boundingBox });
  }
  return regions;
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
    let bestOverlap = 0;
    const box = normalizeDetectionBox(detection);
    if (!box) continue;
    for (const index of available) {
      const overlap = intersectionOverUnion(box, regions[index].boundingBox);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = index;
      }
    }
    if (bestIndex === null || bestOverlap < 0.05) continue;
    available.delete(bestIndex);
    assigned.push({ ...detection, regionId: regions[bestIndex].regionId });
  }
  return assigned;
}

export function planGuidedBulkCrops(regions: BulkManifestRegion[]): GuidedBulkCrop[] {
  const validRegions = regions
    .filter((region) => parseBox(region.boundingBox) !== null)
    .slice(0, 10)
    .sort((a, b) => {
      const rowDelta = a.boundingBox.y - b.boundingBox.y;
      return Math.abs(rowDelta) > 0.12 ? rowDelta : a.boundingBox.x - b.boundingBox.x;
    });
  if (!validRegions.length) return fallbackQuadrants();

  const groupCount = Math.min(MAX_GUIDED_BULK_IMAGES, validRegions.length);
  const groupSize = Math.ceil(validRegions.length / groupCount);
  const groups = Array.from(
    { length: groupCount },
    (_, index) => validRegions.slice(index * groupSize, (index + 1) * groupSize)
  );
  return groups.filter((group) => group.length > 0).map((group) => ({
    boundingBox: paddedUnion(group.map((region) => region.boundingBox), 0.3),
    regions: group,
  }));
}

export function mergeBulkDetections(detections: NonSetDetection[]): NonSetDetection[] {
  const kept: NonSetDetection[] = [];
  for (const candidate of [...detections].sort((a, b) => {
    const guidedDelta = Number(Boolean(b.regionId)) - Number(Boolean(a.regionId));
    return guidedDelta !== 0 ? guidedDelta : b.score - a.score;
  })) {
    if (candidate.item_type !== "minifig") continue;
    const candidateBox = normalizeDetectionBox(candidate);
    const duplicate = kept.some((existing) => {
      if (candidate.regionId && existing.regionId && candidate.regionId === existing.regionId) return true;
      const existingBox = normalizeDetectionBox(existing);
      if (!candidateBox || !existingBox) return candidate.id === existing.id;
      return overlapOfSmaller(candidateBox, existingBox) >= 0.72;
    });
    if (!duplicate) kept.push(candidate);
  }
  return withStableFallbackRegionIds(kept).slice(0, 10);
}

export function unresolvedBulkRegions(
  regions: BulkManifestRegion[],
  detections: NonSetDetection[]
): BulkManifestRegion[] {
  const resolved = new Set(detections.map((detection) => detection.regionId).filter(Boolean));
  return regions.filter((region) => !resolved.has(region.regionId));
}

function withStableFallbackRegionIds(detections: NonSetDetection[]): NonSetDetection[] {
  const used = new Set(detections.map((detection) => detection.regionId).filter(Boolean));
  let next = 1;
  return detections.map((detection) => {
    if (detection.regionId) return detection;
    while (used.has(`region-${next}`)) next += 1;
    const regionId = `region-${next}`;
    used.add(regionId);
    next += 1;
    return { ...detection, regionId };
  });
}

function fallbackQuadrants(): GuidedBulkCrop[] {
  const boxes: NormalizedRegionBox[] = [
    { x: 0, y: 0, width: 0.58, height: 0.58 },
    { x: 0.42, y: 0, width: 0.58, height: 0.58 },
    { x: 0, y: 0.42, width: 0.58, height: 0.58 },
    { x: 0.42, y: 0.42, width: 0.58, height: 0.58 },
  ];
  return boxes.map((boundingBox) => ({ boundingBox, regions: [] }));
}

function paddedUnion(boxes: NormalizedRegionBox[], contextRatio: number): NormalizedRegionBox {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  const paddingX = (right - left) * contextRatio;
  const paddingY = (bottom - top) * contextRatio;
  const x = Math.max(0, left - paddingX);
  const y = Math.max(0, top - paddingY);
  return {
    x,
    y,
    width: Math.min(1, right + paddingX) - x,
    height: Math.min(1, bottom + paddingY) - y,
  };
}

function overlapOfSmaller(a: NormalizedRegionBox, b: NormalizedRegionBox): number {
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - Math.max(a.x, b.x)) * Math.max(0, bottom - Math.max(a.y, b.y));
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller > 0 ? intersection / smaller : 0;
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
