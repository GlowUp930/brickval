import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import type { ComputedPricing, EbaySale, SetInfo } from "@/types/market";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { setNumber?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const setNumber = body.setNumber?.trim().replace(/[^0-9]/g, "");
  if (!setNumber || setNumber.length < 4) {
    return NextResponse.json(
      { error: "Invalid set number" },
      { status: 400 }
    );
  }

  // Check paywall and increment scan counter atomically
  let gate;
  try {
    gate = await checkAndIncrementScan(userId);
  } catch (err) {
    console.error("[lookup] Scan gate error:", err);
    return NextResponse.json(
      { error: "internal", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: "paywall",
        message: "You've used all 5 free scans. Upgrade to BrickVal Pro to continue.",
        scansUsed: gate.scansUsed,
      },
      { status: 402 }
    );
  }

  // Fetch exchange rates first (fast — Supabase-cached)
  const rates = await getExchangeRates().catch(() => null);

  const ratesWithFallbacks = {
    eur_to_aud: rates?.eur_to_aud ?? 1.65,
    usd_to_aud: rates?.usd_to_aud ?? 1.55,
    gbp_to_usd: rates?.gbp_to_usd ?? 1.27,
    eur_to_usd: rates?.eur_to_usd ?? 1.08,
    aud_to_usd: rates?.aud_to_usd ?? 0.645,
    stale: rates?.stale ?? true,
  };

  // Fetch eBay + BrickLink data in parallel
  const [ebayData, brickLinkData] = await Promise.all([
    getEbayMarketData(setNumber, ratesWithFallbacks).catch(() => ({
      new_sales: [] as EbaySale[],
      used_sales: [] as EbaySale[],
      data_source: "listing" as const,
    })),
    getBrickLinkMarketData(setNumber).catch((err) => {
      console.warn("[lookup] BrickLink fetch failed:", err);
      return null;
    }),
  ]);

  const hasBrickLink = brickLinkData?.sold_new || brickLinkData?.sold_used;
  if (ebayData.new_sales.length === 0 && ebayData.used_sales.length === 0 && !hasBrickLink) {
    return NextResponse.json(
      {
        error: "not_found",
        message:
          "We don't have data for this set number. Double-check the number and try again.",
      },
      { status: 404 }
    );
  }

  // Build SetInfo from BrickLink item data (replaces Brickset)
  const blItem = brickLinkData?.item ?? null;
  const setInfo: SetInfo | null = blItem
    ? {
        name: blItem.name,
        image_url: blItem.image_url
          ? (blItem.image_url.startsWith("//") ? `https:${blItem.image_url}` : blItem.image_url)
          : null,
        year_released: blItem.year_released ?? null,
        is_obsolete: blItem.is_obsolete ?? false,
        set_number: blItem.no ?? setNumber,
      }
    : null;

  // Compute eBay averages (USD) for hero price
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

  // Helper: map BrickLink price_detail array to BrickLinkDetail[]
  type RawDetail = { unit_price: string; quantity: number; date_ordered?: string; seller_country_code?: string };
  function toBlDetails(details: RawDetail[] | undefined) {
    return (details ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price) || 0,
      quantity: d.quantity,
      date: d.date_ordered,
      country: d.seller_country_code,
    }));
  }

  // Extract BrickLink sold price guide stats (last 6 months)
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

  // Extract BrickLink stock (active store listings)
  const blStockNewAvg = brickLinkData?.stock_new
    ? parseFloat(brickLinkData.stock_new.avg_price) || null
    : null;
  const blStockNewQty = brickLinkData?.stock_new?.unit_quantity ?? null;
  const blStockUsedAvg = brickLinkData?.stock_used
    ? parseFloat(brickLinkData.stock_used.avg_price) || null
    : null;
  const blStockUsedQty = brickLinkData?.stock_used?.unit_quantity ?? null;

  // Extract individual BrickLink row data
  const blSoldNewDetails = toBlDetails(brickLinkData?.sold_new?.price_detail);
  const blSoldUsedDetails = toBlDetails(brickLinkData?.sold_used?.price_detail);
  const blStockNewDetails = toBlDetails(brickLinkData?.stock_new?.price_detail);
  const blStockUsedDetails = toBlDetails(brickLinkData?.stock_used?.price_detail);

  // BrickLink sold is PRIMARY hero price; fall back to eBay sold, then BrickLink stock
  const heroNewAvgUsd = blNewAvg ?? ebayNewAvgUsd ?? blStockNewAvg;

  const pricing: ComputedPricing = {
    rrp_usd: null, // No Brickset — RRP not available. Future: Supabase RRP table.
    gain_pct: null,
    exchange_rate_stale: rates?.stale ?? true,
    ebay_new_sales: ebayData.new_sales,
    ebay_used_sales: ebayData.used_sales,
    ebay_new_avg_usd: ebayNewAvgUsd,
    ebay_used_avg_usd: ebayUsedAvgUsd,
    data_source: ebayData.data_source,
    // BrickLink sold price guide (last 6 months)
    bricklink_new_avg_usd: blNewAvg,
    bricklink_new_min_usd: blNewMin,
    bricklink_new_max_usd: blNewMax,
    bricklink_new_qty: blNewQty,
    bricklink_used_avg_usd: blUsedAvg,
    bricklink_used_min_usd: blUsedMin,
    bricklink_used_max_usd: blUsedMax,
    bricklink_used_qty: blUsedQty,
    // BrickLink stock (active listings)
    bricklink_stock_new_avg_usd: blStockNewAvg,
    bricklink_stock_new_qty: blStockNewQty,
    bricklink_stock_used_avg_usd: blStockUsedAvg,
    bricklink_stock_used_qty: blStockUsedQty,
    // BrickLink row details
    bricklink_sold_new_details: blSoldNewDetails,
    bricklink_sold_used_details: blSoldUsedDetails,
    bricklink_stock_new_details: blStockNewDetails,
    bricklink_stock_used_details: blStockUsedDetails,
  };

  return NextResponse.json({
    setInfo,
    pricing,
    scansUsed: gate.scansUsed,
    isPro: gate.isPro,
  });
}
