import type { BrickLinkDetail, EbaySale, LookupDetailResult } from "./api";

export type MarketRow = {
  id: string;
  label: string;
  meta: string;
  priceUsd: number;
};

function normalizeMarketDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function formatDate(value: string | undefined) {
  if (!value) return "Current listing";
  const normalized = normalizeMarketDate(value);
  if (!normalized) return "Current listing";
  return new Date(`${normalized}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildSetRows(result: Extract<LookupDetailResult, { item_type: "set" }>): MarketRow[] {
  const soldRows = result.pricing.bricklink_sold_new_details.length
    ? result.pricing.bricklink_sold_new_details.slice(0, 4).map((row, index) => ({
        id: `bl-sold-new-${index}`,
        label: "BrickLink sold",
        meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
        priceUsd: row.price_usd,
      }))
    : result.pricing.bricklink_sold_used_details.slice(0, 4).map((row, index) => ({
        id: `bl-sold-used-${index}`,
        label: "BrickLink sold used",
        meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
        priceUsd: row.price_usd,
      }));

  const stockRows = result.pricing.bricklink_stock_new_details.length
    ? result.pricing.bricklink_stock_new_details.slice(0, 3).map((row, index) => ({
        id: `bl-stock-new-${index}`,
        label: "BrickLink listing",
        meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
        priceUsd: row.price_usd,
      }))
    : result.pricing.bricklink_stock_used_details.slice(0, 3).map((row, index) => ({
        id: `bl-stock-used-${index}`,
        label: "BrickLink used listing",
        meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
        priceUsd: row.price_usd,
      }));

  const ebayRows = (result.pricing.ebay_new_sales.length ? result.pricing.ebay_new_sales : result.pricing.ebay_used_sales)
    .slice(0, 3)
    .map((row: EbaySale, index: number) => ({
      id: `ebay-${index}`,
      label: "eBay market",
      meta: `${formatDate(row.sold_date)}${row.marketplace ? ` · ${row.marketplace}` : ""}`,
      priceUsd: row.price_usd,
    }));

  return [...soldRows, ...stockRows, ...ebayRows];
}

function buildMinifigRows(result: Extract<LookupDetailResult, { item_type: "minifig" }>): MarketRow[] {
  const soldRows = [...result.pricing.sold_new_details, ...result.pricing.sold_details]
    .slice(0, 5)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `fig-sold-${index}`,
      label: "BrickLink sold",
      meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
      priceUsd: row.price_usd,
    }));

  const stockRows = [...result.pricing.stock_new_details, ...result.pricing.stock_details]
    .slice(0, 4)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `fig-stock-${index}`,
      label: "BrickLink listing",
      meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
      priceUsd: row.price_usd,
    }));

  return [...soldRows, ...stockRows];
}

function buildPartRows(result: Extract<LookupDetailResult, { item_type: "part" }>): MarketRow[] {
  const soldRows = [...result.pricing.sold_details, ...result.pricing.sold_used_details]
    .slice(0, 5)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `part-sold-${index}`,
      label: "BrickLink sold",
      meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
      priceUsd: row.price_usd,
    }));

  const stockRows = [...result.pricing.stock_details, ...result.pricing.stock_used_details]
    .slice(0, 4)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `part-stock-${index}`,
      label: "BrickLink listing",
      meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
      priceUsd: row.price_usd,
    }));

  return [...soldRows, ...stockRows];
}

export function buildMarketRows(result: LookupDetailResult): MarketRow[] {
  if (result.item_type === "set") return buildSetRows(result);
  if (result.item_type === "part") return buildPartRows(result);
  return buildMinifigRows(result);
}

export function normalizeMarketRows(rows: unknown): MarketRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => {
      const value = row as Partial<MarketRow>;
      const priceUsd = Number(value.priceUsd);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;
      return {
        id: typeof value.id === "string" && value.id ? value.id : `row-${index}`,
        label: typeof value.label === "string" && value.label ? value.label : "Market row",
        meta: typeof value.meta === "string" ? value.meta : "",
        priceUsd,
      };
    })
    .filter((row): row is MarketRow => row !== null);
}
