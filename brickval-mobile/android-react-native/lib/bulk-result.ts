import type { IdentificationDetection } from "./api";

export function getPhysicalMinifigQuantities(
  detections: IdentificationDetection[]
): Record<string, number> {
  const quantities: Record<string, number> = {};
  for (const detection of detections) {
    if (detection.item_type !== "minifig") continue;
    const id = detection.id.trim().toLowerCase();
    if (!id) continue;
    quantities[id] = (quantities[id] ?? 0) + 1;
  }
  return quantities;
}
