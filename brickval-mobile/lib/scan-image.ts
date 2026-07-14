const MAX_SCAN_PIXELS = 1_150_000;
const MAX_SCAN_BYTES = 2_000_000;
const MAX_SCAN_EDGE = 1024;
const DETECTION_SAMPLE_EDGE = 416;

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
