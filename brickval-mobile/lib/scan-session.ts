import {
  type BulkMinifigLookupRow,
  type IdentificationDetection,
  type IdentificationResult,
  type LookupDetailResult,
} from "./api";
import { getBatchableMinifigIds, shouldPauseForDetectionChoice } from "./detection-choice";
import type { ScanAccessResult } from "./guest-scan-limits";
import { sanitizeBulkMinifigNumbers } from "./minifig-lookup";

export type ScanSessionIntent = "single" | "bulk";
export type ScanSessionStage = "access" | "identify" | "price";

export type ScanSessionOutcome =
  | { kind: "access-denied"; timings: ScanSessionTimings }
  | { kind: "not-found"; access: ScanAccessResult; identification: IdentificationResult; timings: ScanSessionTimings }
  | { kind: "review"; access: ScanAccessResult; identification: IdentificationResult; timings: ScanSessionTimings }
  | {
      kind: "single-match";
      access: ScanAccessResult;
      identification: IdentificationResult;
      result: LookupDetailResult;
      timings: ScanSessionTimings;
    }
  | {
      kind: "bulk-results";
      access: ScanAccessResult;
      identification: IdentificationResult;
      detections: IdentificationDetection[];
      results: LookupDetailResult[];
      timings: ScanSessionTimings;
    };

export interface ScanSessionTimings {
  accessMs: number;
  identifyMs: number;
  priceMs: number;
  totalMs: number;
}

export class ScanSessionError extends Error {
  constructor(
    readonly stage: ScanSessionStage,
    readonly cause: unknown,
    readonly timings: ScanSessionTimings
  ) {
    super(`Scan session failed during ${stage}`);
    this.name = "ScanSessionError";
  }
}

export interface ScanSessionDependencies {
  prepareAccess: () => Promise<ScanAccessResult>;
  identify: (
    photoUri: string,
    mode: "minifig",
    options: { bulk: boolean }
  ) => Promise<IdentificationResult>;
  bulkLookup: (figNumbers: string[]) => Promise<BulkMinifigLookupRow[]>;
  lookup: (identifier: string, mode: "minifig") => Promise<LookupDetailResult>;
  now: () => number;
}

const EMPTY_TIMINGS: ScanSessionTimings = { accessMs: 0, identifyMs: 0, priceMs: 0, totalMs: 0 };

export async function runMinifigScanSession(
  photoUri: string,
  intent: ScanSessionIntent,
  dependencies: ScanSessionDependencies
): Promise<ScanSessionOutcome> {
  const deps = dependencies;
  const startedAt = deps.now();
  const timings = { ...EMPTY_TIMINGS };

  let access: ScanAccessResult;
  const accessStartedAt = deps.now();
  try {
    access = await deps.prepareAccess();
    timings.accessMs = elapsed(deps.now(), accessStartedAt);
  } catch (error) {
    throw sessionError("access", error, timings, deps.now(), startedAt);
  }

  if (!access.allowed) {
    timings.totalMs = elapsed(deps.now(), startedAt);
    return { kind: "access-denied", timings };
  }

  let identification: IdentificationResult;
  const identifyStartedAt = deps.now();
  try {
    identification = await deps.identify(photoUri, "minifig", { bulk: intent === "bulk" });
    timings.identifyMs = elapsed(deps.now(), identifyStartedAt);
  } catch (error) {
    throw sessionError("identify", error, timings, deps.now(), startedAt);
  }

  if (identification.detections.length === 0) {
    timings.totalMs = elapsed(deps.now(), startedAt);
    return { kind: "not-found", access, identification, timings };
  }

  if (intent === "single") {
    if (shouldPauseForDetectionChoice(identification.detections, 0.8)) {
      timings.totalMs = elapsed(deps.now(), startedAt);
      return { kind: "review", access, identification, timings };
    }

    const detection = identification.detections[0];
    if (detection.item_type !== "minifig") {
      timings.totalMs = elapsed(deps.now(), startedAt);
      return { kind: "review", access, identification, timings };
    }

    const priceStartedAt = deps.now();
    try {
      const result = await deps.lookup(detection.id, "minifig");
      timings.priceMs = elapsed(deps.now(), priceStartedAt);
      timings.totalMs = elapsed(deps.now(), startedAt);
      return { kind: "single-match", access, identification, result, timings };
    } catch (error) {
      throw sessionError("price", error, timings, deps.now(), startedAt);
    }
  }

  const detections = identification.detections.filter((item) => item.item_type === "minifig");
  const figIds = sanitizeBulkMinifigNumbers(getBatchableMinifigIds(detections));
  if (figIds.length === 0) {
    timings.totalMs = elapsed(deps.now(), startedAt);
    return { kind: "bulk-results", access, identification, detections, results: [], timings };
  }

  const priceStartedAt = deps.now();
  try {
    let rows: BulkMinifigLookupRow[] = [];
    try {
      rows = await deps.bulkLookup(figIds);
    } catch {
      // The per-item fallback keeps Review Bulk Scan usable if the batch route is degraded.
    }

    if (rows.length === 0) {
      rows = await Promise.all(
        figIds.map(async (figNumber): Promise<BulkMinifigLookupRow> => {
          try {
            const result = await deps.lookup(figNumber, "minifig");
            return result.item_type === "minifig"
              ? { figNumber, result, error: null }
              : { figNumber, result: null, error: "not_found" };
          } catch {
            return { figNumber, result: null, error: "not_found" };
          }
        })
      );
    }

    const results = rows
      .map((row) => row.result)
      .filter((result): result is NonNullable<BulkMinifigLookupRow["result"]> => result !== null);
    timings.priceMs = elapsed(deps.now(), priceStartedAt);
    timings.totalMs = elapsed(deps.now(), startedAt);
    return { kind: "bulk-results", access, identification, detections, results, timings };
  } catch (error) {
    throw sessionError("price", error, timings, deps.now(), startedAt);
  }
}

function elapsed(now: number, start: number): number {
  return Math.max(0, Math.round(now - start));
}

function sessionError(
  stage: ScanSessionStage,
  error: unknown,
  timings: ScanSessionTimings,
  now: number,
  startedAt: number
): ScanSessionError {
  return new ScanSessionError(stage, error, { ...timings, totalMs: elapsed(now, startedAt) });
}
