import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import type { EbaySale } from "@/types/market";

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
