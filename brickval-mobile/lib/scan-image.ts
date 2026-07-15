const MAX_SCAN_PIXELS = 1_150_000;
const MAX_SCAN_BYTES = 2_000_000;
const MAX_SCAN_EDGE = 1024;
const DETECTION_SAMPLE_EDGE = 416;

export type DetectionSampleMode = "single" | "bulk";

export interface DetectionSamplePlan {
  sourceWidth: number;
  sourceHeight: number;
  crop: { originX: number; originY: number; width: number; height: number } | null;
  resize: { width: number | null; height: number | null };
}

export function getScanImageResize(width: number, height: number, size: number) {
  if (width * height <= MAX_SCAN_PIXELS && size <= MAX_SCAN_BYTES) return null;
  return width >= height
    ? { width: Math.min(width, MAX_SCAN_EDGE), height: null }
    : { width: null, height: Math.min(height, MAX_SCAN_EDGE) };
}

export function getDetectionSampleResize(width: number, height: number) {
  return width >= height
    ? { width: DETECTION_SAMPLE_EDGE, height: null }
    : { width: null, height: DETECTION_SAMPLE_EDGE };
}

export function getDetectionSamplePlan(
  width: number,
  height: number,
  mode: DetectionSampleMode
): DetectionSamplePlan {
  if (mode === "bulk") {
    return {
      sourceWidth: width,
      sourceHeight: height,
      crop: null,
      resize: getDetectionSampleResize(width, height),
    };
  }

  const edge = Math.min(width, height);
  return {
    sourceWidth: width,
    sourceHeight: height,
    crop: {
      originX: Math.round((width - edge) / 2),
      originY: Math.round((height - edge) / 2),
      width: edge,
      height: edge,
    },
    resize: { width: DETECTION_SAMPLE_EDGE, height: DETECTION_SAMPLE_EDGE },
  };
}

export function mapDetectionSampleBoundingBox(
  boundingBox: { x: number; y: number; width: number; height: number },
  plan: DetectionSamplePlan
) {
  if (!plan.crop) return boundingBox;
  return {
    x: roundNormalized((plan.crop.originX + boundingBox.x * plan.crop.width) / plan.sourceWidth),
    y: roundNormalized((plan.crop.originY + boundingBox.y * plan.crop.height) / plan.sourceHeight),
    width: roundNormalized((boundingBox.width * plan.crop.width) / plan.sourceWidth),
    height: roundNormalized((boundingBox.height * plan.crop.height) / plan.sourceHeight),
  };
}

function roundNormalized(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
