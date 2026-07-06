export type BrickognizeRawItem = {
  id?: string;
  external_id?: string;
  score?: number;
  type?: string;
  bounding_box?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    imageWidth: number;
    imageHeight: number;
  };
};

export type BrickognizeSearchCandidate = {
  id?: string;
  type?: string;
  score?: number;
  external_items?: Array<{
    external_id?: string;
    external_type?: string;
  }>;
};

export type BrickognizeSearchDetectedItem = {
  bounding_boxes?: Array<{
    left?: number;
    upper?: number;
    right?: number;
    lower?: number;
    image_width?: number;
    image_height?: number;
    score?: number;
  }>;
  candidate_items?: BrickognizeSearchCandidate[];
};

export type BrickognizeSearchResponse = {
  detected_items?: BrickognizeSearchDetectedItem[];
};

export type BrickognizeCropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const BULK_SCAN_CROP_BUDGET = 8;

export type BrickognizeSearchAnalysis = {
  detections: NormalizedDetections;
  topScore: number | null;
  topBox: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    imageWidth: number;
    imageHeight: number;
  } | null;
};

export type NonSetDetection = {
  id: string;
  item_type: "minifig" | "part";
  score: number;
  bounding_box?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    imageWidth: number;
    imageHeight: number;
  };
};

export type NormalizedDetections = {
  minifigs: NonSetDetection[];
  parts: NonSetDetection[];
  all: NonSetDetection[];
};

function normalizeItemType(value?: string): "minifig" | "part" | null {
  const lowered = (value ?? "").trim().toLowerCase();
  if (lowered === "fig" || lowered === "minifig") return "minifig";
  if (lowered === "part") return "part";
  return null;
}

function normalizeId(value?: string): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function normalizeBrickognizeDetections(items: BrickognizeRawItem[]): NormalizedDetections {
  const deduped = new Map<string, NonSetDetection>();

  for (const item of items) {
    const itemType = normalizeItemType(item.type);
    const id = normalizeId(item.id ?? item.external_id);
    const score = Number(item.score ?? 0);

    if (!itemType || !id || !Number.isFinite(score) || score <= 0) continue;

    const detection: NonSetDetection = item.bounding_box
      ? { id, item_type: itemType, score, bounding_box: item.bounding_box }
      : { id, item_type: itemType, score };

    const key = `${itemType}:${id}`;
    const existing = deduped.get(key);
    if (!existing || existing.score < score) {
      deduped.set(key, detection);
    }
  }

  const sorted = [...deduped.values()].sort((a, b) => b.score - a.score);
  const minifigs = sorted.filter((item) => item.item_type === "minifig").slice(0, 12);
  const parts = sorted.filter((item) => item.item_type === "part").slice(0, 4);

  return {
    minifigs,
    parts,
    all: [...minifigs, ...parts],
  };
}

export function normalizeBrickognizeSearchResponse(response: BrickognizeSearchResponse): NormalizedDetections {
  return analyzeBrickognizeSearchResponse(response).detections;
}

export function analyzeBrickognizeSearchResponse(response: BrickognizeSearchResponse): BrickognizeSearchAnalysis {
  const items: BrickognizeRawItem[] = [];
  let topScore: number | null = null;
  let topBox: BrickognizeSearchAnalysis["topBox"] | null = null;

  for (const detectedItem of response.detected_items ?? []) {
    const box = detectedItem.bounding_boxes?.[0];
    const boxScore = Number(box?.score ?? 0);
    const normalizedBox = (box && Number.isFinite(boxScore) && boxScore > 0) ? {
      imageWidth: Number(box.image_width ?? 0),
      imageHeight: Number(box.image_height ?? 0),
      left: Number(box.left ?? 0),
      top: Number(box.upper ?? 0),
      right: Number(box.right ?? 0),
      bottom: Number(box.lower ?? 0),
    } : null;

    if (normalizedBox && (topScore === null || boxScore > topScore)) {
      topScore = boxScore;
      topBox = {
        left: normalizedBox.left,
        top: normalizedBox.top,
        right: normalizedBox.right,
        bottom: normalizedBox.bottom,
        imageWidth: normalizedBox.imageWidth,
        imageHeight: normalizedBox.imageHeight,
      };
    }

    for (const candidate of detectedItem.candidate_items ?? []) {
      const item: BrickognizeRawItem = {
        id: candidate.external_items?.[0]?.external_id ?? candidate.id,
        type: candidate.type,
        score: candidate.score,
      };
      if (normalizedBox && normalizedBox.imageWidth > 0 && normalizedBox.imageHeight > 0) {
        item.bounding_box = {
          left: normalizedBox.left,
          top: normalizedBox.top,
          right: normalizedBox.right,
          bottom: normalizedBox.bottom,
          imageWidth: normalizedBox.imageWidth,
          imageHeight: normalizedBox.imageHeight,
        };
      }
      items.push(item);
    }
  }

  return {
    detections: normalizeBrickognizeDetections(items),
    topScore,
    topBox,
  };
}

