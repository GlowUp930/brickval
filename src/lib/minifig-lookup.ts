import { getMinifigMarketData, type MinifigMarketData } from "./bricklink";
import { sortByMostRecentDate } from "./sort-transactions";
import type { MinifigInfo, MinifigPricing } from "../types/market";

export const MINIFIG_BATCH_LIMIT = Number.MAX_SAFE_INTEGER;

export type MinifigLookupPayload = {
  figInfo: MinifigInfo;
  pricing: MinifigPricing;
};

export type MinifigMarketDataFetcher = (figNumber: string) => Promise<MinifigMarketData>;

export function sanitizeMinifigNumber(value: unknown): string | null {
  const normalized = String(value ?? "").trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalized.length >= 3 ? normalized : null;
}

export function sanitizeBulkMinifigNumbers(values: unknown[], limit = MINIFIG_BATCH_LIMIT): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const value of values) {
    const id = sanitizeMinifigNumber(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= limit) break;
  }

  return ids;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_: string, dec: string) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function buildMinifigLookupPayload(
  figNumber: string,
  fetchMarketData: MinifigMarketDataFetcher = getMinifigMarketData
): Promise<MinifigLookupPayload | null> {
  const minifigData = await fetchMarketData(figNumber).catch(() => null);

  if (!minifigData?.item && !minifigData?.sold_used && !minifigData?.stock_used && !minifigData?.sold_new && !minifigData?.stock_new) {
    return null;
  }

  const item = minifigData.item;
  const figInfo: MinifigInfo = {
    name: decodeHtmlEntities(item?.name ?? figNumber),
    image_url: item?.image_url ?? item?.thumbnail_url ?? null,
    fig_number: figNumber,
    year_released: item?.year_released ?? null,
  };

  const soldUsed = minifigData.sold_used;
  const stockUsed = minifigData.stock_used;
  const soldNew = minifigData.sold_new;
  const stockNew = minifigData.stock_new;

  const soldDetails = sortByMostRecentDate((soldUsed?.price_detail ?? []).map((detail) => ({
    price_usd: parseFloat(detail.unit_price),
    quantity: detail.quantity,
    date: detail.date_ordered,
    country: detail.seller_country_code,
  })));
  const stockDetails = (stockUsed?.price_detail ?? []).map((detail) => ({
    price_usd: parseFloat(detail.unit_price),
    quantity: detail.quantity,
    country: detail.seller_country_code,
  }));
  const soldNewDetails = sortByMostRecentDate((soldNew?.price_detail ?? []).map((detail) => ({
    price_usd: parseFloat(detail.unit_price),
    quantity: detail.quantity,
    date: detail.date_ordered,
    country: detail.seller_country_code,
  })));
  const stockNewDetails = (stockNew?.price_detail ?? []).map((detail) => ({
    price_usd: parseFloat(detail.unit_price),
    quantity: detail.quantity,
    country: detail.seller_country_code,
  }));

  const pricing: MinifigPricing = {
    used_sold_avg_usd: soldUsed?.qty_avg_price ? (parseFloat(soldUsed.qty_avg_price) || null) : null,
    used_sold_min_usd: soldUsed?.min_price ? (parseFloat(soldUsed.min_price) || null) : null,
    used_sold_max_usd: soldUsed?.max_price ? (parseFloat(soldUsed.max_price) || null) : null,
    used_sold_qty: soldUsed?.unit_quantity || null,
    used_stock_avg_usd: stockUsed?.qty_avg_price ? (parseFloat(stockUsed.qty_avg_price) || null) : null,
    used_stock_qty: stockUsed?.unit_quantity || null,
    new_sold_avg_usd: soldNew?.qty_avg_price ? (parseFloat(soldNew.qty_avg_price) || null) : null,
    new_sold_min_usd: soldNew?.min_price ? (parseFloat(soldNew.min_price) || null) : null,
    new_sold_max_usd: soldNew?.max_price ? (parseFloat(soldNew.max_price) || null) : null,
    new_sold_qty: soldNew?.unit_quantity || null,
    new_stock_avg_usd: stockNew?.qty_avg_price ? (parseFloat(stockNew.qty_avg_price) || null) : null,
    new_stock_qty: stockNew?.unit_quantity || null,
    sold_details: soldDetails,
    stock_details: stockDetails,
    sold_new_details: soldNewDetails,
    stock_new_details: stockNewDetails,
  };

  return { figInfo, pricing };
}
