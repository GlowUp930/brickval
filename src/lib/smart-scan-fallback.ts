export type FallbackMinifigureDetection = {
  id: string;
  item_type: "minifig" | "part";
  score: number;
  regionId?: string;
  bounding_box?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    imageWidth: number;
    imageHeight: number;
  };
};

export function mapFallbackDetections(
  detections: FallbackMinifigureDetection[]
): Array<{
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  fullyVisible: boolean;
  regionId: string;
}> {
  return detections.flatMap((detection, index) => {
    const box = detection.bounding_box;
    if (detection.item_type !== "minifig" || !box) return [];

    const width = box.right - box.left;
    const height = box.bottom - box.top;
    if (
      !Number.isFinite(detection.score) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      box.imageWidth <= 0 ||
      box.imageHeight <= 0 ||
      width <= 0 ||
      height <= 0
    ) return [];

    const boundingBox = {
      x: roundNormalized(box.left / box.imageWidth),
      y: roundNormalized(box.top / box.imageHeight),
      width: roundNormalized(width / box.imageWidth),
      height: roundNormalized(height / box.imageHeight),
    };

    return [{
      confidence: detection.score,
      boundingBox,
      fullyVisible:
        boundingBox.x >= 0.02 &&
        boundingBox.y >= 0.02 &&
        boundingBox.x + boundingBox.width <= 0.98 &&
        boundingBox.y + boundingBox.height <= 0.98,
      regionId: detection.regionId ?? `brickognize-${index + 1}`,
    }];
  });
}

function roundNormalized(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
