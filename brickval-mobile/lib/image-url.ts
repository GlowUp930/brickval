export function normalizeImageUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export function getBrickLinkPreviewImageUrl(itemType: "minifig" | "part", id: string): string {
  const cleaned = id.trim().toLowerCase();
  return itemType === "part"
    ? `https://img.bricklink.com/PL/${cleaned}.jpg`
    : `https://img.bricklink.com/ML/${cleaned}.jpg`;
}
