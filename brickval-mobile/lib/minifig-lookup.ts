export const MINIFIG_BATCH_LIMIT = 40;

export function sanitizeBulkMinifigNumbers(ids: string[], limit = MINIFIG_BATCH_LIMIT): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => id.trim().replace(/[^a-z0-9]/gi, "").toLowerCase())
        .filter((id) => id.length >= 3)
    )
  ).slice(0, limit);
}
