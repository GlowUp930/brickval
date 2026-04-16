import type { LookupSummaryPricing } from "./api";
import type { CollectionCondition } from "./collection";

/**
 * Select the appropriate price based on collection condition.
 * Falls back to new price if used price is unavailable.
 */
export function getPriceByCondition(
  pricing: LookupSummaryPricing,
  condition: CollectionCondition
): number | null {
  if (condition === "used") {
    return pricing.hero_used_avg_usd ?? pricing.hero_new_avg_usd;
  }
  return pricing.hero_new_avg_usd;
}

/**
 * Extract hero new price with waterfall fallback chain.
 */
export function getHeroNewPrice(data: any): number | null {
  return (
    data.pricing?.hero_new_avg_usd ??
    data.pricing?.bricklink_new_avg_usd ??
    data.pricing?.ebay_new_avg_usd ??
    data.pricing?.bricklink_stock_new_avg_usd ??
    null
  );
}

/**
 * Extract hero used price with waterfall fallback chain.
 */
export function getHeroUsedPrice(data: any): number | null {
  return (
    data.pricing?.bricklink_used_avg_usd ??
    data.pricing?.ebay_used_avg_usd ??
    data.pricing?.bricklink_stock_used_avg_usd ??
    null
  );
}

/**
 * Extract hero used price for minifigures with fallback.
 */
export function getMinifigHeroUsedPrice(pricing: any): number | null {
  return pricing.used_sold_avg_usd ?? pricing.used_stock_avg_usd ?? null;
}
