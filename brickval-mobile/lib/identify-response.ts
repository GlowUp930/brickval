import type { IdentificationCandidate, IdentificationDetection, ScanMode } from "./api";

type BrickognizeCandidateType = "minifig" | "part";
const MINIFIG_DETECTION_LIMIT = 20;
const PART_DETECTION_LIMIT = 4;

type BrickognizeRawCandidate = {
  id?: unknown;
  type?: unknown;
  score?: unknown;
  external_items?: Array<{ external_id?: unknown }>;
};

type BrickognizeRawBox = {
  left?: unknown;
  top?: unknown;
  upper?: unknown;
  right?: unknown;
  bottom?: unknown;
  lower?: unknown;
  imageWidth?: unknown;
  imageHeight?: unknown;
  image_width?: unknown;
  image_height?: unknown;
};

type BrickognizeDetectedItem = {
  candidate_items?: BrickognizeRawCandidate[];
  bounding_boxes?: BrickognizeRawBox[];
};

export type IdentificationResponseShape = {
  set_number?: string | null;
  confidence?: number | null;
  candidates?: IdentificationCandidate[];
  detections?: IdentificationDetection[];
  detected_items?: BrickognizeDetectedItem[];
};

export type NormalizedBrickognizeDetections = {
  minifigs: IdentificationDetection[];
  parts: IdentificationDetection[];
};

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeType(value: unknown): BrickognizeCandidateType | null {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  if (["fig", "figure", "minifig", "minifigure"].includes(type)) return "minifig";
  if (["part", "piece"].includes(type)) return "part";
  return null;
}

function normalizeCandidateId(candidate: BrickognizeRawCandidate): string | null {
  const externalId = candidate.external_items?.find(
    (item) => typeof item.external_id === "string" && item.external_id.trim().length > 0
  )?.external_id;
  const rawId = typeof externalId === "string" ? externalId : candidate.id;
  if (typeof rawId !== "string") return null;

  const id = rawId.trim().replace(/^fig-/i, "");
  return id.length > 0 ? id : null;
}

function normalizeBoundingBox(raw?: BrickognizeRawBox): IdentificationDetection["bounding_box"] | undefined {
  if (!raw) return undefined;
  const left = toFiniteNumber(raw.left);
  const top = toFiniteNumber(raw.top ?? raw.upper);
  const right = toFiniteNumber(raw.right);
  const bottom = toFiniteNumber(raw.bottom ?? raw.lower);
  const imageWidth = toFiniteNumber(raw.imageWidth ?? raw.image_width);
  const imageHeight = toFiniteNumber(raw.imageHeight ?? raw.image_height);

  if (
    left === null ||
    top === null ||
    right === null ||
    bottom === null ||
    imageWidth === null ||
    imageHeight === null ||
    right <= left ||
    bottom <= top ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return undefined;
  }

  return { left, top, right, bottom, imageWidth, imageHeight };
}

function normalizeCandidate(
  candidate: BrickognizeRawCandidate,
  boundingBox?: IdentificationDetection["bounding_box"]
): IdentificationDetection | null {
  const itemType = normalizeType(candidate.type);
  const id = normalizeCandidateId(candidate);
  const score = toFiniteNumber(candidate.score);

  if (!itemType || !id || score === null) return null;
  return {
    id,
    item_type: itemType,
    score,
    ...(boundingBox ? { bounding_box: boundingBox } : {}),
  };
}

function sortDetections(detections: IdentificationDetection[]) {
  return detections.sort((a, b) => b.score - a.score);
}

function dedupeDetections(detections: IdentificationDetection[]) {
  const byKey = new Map<string, IdentificationDetection>();

  for (const detection of detections) {
    const key = `${detection.item_type}:${detection.id.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing || detection.score > existing.score) {
      byKey.set(key, detection);
    }
  }

  return sortDetections([...byKey.values()]);
}

export function normalizeBrickognizeDetections(
  candidates: BrickognizeRawCandidate[],
  boundingBox?: IdentificationDetection["bounding_box"]
): NormalizedBrickognizeDetections {
  const normalized = dedupeDetections(
    candidates
      .map((candidate) => normalizeCandidate(candidate, boundingBox))
      .filter((candidate): candidate is IdentificationDetection => candidate !== null)
  );

  return {
    minifigs: normalized.filter((item) => item.item_type === "minifig").slice(0, MINIFIG_DETECTION_LIMIT),
    parts: normalized.filter((item) => item.item_type === "part").slice(0, PART_DETECTION_LIMIT),
  };
}

export function normalizeBrickognizeSearchResponse(
  data: Pick<IdentificationResponseShape, "detected_items">,
  options: { bestPerDetectedItem?: boolean } = {}
): NormalizedBrickognizeDetections {
  const detectedItems = Array.isArray(data.detected_items) ? data.detected_items : [];

  if (options.bestPerDetectedItem) {
    const bestDetections = detectedItems
      .map((item) => {
        const boundingBox = normalizeBoundingBox(item.bounding_boxes?.[0]);
        const normalized = normalizeBrickognizeDetections(item.candidate_items ?? [], boundingBox);
        return normalized.minifigs[0] ?? normalized.parts[0] ?? null;
      })
      .filter((candidate): candidate is IdentificationDetection => candidate !== null);

    return {
      minifigs: bestDetections.filter((item) => item.item_type === "minifig").slice(0, MINIFIG_DETECTION_LIMIT),
      parts: bestDetections.filter((item) => item.item_type === "part").slice(0, PART_DETECTION_LIMIT),
    };
  }

  const flattened = detectedItems.flatMap((item) => {
    const boundingBox = normalizeBoundingBox(item.bounding_boxes?.[0]);
    return (item.candidate_items ?? []).map((candidate) => normalizeCandidate(candidate, boundingBox));
  }).filter((candidate): candidate is IdentificationDetection => candidate !== null);

  const normalized = dedupeDetections(flattened);
  return {
    minifigs: normalized.filter((item) => item.item_type === "minifig").slice(0, MINIFIG_DETECTION_LIMIT),
    parts: normalized.filter((item) => item.item_type === "part").slice(0, PART_DETECTION_LIMIT),
  };
}

export function normalizeIdentificationDetections(
  mode: ScanMode,
  data: IdentificationResponseShape
): IdentificationDetection[] {
  if (mode !== "minifig") {
    return (data.detections ?? []).slice(0, 8);
  }

  if (data.detections?.length) {
    return data.detections.slice(0, MINIFIG_DETECTION_LIMIT);
  }

  if (data.detected_items?.length) {
    const normalized = normalizeBrickognizeSearchResponse(data, { bestPerDetectedItem: true });
    const detections = [...normalized.minifigs, ...normalized.parts];
    if (detections.length > 0) return detections;
  }

  const candidateDetections = (data.candidates ?? []).map((candidate) => ({
    id: candidate.id,
    item_type: "minifig" as const,
    score: candidate.score,
  }));

  if (candidateDetections.length > 0) {
    return candidateDetections.slice(0, MINIFIG_DETECTION_LIMIT);
  }

  if (data.set_number) {
    return [
      {
        id: data.set_number,
        item_type: "minifig",
        score: typeof data.confidence === "number" ? data.confidence : 0,
      },
    ];
  }

  return [];
}
