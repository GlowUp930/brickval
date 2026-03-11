import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData, getMinifigMarketData } from "@/lib/bricklink";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import type { EbaySale, MinifigInfo, MinifigPricing } from "@/types/market";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { setNumber?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode ?? "set";

  // ── Minifig mode ──────────────────────────────────────────────────────────
  if (mode === "minifig") {
    const figNumber = body.setNumber?.trim().replace(/[^a-z0-9]/gi, "");
    if (!figNumber || figNumber.length < 3) {
      return NextResponse.json({ error: "Invalid figure number" }, { status: 400 });
    }

    let gate;
    try {
      gate = await checkAndIncrementScan(userId);
    } catch (err) {
      console.error("[lookup/minifig] Scan gate error:", err);
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

    const minifigData = await getMinifigMarketData(figNumber).catch(() => null);

    if (!minifigData?.item && !minifigData?.sold_new && !minifigData?.sold_used && !minifigData?.stock_new && !minifigData?.stock_used) {
      return NextResponse.json(
        { error: "not_found", message: "We don't have data for this minifigure. Check the ID and try again." },
        { status: 404 }
      );
    }

    const item = minifigData.item;
    const figInfo: MinifigInfo = {
      name: item?.name ?? figNumber,
      image_url: item?.image_url ?? null,
      fig_number: figNumber,
      year_released: item?.year_released ?? null,
    };

    const soldUsed = minifigData.sold_used;
    const stockUsed = minifigData.stock_used;
    const soldNew = minifigData.sold_new;
    const stockNew = minifigData.stock_new;

    function mapDetails(guide: typeof soldUsed, includeDate: boolean) {
      return (guide?.price_detail ?? []).map((d) => ({
        price_usd: parseFloat(d.unit_price),
        quantity: d.quantity,
        ...(includeDate && d.date_ordered ? { date: d.date_ordered } : {}),
        ...(d.seller_country_code ? { country: d.seller_country_code } : {}),
      }));
    }

    const pricing: MinifigPricing = {
      used_sold_avg_usd: soldUsed?.qty_avg_price ? parseFloat(soldUsed.qty_avg_price) : null,
      used_sold_min_usd: soldUsed?.min_price ? parseFloat(soldUsed.min_price) : null,
      used_sold_max_usd: soldUsed?.max_price ? parseFloat(soldUsed.max_price) : null,
      used_sold_qty: soldUsed?.unit_quantity ?? null,
      used_stock_avg_usd: stockUsed?.qty_avg_price ? parseFloat(stockUsed.qty_avg_price) : null,
      used_stock_qty: stockUsed?.unit_quantity ?? null,
      used_sold_details: mapDetails(soldUsed, true),
      used_stock_details: mapDetails(stockUsed, false),
      new_sold_avg_usd: soldNew?.qty_avg_price ? parseFloat(soldNew.qty_avg_price) : null,
      new_sold_min_usd: soldNew?.min_price ? parseFloat(soldNew.min_price) : null,
      new_sold_max_usd: soldNew?.max_price ? parseFloat(soldNew.max_price) : null,
      new_sold_qty: soldNew?.unit_quantity ?? null,
      new_stock_avg_usd: stockNew?.qty_avg_price ? parseFloat(stockNew.qty_avg_price) : null,
      new_stock_qty: stockNew?.unit_quantity ?? null,
      new_sold_details: mapDetails(soldNew, true),
      new_stock_details: mapDetails(stockNew, false),
    };

    return NextResponse.json({ figInfo, pricing, scansUsed: gate.scansUsed, isPro: gate.isPro });
  }

  // ── Set mode ──────────────────────────────────────────────────────────────
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

  // Fetch eBay + BrickLink data in parallel — track whether failures occurred
  let ebayFailed = false;
  let brickLinkFailed = false;

  const [ebayData, brickLinkData] = await Promise.all([
    getEbayMarketData(setNumber, ratesWithFallbacks).catch(() => {
      ebayFailed = true;
      return { new_sales: [] as EbaySale[], used_sales: [] as EbaySale[], data_source: "listing" as const };
    }),
    getBrickLinkMarketData(setNumber).catch((err) => {
      brickLinkFailed = true;
      console.warn("[lookup] BrickLink fetch failed:", err);
      return null;
    }),
  ]);

  // Check for ANY data — including stock listings (not just sold)
  const hasBrickLink = brickLinkData?.sold_new || brickLinkData?.sold_used
    || brickLinkData?.stock_new || brickLinkData?.stock_used;
  const hasEbay = ebayData.new_sales.length > 0 || ebayData.used_sales.length > 0;

  if (!hasEbay && !hasBrickLink) {
    // Both providers failed → retryable error, not "bad set number"
    if (ebayFailed && brickLinkFailed) {
      return NextResponse.json(
        { error: "upstream", message: "Something went wrong. Please try again in a moment." },
        { status: 502 }
      );
    }
    // Providers succeeded but returned no data → genuinely not found
    return NextResponse.json(
      { error: "not_found", message: "We don't have data for this set number. Double-check the number and try again." },
      { status: 404 }
    );
  }

  // Compute SetInfo + pricing from raw API data (shared with SSR page)
  const { setInfo, pricing } = computePricing(
    ebayData,
    brickLinkData,
    setNumber,
    rates?.stale ?? true
  );

  return NextResponse.json({
    setInfo,
    pricing,
    scansUsed: gate.scansUsed,
    isPro: gate.isPro,
  });
}
