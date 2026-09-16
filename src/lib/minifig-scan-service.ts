import type { NonSetDetection } from "./identify-nonset";
import type { PricingStatus } from "./market-snapshot-store";

export type MinifigPricingAvailability = "available" | "stale" | "unavailable";
export type MinifigPricingResolution = "live" | "fresh_cache" | "stale_cache" | "identity_only";

export interface MinifigIdentification {
  detections: NonSetDetection[];
}

export interface PricedMinifig<T> {
  payload: T;
  pricingStatus: PricingStatus;
  pricingUpdatedAt?: string;
  pricingAvailability?: MinifigPricingAvailability;
  pricingResolution?: MinifigPricingResolution;
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
  pricingAvailability: MinifigPricingAvailability;
  pricingUpdatedAt?: string;
  pricingResolution?: MinifigPricingResolution;
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

/** A recognition-only response must not spend a single-scan allowance. */
export function shouldConsumeSingleScan<T>(result: MinifigScanResult<T>): boolean {
  return result.status !== "matched" || result.pricingAvailability !== "unavailable";
}

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
  const pricingAvailability = priced.pricingAvailability ?? availabilityForStatus(priced.pricingStatus);
  const pricingResolution = priced.pricingResolution ?? resolutionForStatus(priced.pricingStatus, pricingAvailability);

  return {
    status: "matched",
    identification: detection,
    result: priced.payload,
    pricingStatus: priced.pricingStatus,
    pricingAvailability,
    pricingUpdatedAt: priced.pricingUpdatedAt,
    pricingResolution,
    identifyMs,
    pricingMs,
    totalMs: elapsed(dependencies.now(), startedAt),
  };
}

function availabilityForStatus(status: PricingStatus): MinifigPricingAvailability {
  switch (status) {
  case "unavailable": return "unavailable";
  case "refreshing": return "stale";
  default: return "available";
  }
}

function resolutionForStatus(
  status: PricingStatus,
  availability: MinifigPricingAvailability,
): MinifigPricingResolution {
  if (availability === "unavailable") return "identity_only";
  if (availability === "stale" || status === "refreshing") return "stale_cache";
  return status === "fresh" ? "fresh_cache" : "live";
}

function elapsed(now: number, start: number): number {
  return Math.max(0, Math.round(now - start));
}
