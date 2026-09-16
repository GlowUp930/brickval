import { resolveMinifigMarketSnapshot } from "./minifig-market-snapshots";
import {
  sanitizeBulkMinifigNumbers,
  type MinifigLookupPayload,
} from "./minifig-lookup";

export type BulkMinifigLookupRow =
  | { figNumber: string; result: MinifigLookupPayload; error?: never }
  | { figNumber: string; error: "not_found"; result?: never };

async function lookupOneMinifig(figNumber: string): Promise<BulkMinifigLookupRow> {
  try {
    const snapshot = await resolveMinifigMarketSnapshot(figNumber, (task) => {
      // Bulk lookup is already bounded by its worker pool. Run a stale refresh
      // in the background without delaying the response or writing an
      // identity-only result into the cache.
      void task();
    });
    return { figNumber, result: snapshot.payload };
  } catch (error) {
    if (error instanceof Error && error.message === "Minifigure market data not found") {
      return { figNumber, error: "not_found" };
    }
    throw error;
  }
}

export async function lookupBulkMinifigures(
  identifiers: unknown[],
  concurrency = 5,
  limit = Number.MAX_SAFE_INTEGER
): Promise<BulkMinifigLookupRow[]> {
  const figNumbers = sanitizeBulkMinifigNumbers(identifiers, limit);
  const rows: BulkMinifigLookupRow[] = [];
  for (let index = 0; index < figNumbers.length; index += concurrency) {
    rows.push(...await Promise.all(figNumbers.slice(index, index + concurrency).map(lookupOneMinifig)));
  }
  return rows;
}

export function hasUsableMinifigPrice(
  row: BulkMinifigLookupRow
): row is { figNumber: string; result: MinifigLookupPayload; error?: never } {
  if (!("result" in row) || !row.result) return false;
  const pricing = row.result.pricing;
  return [
    pricing.used_sold_avg_usd,
    pricing.used_stock_avg_usd,
    pricing.new_sold_avg_usd,
    pricing.new_stock_avg_usd,
  ].some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
}

export function hasMinifigLookupResult(
  row: BulkMinifigLookupRow
): row is { figNumber: string; result: MinifigLookupPayload; error?: never } {
  return "result" in row && Boolean(row.result);
}
