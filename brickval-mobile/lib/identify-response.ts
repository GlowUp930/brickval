import type { IdentificationCandidate, IdentificationDetection, ScanMode } from "./api";

export type IdentificationResponseShape = {
  set_number: string | null;
  confidence?: number | null;
  candidates?: IdentificationCandidate[];
  detections?: IdentificationDetection[];
};

export function normalizeIdentificationDetections(
  mode: ScanMode,
  data: IdentificationResponseShape
): IdentificationDetection[] {
  if (mode !== "minifig") {
    return (data.detections ?? []).slice(0, 8);
  }

  if (data.detections?.length) {
    return data.detections.slice(0, 8);
  }

  const candidateDetections = (data.candidates ?? []).map((candidate) => ({
    id: candidate.id,
    item_type: "minifig" as const,
    score: candidate.score,
  }));

  if (candidateDetections.length > 0) {
    return candidateDetections.slice(0, 8);
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
