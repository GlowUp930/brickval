import type { BrickLinkMarketData } from "./bricklink";
import type { ComputedPricing, EbayMarketData, SetInfo } from "@/types/market";

/**
 * Shared pricing computation — called by both the API route and the SSR page.
 * Single source of truth for SetInfo extraction, eBay averages, BrickLink stat
 * parsing, and the final ComputedPricing assembly.
 */
export function computePricing(
  ebayData: EbayMarketData,
  brickLinkData: BrickLinkMarketData | null,
  setNumber: string,
  ratesStale: boolean
): { setInfo: SetInfo | null; pricing: ComputedPricing } {
  // ── SetInfo from BrickLink item API ──────────────────────────────────────
  const blItem = brickLinkData?.item ?? null;
  const setInfo: SetInfo | null = blItem
    ? {
        name: blItem.name,
        image_url: blItem.image_url
          ? blItem.image_url.startsWith("//")
            ? `https:${blItem.image_url}`
            : blItem.image_url
          : null,
        year_released: blItem.year_released ?? null,
        is_obsolete: blItem.is_obsolete ?? false,
        set_number: blItem.no ?? setNumber,
      }
    : null;

  // ── eBay averages (USD) ──────────────────────────────────────────────────
  const ebayNewAvgUsd =
    ebayData.new_sales.length > 0
      ? Math.round(
          (ebayData.new_sales.reduce((s, x) => s + x.price_usd, 0) /
            ebayData.new_sales.length) *
            100
        ) / 100
      : null;
  const ebayUsedAvgUsd =
    ebayData.used_sales.length > 0
      ? Math.round(
          (ebayData.used_sales.reduce((s, x) => s + x.price_usd, 0) /
            ebayData.used_sales.length) *
            100
        ) / 100
      : null;

  // ── BrickLink price_detail → BrickLinkDetail[] ───────────────────────────
  type RawDetail = {
    unit_price: string;
    quantity: number;
    date_ordered?: string;
    seller_country_code?: string;
  };
  function toBlDetails(details: RawDetail[] | undefined) {
    return (details ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price) || 0,
      quantity: d.quantity,
      date: d.date_ordered,
      country: d.seller_country_code,
    }));
  }

  // ── BrickLink sold stats (last 6 months) ─────────────────────────────────
  const blNewAvg = brickLinkData?.sold_new
    ? parseFloat(brickLinkData.sold_new.avg_price) || null
    : null;
  const blNewMin = brickLinkData?.sold_new
    ? parseFloat(brickLinkData.sold_new.min_price) || null
    : null;
  const blNewMax = brickLinkData?.sold_new
    ? parseFloat(brickLinkData.sold_new.max_price) || null
    : null;
  const blNewQty = brickLinkData?.sold_new?.unit_quantity ?? null;

  const blUsedAvg = brickLinkData?.sold_used
    ? parseFloat(brickLinkData.sold_used.avg_price) || null
    : null;
  const blUsedMin = brickLinkData?.sold_used
    ? parseFloat(brickLinkData.sold_used.min_price) || null
    : null;
  const blUsedMax = brickLinkData?.sold_used
    ? parseFloat(brickLinkData.sold_used.max_price) || null
    : null;
  const blUsedQty = brickLinkData?.sold_used?.unit_quantity ?? null;

  // ── BrickLink stock (active store listings) ──────────────────────────────
  const blStockNewAvg = brickLinkData?.stock_new
    ? parseFloat(brickLinkData.stock_new.avg_price) || null
    : null;
  const blStockNewQty = brickLinkData?.stock_new?.unit_quantity ?? null;
  const blStockUsedAvg = brickLinkData?.stock_used
    ? parseFloat(brickLinkData.stock_used.avg_price) || null
    : null;
  const blStockUsedQty = brickLinkData?.stock_used?.unit_quantity ?? null;

  // ── BrickLink row details ────────────────────────────────────────────────
  const blSoldNewDetails = toBlDetails(brickLinkData?.sold_new?.price_detail);
  const blSoldUsedDetails = toBlDetails(brickLinkData?.sold_used?.price_detail);
  const blStockNewDetails = toBlDetails(brickLinkData?.stock_new?.price_detail);
  const blStockUsedDetails = toBlDetails(brickLinkData?.stock_used?.price_detail);

  // ── Assemble ComputedPricing ─────────────────────────────────────────────
  const pricing: ComputedPricing = {
    rrp_usd: null,
    gain_pct: null,
    exchange_rate_stale: ratesStale,
    ebay_new_sales: ebayData.new_sales,
    ebay_used_sales: ebayData.used_sales,
    ebay_new_avg_usd: ebayNewAvgUsd,
    ebay_used_avg_usd: ebayUsedAvgUsd,
    data_source: ebayData.data_source,
    bricklink_new_avg_usd: blNewAvg,
    bricklink_new_min_usd: blNewMin,
    bricklink_new_max_usd: blNewMax,
    bricklink_new_qty: blNewQty,
    bricklink_used_avg_usd: blUsedAvg,
    bricklink_used_min_usd: blUsedMin,
    bricklink_used_max_usd: blUsedMax,
    bricklink_used_qty: blUsedQty,
    bricklink_stock_new_avg_usd: blStockNewAvg,
    bricklink_stock_new_qty: blStockNewQty,
    bricklink_stock_used_avg_usd: blStockUsedAvg,
    bricklink_stock_used_qty: blStockUsedQty,
    bricklink_sold_new_details: blSoldNewDetails,
    bricklink_sold_used_details: blSoldUsedDetails,
    bricklink_stock_new_details: blStockNewDetails,
    bricklink_stock_used_details: blStockUsedDetails,
  };

  return { setInfo, pricing };
}