function buildComplementaryCrop(
  imageWidth: number,
  imageHeight: number,
  focus: { left: number; top: number; right: number; bottom: number } | null,
  primarySplit: "left" | "right" | "top" | "bottom"
): BrickognizeCropRect {
  const centerX = focus ? ((focus.left + focus.right) / 2) / imageWidth : 0.5;
  const centerY = focus ? ((focus.top + focus.bottom) / 2) / imageHeight : 0.5;

  if (primarySplit === "left" || primarySplit === "right") {
    const left = primarySplit === "left" ? 0 : Math.max(0, Math.floor(imageWidth * 0.42));
    const width = primarySplit === "left" ? Math.max(1, Math.ceil(imageWidth * 0.58)) : Math.max(1, imageWidth - left);
    const useTopBand = centerY > 0.5;
    const top = useTopBand ? 0 : Math.max(0, Math.floor(imageHeight * 0.42));
    const height = useTopBand ? Math.max(1, Math.ceil(imageHeight * 0.58)) : Math.max(1, imageHeight - top);
    return { left, top, width, height };
  }

  const top = primarySplit === "top" ? 0 : Math.max(0, Math.floor(imageHeight * 0.42));
  const height = primarySplit === "top" ? Math.max(1, Math.ceil(imageHeight * 0.58)) : Math.max(1, imageHeight - top);
  const useLeftBand = centerX > 0.5;
  const left = useLeftBand ? 0 : Math.max(0, Math.floor(imageWidth * 0.42));
  const width = useLeftBand ? Math.max(1, Math.ceil(imageWidth * 0.58)) : Math.max(1, imageWidth - left);
  return { left, top, width, height };
}

function buildQuadrantCrop(
  imageWidth: number,
  imageHeight: number,
  horizontal: "left" | "right",
  vertical: "top" | "bottom"
): BrickognizeCropRect {
  const left = horizontal === "left" ? 0 : Math.max(0, Math.floor(imageWidth * 0.42));
  const top = vertical === "top" ? 0 : Math.max(0, Math.floor(imageHeight * 0.42));
  const width = horizontal === "left" ? Math.max(1, Math.ceil(imageWidth * 0.58)) : Math.max(1, imageWidth - left);
  const height = vertical === "top" ? Math.max(1, Math.ceil(imageHeight * 0.58)) : Math.max(1, imageHeight - top);
  return {
    left,
    top,
    width,
    height,
  };
}

function buildHalfCrop(
  imageWidth: number,
  imageHeight: number,
  direction: "left" | "right" | "top" | "bottom"
): BrickognizeCropRect {
  if (direction === "left") {
    return { left: 0, top: 0, width: Math.max(1, Math.ceil(imageWidth * 0.58)), height: imageHeight };
  }
  if (direction === "right") {
    const left = Math.max(0, Math.floor(imageWidth * 0.42));
    return { left, top: 0, width: Math.max(1, imageWidth - left), height: imageHeight };
  }
  if (direction === "top") {
    return { left: 0, top: 0, width: imageWidth, height: Math.max(1, Math.ceil(imageHeight * 0.58)) };
  }
  const top = Math.max(0, Math.floor(imageHeight * 0.42));
  return { left: 0, top, width: imageWidth, height: Math.max(1, imageHeight - top) };
}

function chooseDominantSplit(
  imageWidth: number,
  imageHeight: number,
  box: BrickognizeSearchAnalysis["topBox"]
): "left" | "right" | "top" | "bottom" {
  if (!box || box.imageWidth <= 0 || box.imageHeight <= 0) {
    return imageWidth >= imageHeight ? "left" : "top";
  }

  const boxCenterX = ((box.left + box.right) / 2) / box.imageWidth;
  const boxCenterY = ((box.top + box.bottom) / 2) / box.imageHeight;
  const deltaX = boxCenterX - 0.5;
  const deltaY = boxCenterY - 0.5;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX < 0 ? "right" : "left";
  }

  return deltaY < 0 ? "bottom" : "top";
}

