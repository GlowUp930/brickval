import type { IdentificationDetection } from "./api";

export function shouldPauseForDetectionChoice(
  detections: IdentificationDetection[],
  lowConfidenceThreshold: number
): boolean {
  if (detections.length === 0) return false;
  if (detections.length > 1) return true;
  return detections[0].score < lowConfidenceThreshold;
}

export function getDetectionChoiceMessage(
  detections: IdentificationDetection[],
  lowConfidenceThreshold: number
): string {
  if (detections.length > 1) {
    return "We found more than one LEGO minifigure or part in this photo. Pick one to view its value.";
  }

  if (detections.length === 1 && detections[0].score < lowConfidenceThreshold) {
    return "We found one possible match, but confidence is low. Pick to confirm before viewing value.";
  }

  return "We found LEGO minifigures and parts in this photo. Pick one to view its value.";
}
