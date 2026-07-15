import type { LookupDetailResult, LookupItemType } from "./api";
import type { CollectionCondition } from "./collection-core";

export type MarketSnapshotSourceName = "BrickLink" | "eBay" | "Market data";
export type MarketSnapshotSourceType = "sold" | "listing" | "none";
export type MarketSnapshotConfidence = "high" | "limited" | "guide" | "unavailable";

export interface MarketSnapshot {
  item_type: LookupItemType;
  item_id: string;
  condition: CollectionCondition;
  price_usd: number | null;
  source_name: MarketSnapshotSourceName;
  source_type: MarketSnapshotSourceType;
  confidence: MarketSnapshotConfidence;
  count: number | null;
  updated_at: string;
}

interface SnapshotCandidate {
  price_usd: number | null;
  source_name: MarketSnapshotSourceName;
  source_type: MarketSnapshotSourceType;
  count: number | null;
}

function cleanPrice(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function cleanCount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function confidenceFor(sourceType: MarketSnapshotSourceType, count: number | null): MarketSnapshotConfidence {
  if (sourceType === "none") return "unavailable";
  if (sourceType === "listing") return "guide";
  return count !== null && count >= 3 ? "high" : "limited";
}

function firstPricedCandidate(candidates: SnapshotCandidate[]): SnapshotCandidate {
  return (
    candidates.find((candidate) => candidate.price_usd !== null) ?? {
      price_usd: null,
      source_name: "Market data",
      source_type: "none",
      count: null,
    }
  );
}

function getSetCandidates(result: Extract<LookupDetailResult, { item_type: "set" }>, condition: CollectionCondition) {
  const pricing = result.pricing;
  if (condition === "used") {
    return [
      {
        price_usd: cleanPrice(pricing.bricklink_used_avg_usd),
        source_name: "BrickLink" as const,
        source_type: "sold" as const,
        count: cleanCount(pricing.bricklink_used_qty),
      },
      {
        price_usd: cleanPrice(pricing.ebay_used_avg_usd),
        source_name: "eBay" as const,
        source_type: "sold" as const,
        count: cleanCount(pricing.ebay_used_sales.length),
      },
      {
        price_usd: cleanPrice(pricing.bricklink_stock_used_avg_usd),
        source_name: "BrickLink" as const,
        source_type: "listing" as const,
        count: cleanCount(pricing.bricklink_stock_used_qty),
      },
    ];
  }

  return [
    {
      price_usd: cleanPrice(pricing.bricklink_new_avg_usd),
      source_name: "BrickLink" as const,
      source_type: "sold" as const,
      count: cleanCount(pricing.bricklink_new_qty),
    },
    {
      price_usd: cleanPrice(pricing.ebay_new_avg_usd),
      source_name: "eBay" as const,
      source_type: "sold" as const,
      count: cleanCount(pricing.ebay_new_sales.length),
    },
    {
      price_usd: cleanPrice(pricing.bricklink_stock_new_avg_usd),
      source_name: "BrickLink" as const,
      source_type: "listing" as const,
      count: cleanCount(pricing.bricklink_stock_new_qty),
    },
  ];
}

function getBrickLinkCandidates(
  result: Extract<LookupDetailResult, { item_type: "minifig" | "part" }>,
  condition: CollectionCondition
) {
  const pricing = result.pricing;
  if (condition === "used") {
    return [
      {
        price_usd: cleanPrice(pricing.used_sold_avg_usd),
        source_name: "BrickLink" as const,
        source_type: "sold" as const,
        count: cleanCount(pricing.used_sold_qty),
      },
      {
        price_usd: cleanPrice(pricing.used_stock_avg_usd),
        source_name: "BrickLink" as const,
        source_type: "listing" as const,
        count: cleanCount(pricing.used_stock_qty),
      },
    ];
  }

  return [
    {
      price_usd: cleanPrice(pricing.new_sold_avg_usd),
      source_name: "BrickLink" as const,
      source_type: "sold" as const,
      count: cleanCount(pricing.new_sold_qty),
    },
    {
      price_usd: cleanPrice(pricing.new_stock_avg_usd),
      source_name: "BrickLink" as const,
      source_type: "listing" as const,
      count: cleanCount(pricing.new_stock_qty),
    },
  ];
}

function getItemId(result: LookupDetailResult): string {
  if (result.item_type === "minifig") return result.fig_info.fig_number;
  if (result.item_type === "part") return result.part_info.part_number;
  return result.set_number;
}

export function buildMarketSnapshot(
  result: LookupDetailResult,
  condition: CollectionCondition,
  updatedAt = new Date().toISOString()
): MarketSnapshot {
  const candidate =
    result.item_type === "set"
      ? firstPricedCandidate(getSetCandidates(result, condition))
      : firstPricedCandidate(getBrickLinkCandidates(result, condition));

  return {
    item_type: result.item_type,
    item_id: getItemId(result),
    condition,
    price_usd: candidate.price_usd,
    source_name: candidate.source_name,
    source_type: candidate.source_type,
    confidence: confidenceFor(candidate.source_type, candidate.count),
    count: candidate.count,
    updated_at: updatedAt,
  };
}
