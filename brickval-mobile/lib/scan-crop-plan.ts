import type { NormalizedBoundingBox } from "./auto-scan";

const TARGET_LONG_EDGE = 1024;

export interface PixelSize {
  width: number;
  height: number;
}

export interface MinifigureCropPlan {
  crop: { originX: number; originY: number; width: number; height: number };
  resize: PixelSize | null;
}

export function planMinifigureCrop(
  box: NormalizedBoundingBox,
  image: PixelSize
): MinifigureCropPlan {
  const imageWidth = Math.max(1, Math.round(image.width));
  const imageHeight = Math.max(1, Math.round(image.height));
  const rawLeft = box.x * imageWidth;
  const rawTop = box.y * imageHeight;
  const rawWidth = box.width * imageWidth;
  const rawHeight = box.height * imageHeight;
  const horizontalPadding = rawWidth * 0.2;
  const verticalPadding = rawHeight * 0.12;
  const left = clamp(Math.round(rawLeft - horizontalPadding), 0, imageWidth - 1);
  const top = clamp(Math.round(rawTop - verticalPadding), 0, imageHeight - 1);
  const right = clamp(Math.round(rawLeft + rawWidth + horizontalPadding), left + 1, imageWidth);
  const bottom = clamp(Math.round(rawTop + rawHeight + verticalPadding), top + 1, imageHeight);
  const crop = { originX: left, originY: top, width: right - left, height: bottom - top };
  const longEdge = Math.max(crop.width, crop.height);
  const scale = Math.min(1, TARGET_LONG_EDGE / longEdge);
  const resize = scale < 1
    ? { width: Math.round(crop.width * scale), height: Math.round(crop.height * scale) }
    : null;
  return { crop, resize };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
