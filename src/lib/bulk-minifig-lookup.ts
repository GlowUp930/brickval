import { getCached, setCached } from "./cache";
import {
  buildMinifigLookupPayload,
  sanitizeBulkMinifigNumbers,
  type MinifigLookupPayload,
} from "./minifig-lookup";

const LOOKUP_CACHE_TTL_HOURS = 24;

export type BulkMinifigLookupRow =
  | { figNumber: string; result: MinifigLookupPayload; error?: never }
  | { figNumber: string; error: "not_found"; result?: never };

async function lookupOneMinifig(figNumber: string): Promise<BulkMinifigLookupRow> {
  const cacheKey = `lookup:minifig:${figNumber}`;
  const cached = await getCached<MinifigLookupPayload>(cacheKey);
  if (cached) return { figNumber, result: cached };

  const payload = await buildMinifigLookupPayload(figNumber);
  if (!payload) return { figNumber, error: "not_found" };

  await setCached(cacheKey, payload, LOOKUP_CACHE_TTL_HOURS);
  return { figNumber, result: payload };
}

export async function lookupBulkMinifigures(
  identifiers: unknown[],
  concurrency = 5,
  limit = 40
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