export function buildBrickognizeRecoveryCrops(
  response: BrickognizeSearchResponse,
  imageWidth: number,
  imageHeight: number
): BrickognizeCropRect[] {
  const analysis = analyzeBrickognizeSearchResponse(response);
  if (analysis.detections.all.length >= 2) return [];

  const normalizedWidth = Math.max(1, Math.round(imageWidth));
  const normalizedHeight = Math.max(1, Math.round(imageHeight));
  const hasOneDetection = analysis.detections.all.length === 1;
  const splitDirection = chooseDominantSplit(normalizedWidth, normalizedHeight, analysis.topBox);

  if (!hasOneDetection) {
    if (splitDirection === "left" || splitDirection === "right") {
      return [
        buildHalfCrop(normalizedWidth, normalizedHeight, "left"),
        buildHalfCrop(normalizedWidth, normalizedHeight, "right"),
      ];
    }
    return [
      buildHalfCrop(normalizedWidth, normalizedHeight, "top"),
      buildHalfCrop(normalizedWidth, normalizedHeight, "bottom"),
    ];
  }

  const focus = analysis.topBox;
  if (!focus || focus.imageWidth <= 0 || focus.imageHeight <= 0) {
    return [];
  }

  const cropWidth = Math.max(1, focus.right - focus.left);
  const cropHeight = Math.max(1, focus.bottom - focus.top);
  const imageArea = Math.max(1, focus.imageWidth * focus.imageHeight);
  const areaRatio = (cropWidth * cropHeight) / imageArea;
  const centerX = ((focus.left + focus.right) / 2) / focus.imageWidth;
  const centerY = ((focus.top + focus.bottom) / 2) / focus.imageHeight;
  const offsetX = centerX - 0.5;
  const offsetY = centerY - 0.5;
  const maxOffset = Math.max(Math.abs(offsetX), Math.abs(offsetY));
  const topScore = analysis.topScore ?? analysis.detections.all[0]?.score ?? 0;
  const shouldRetry =
    topScore < 0.88 ||
    areaRatio < 0.24 ||
    maxOffset > 0.14 ||
    centerX < 0.18 ||
    centerX > 0.82 ||
    centerY < 0.18 ||
    centerY > 0.82;

  if (!shouldRetry && areaRatio >= 0.3) {
    return [];
  }

  const shouldUseGrid = topScore < 0.86 || areaRatio < 0.15 || maxOffset > 0.18;
  if (shouldUseGrid) {
    return [
      buildQuadrantCrop(normalizedWidth, normalizedHeight, "left", "top"),
      buildQuadrantCrop(normalizedWidth, normalizedHeight, "right", "top"),
      buildQuadrantCrop(normalizedWidth, normalizedHeight, "left", "bottom"),
      buildQuadrantCrop(normalizedWidth, normalizedHeight, "right", "bottom"),
    ];
  }

  const primarySplit =
    Math.abs(offsetX) >= Math.abs(offsetY)
      ? offsetX < 0
        ? "right"
        : "left"
      : offsetY < 0
        ? "bottom"
        : "top";

  return [
    buildHalfCrop(normalizedWidth, normalizedHeight, primarySplit),
    buildComplementaryCrop(normalizedWidth, normalizedHeight, focus, primarySplit),
  ];
}

function buildOverlappingTileCrops(imageWidth: number, imageHeight: number): BrickognizeCropRect[] {
  const tileWidth = Math.max(1, Math.ceil(imageWidth * 0.5));
  const tileHeight = Math.max(1, Math.ceil(imageHeight * 0.5));
  const leftPositions = [0, Math.max(0, Math.floor(imageWidth * 0.25)), Math.max(0, imageWidth - tileWidth)];
  const topPositions = [0, Math.max(0, Math.floor(imageHeight * 0.25)), Math.max(0, imageHeight - tileHeight)];
  const crops: BrickognizeCropRect[] = [];

  for (const top of topPositions) {
    for (const left of leftPositions) {
      crops.push({
        left,
        top,
        width: Math.min(tileWidth, imageWidth - left),
        height: Math.min(tileHeight, imageHeight - top),
      });
    }
  }

  return crops;
}

function dedupeCrops(crops: BrickognizeCropRect[]): BrickognizeCropRect[] {
  const seen = new Set<string>();
  const deduped: BrickognizeCropRect[] = [];

  for (const crop of crops) {
    const key = `${crop.left}:${crop.top}:${crop.width}:${crop.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(crop);
  }

  return deduped;
}

export function buildBrickognizeBulkScanCrops(
  response: BrickognizeSearchResponse,
  imageWidth: number,
  imageHeight: number
): BrickognizeCropRect[] {
  const analysis = analyzeBrickognizeSearchResponse(response);
  if (analysis.detections.minifigs.length >= 12) return [];

  const normalizedWidth = Math.max(1, Math.round(imageWidth));
  const normalizedHeight = Math.max(1, Math.round(imageHeight));
  const recoveryCrops = buildBrickognizeRecoveryCrops(response, normalizedWidth, normalizedHeight);
  const tiledCrops = buildOverlappingTileCrops(normalizedWidth, normalizedHeight);

  return dedupeCrops([...recoveryCrops, ...tiledCrops]).slice(0, BULK_SCAN_CROP_BUDGET);
}
