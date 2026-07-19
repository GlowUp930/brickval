export interface LookupMarketHistoryPoint {
  date: string;
  price_usd: number;
  source: "bricklink" | "ebay";
}

type SetLikeResult = {
  item_type: "set";
  pricing: {
    bricklink_new_avg_usd: number | null;
    ebay_new_avg_usd: number | null;
    bricklink_stock_new_avg_usd: number | null;
    bricklink_used_avg_usd: number | null;
    ebay_used_avg_usd: number | null;
    bricklink_stock_used_avg_usd: number | null;
    bricklink_sold_new_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
    bricklink_sold_used_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
    ebay_new_sales: Array<{ sold_date?: string; price_usd: number; marketplace?: string }>;
    ebay_used_sales: Array<{ sold_date?: string; price_usd: number; marketplace?: string }>;
  };
};

type MinifigLikeResult = {
  item_type: "minifig";
  pricing: {
    used_sold_avg_usd: number | null;
    used_stock_avg_usd: number | null;
    new_sold_avg_usd: number | null;
    new_stock_avg_usd: number | null;
    sold_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
    sold_new_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
  };
};

type PartLikeResult = {
  item_type: "part";
  pricing: {
    used_sold_avg_usd: number | null;
    used_stock_avg_usd: number | null;
    new_sold_avg_usd: number | null;
    new_stock_avg_usd: number | null;
    sold_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
    sold_used_details: Array<{ date?: string; price_usd: number; quantity?: number; country?: string }>;
  };
};

export type LookupLikeResult = SetLikeResult | MinifigLikeResult | PartLikeResult;

export function normalizeHistoryDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function cleanHistory(points: LookupMarketHistoryPoint[]): LookupMarketHistoryPoint[] {
  return points
    .map((point) => ({
      ...point,
      date: normalizeHistoryDate(point.date) ?? "",
    }))
    .filter((point) => point.date && Number.isFinite(point.price_usd) && point.price_usd > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-120);
}

export function getConditionMarketValueUsd(
  result: LookupLikeResult,
  condition: "new_sealed" | "used"
): number | null {
  if (result.item_type === "set") {
    return condition === "used"
      ? result.pricing.bricklink_used_avg_usd ??
          result.pricing.ebay_used_avg_usd ??
          result.pricing.bricklink_stock_used_avg_usd ??
          null
      : result.pricing.bricklink_new_avg_usd ??
          result.pricing.ebay_new_avg_usd ??
          result.pricing.bricklink_stock_new_avg_usd ??
          null;
  }

  return condition === "used"
    ? result.pricing.used_sold_avg_usd ?? result.pricing.used_stock_avg_usd ?? null
    : result.pricing.new_sold_avg_usd ?? result.pricing.new_stock_avg_usd ?? null;
}

export function getConditionMarketHistory(
  result: LookupLikeResult,
  condition: "new_sealed" | "used"
): LookupMarketHistoryPoint[] {
  if (result.item_type === "set") {
    const bricklinkRows =
      condition === "used" ? result.pricing.bricklink_sold_used_details : result.pricing.bricklink_sold_new_details;
    const ebayRows = condition === "used" ? result.pricing.ebay_used_sales : result.pricing.ebay_new_sales;

    return cleanHistory([
      ...bricklinkRows.map((row) => ({
        date: row.date ?? "",
        price_usd: row.price_usd,
        source: "bricklink" as const,
      })),
      ...ebayRows.map((row) => ({
        date: row.sold_date ?? "",
        price_usd: row.price_usd,
        source: "ebay" as const,
      })),
    ]);
  }

  if (result.item_type === "part") {
    const rows = condition === "used" ? result.pricing.sold_used_details : result.pricing.sold_details;
    return cleanHistory(
      rows.map((row) => ({
        date: row.date ?? "",
        price_usd: row.price_usd,
        source: "bricklink" as const,
      }))
    );
  }

  const rows = condition === "used" ? result.pricing.sold_details : result.pricing.sold_new_details;
  return cleanHistory(
    rows.map((row) => ({
      date: row.date ?? "",
      price_usd: row.price_usd,
      source: "bricklink" as const,
    }))
  );
}
