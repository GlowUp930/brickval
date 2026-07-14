import type { NonSetDetection } from "./identify-nonset";
import type { PricingStatus } from "./market-snapshot-store";

export interface MinifigIdentification {
  detections: NonSetDetection[];
}

export interface PricedMinifig<T> {
  payload: T;
  pricingStatus: PricingStatus;
  pricingUpdatedAt: string;
}

export interface MinifigScanDependencies<T> {
  identify: (image: Blob) => Promise<MinifigIdentification>;
  price: (itemId: string) => Promise<PricedMinifig<T>>;
  now: () => number;
}

export interface MatchedMinifigScan<T> {
  status: "matched";
  identification: NonSetDetection;
  result: T;
  pricingStatus: PricingStatus;
  pricingUpdatedAt: string;
  identifyMs: number;
  pricingMs: number;
  totalMs: number;
}

export interface ReviewMinifigScan {
  status: "review";
  detections: NonSetDetection[];
  identifyMs: number;
  pricingMs: 0;
  totalMs: number;
}

export interface NotFoundMinifigScan {
  status: "not-found";
  detections: [];
  identifyMs: number;
  pricingMs: 0;
  totalMs: number;
}

export type MinifigScanResult<T> = MatchedMinifigScan<T> | ReviewMinifigScan | NotFoundMinifigScan;

export async function runMinifigScan<T>(
  image: Blob,
  dependencies: MinifigScanDependencies<T>
): Promise<MinifigScanResult<T>> {
  const startedAt = dependencies.now();
  const identification = await dependencies.identify(image);
  const identifyMs = elapsed(dependencies.now(), startedAt);
  const detection = identification.detections[0];
  if (!detection) {
    return {
      status: "not-found",
      detections: [],
      identifyMs,
      pricingMs: 0,
      totalMs: elapsed(dependencies.now(), startedAt),
    };
  }

  const runnerUpScore = detection.alternatives?.find((candidate) => candidate.id !== detection.id)?.score ?? null;
  if (
    detection.item_type !== "minifig" ||
    detection.score < 0.8 ||
    (runnerUpScore !== null && detection.score - runnerUpScore < 0.08)
  ) {
    return {
      status: "review",
      detections: identification.detections,
      identifyMs,
      pricingMs: 0,
      totalMs: elapsed(dependencies.now(), startedAt),
    };
  }

  const pricingStartedAt = dependencies.now();
  const priced = await dependencies.price(detection.id);
  const pricingMs = elapsed(dependencies.now(), pricingStartedAt);

  return {
    status: "matched",
    identification: detection,
    result: priced.payload,
    pricingStatus: priced.pricingStatus,
    pricingUpdatedAt: priced.pricingUpdatedAt,
    identifyMs,
    pricingMs,
    totalMs: elapsed(dependencies.now(), startedAt),
  };
}

function elapsed(now: number, start: number): number {
  return Math.max(0, Math.round(now - start));
}
