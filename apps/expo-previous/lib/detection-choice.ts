import type { IdentificationDetection } from "./api";

export function shouldPauseForDetectionChoice(
  detections: IdentificationDetection[],
  lowConfidenceThreshold: number
): boolean {
  if (detections.length === 0) return false;
  if (detections.length > 1) return true;
  const detection = detections[0];
  if (detection.score < lowConfidenceThreshold) return true;
  const alternatives = [...(detection.alternatives ?? [])].sort((a, b) => b.score - a.score);
  const runnerUp = alternatives.find((candidate) => candidate.id.toLowerCase() !== detection.id.toLowerCase());
  return runnerUp ? detection.score - runnerUp.score < 0.08 : false;
}

export function getDetectionChoiceMessage(
  detections: IdentificationDetection[],
  lowConfidenceThreshold: number
): string {
  if (detections.length > 1) {
    return "Review the items found in this photo. Pick one to price first.";
  }

  if (detections.length === 1 && detections[0].score < lowConfidenceThreshold) {
    return "We found one possible match, but confidence is low. Pick to confirm before viewing value.";
  }

  return "We found LEGO minifigures and parts in this photo. Pick one to view its value.";
}

export function getDetectionReviewTitle(detections: IdentificationDetection[]): string {
  return detections.length > 1 ? "Review bulk scan" : "Confirm match";
}

export function getDetectionReviewSummary(detections: IdentificationDetection[]): string {
  const minifigCount = detections.filter((item) => item.item_type === "minifig").length;
  const partCount = detections.filter((item) => item.item_type === "part").length;
  const segments = [
    minifigCount > 0 ? `${minifigCount} minifig${minifigCount === 1 ? "" : "s"}` : null,
    partCount > 0 ? `${partCount} part${partCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return segments.length > 0 ? segments.join(" · ") : "No review items";
}

export function getBatchableMinifigIds(detections: IdentificationDetection[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of detections) {
    if (item.item_type !== "minifig") continue;
    const id = item.id.trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (id.length < 3 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export function toggleBulkMinifigSelection(selectedIds: string[], id: string): string[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}
