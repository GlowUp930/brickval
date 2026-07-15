export const DEFAULT_ROBOFLOW_MINIFIGURE_MODEL = "lego-minifigures-r3zzt/1";
export const DEFAULT_ROBOFLOW_MINIFIGURE_CLASSES = ["Lego-Minifigures"];

export interface RoboflowPrediction {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
  class?: string;
  detection_id?: string;
}

export interface RoboflowDetectionResponse {
  image?: { width?: number; height?: number };
  predictions?: RoboflowPrediction[];
}

export interface HostedDetectorDependencies {
  consumeQuota: () => Promise<boolean>;
  detectorModelVersion?: string;
  allowedClasses?: string[];
  infer: (image: Blob) => Promise<RoboflowDetectionResponse>;
  now: () => number;
}

export type HostedDetectionResult =
  | {
      status: "available";
      detectorModelVersion: string;
      detectMs: number;
      observations: Array<{
        confidence: number;
        boundingBox: { x: number; y: number; width: number; height: number };
        fullyVisible: boolean;
        regionId: string;
      }>;
    }
  | {
      status: "cap-reached";
      detectorModelVersion: string;
      detectMs: 0;
      observations: [];
    };

export async function runHostedMinifigureDetection(
  image: Blob,
  dependencies: HostedDetectorDependencies
): Promise<HostedDetectionResult> {
  const detectorModelVersion = dependencies.detectorModelVersion ?? DEFAULT_ROBOFLOW_MINIFIGURE_MODEL;
  const allowedClasses = dependencies.allowedClasses ?? DEFAULT_ROBOFLOW_MINIFIGURE_CLASSES;

  if (!(await dependencies.consumeQuota())) {
    return {
      status: "cap-reached",
      detectorModelVersion,
      detectMs: 0,
      observations: [],
    };
  }

  const startedAt = dependencies.now();
  const response = await dependencies.infer(image);
  const imageWidth = Number(response.image?.width ?? 0);
  const imageHeight = Number(response.image?.height ?? 0);
  const observations = imageWidth > 0 && imageHeight > 0
    ? (response.predictions ?? []).flatMap((prediction, index) => {
        const confidence = Number(prediction.confidence ?? 0);
        const width = Number(prediction.width ?? 0) / imageWidth;
        const height = Number(prediction.height ?? 0) / imageHeight;
        const x = (Number(prediction.x ?? 0) / imageWidth) - width / 2;
        const y = (Number(prediction.y ?? 0) / imageHeight) - height / 2;
        if (
          !isAllowedPredictionClass(prediction.class, allowedClasses) ||
          confidence < 0.5 ||
          !Number.isFinite(x + y + width + height) ||
          width <= 0 ||
          height <= 0
        ) return [];

        const boundingBox = {
          x: roundNormalized(x),
          y: roundNormalized(y),
          width: roundNormalized(width),
          height: roundNormalized(height),
        };
        return [{
          confidence,
          boundingBox,
          fullyVisible:
            boundingBox.x >= 0.02 &&
            boundingBox.y >= 0.02 &&
            boundingBox.x + boundingBox.width <= 0.98 &&
            boundingBox.y + boundingBox.height <= 0.98,
          regionId: prediction.detection_id ?? `roboflow-${index + 1}`,
        }];
      })
    : [];

  return {
    status: "available",
    detectorModelVersion,
    detectMs: Math.max(0, Math.round(dependencies.now() - startedAt)),
    observations,
  };
}

function isAllowedPredictionClass(value: string | undefined, allowedClasses: string[]): boolean {
  return allowedClasses.includes("*") || (typeof value === "string" && allowedClasses.includes(value));
}

function roundNormalized(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
