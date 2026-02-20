import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBricksetData } from "@/lib/brickset";
// TODO: Phase 2 — import { getMarketPrice } from "@/lib/rapidapi";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import type { ComputedPricing, MarketPrice } from "@/types/market";

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

  // Fetch Brickset + Frankfurter in parallel (RapidAPI market prices: Phase 2)
  const [setResult, ratesResult] = await Promise.allSettled([
    getBricksetData(setNumber),
    getExchangeRates(),
  ]);

  const set = setResult.status === "fulfilled" ? setResult.value : null;
  // Phase 2: replace with getMarketPrice(setNumber) — RapidAPI secondary market
  const market = null as (MarketPrice | null);
  const rates = ratesResult.status === "fulfilled" ? ratesResult.value : null;

  if (!set) {
    return NextResponse.json(
      {
        error: "not_found",
        message:
          "We don't have data for this set number. Double-check the number and try again.",
      },
      { status: 404 }
    );
  }

  // Compute AUD prices
  const rrpUsd = set.LEGOCom?.US?.retailPrice ?? null;
  const rrpAud =
    rrpUsd && rates
      ? Math.round(rrpUsd * rates.usd_to_aud * 100) / 100
      : null;

  const marketAvgPrice = market !== null ? market.avg_price : null;
  const marketMinPrice = market !== null ? market.min_price : null;

  const marketAvgAud =
    marketAvgPrice && rates
      ? Math.round(marketAvgPrice * rates.eur_to_aud * 100) / 100
      : null;

  const marketMinAud =
    marketMinPrice && rates
      ? Math.round(marketMinPrice * rates.eur_to_aud * 100) / 100
      : null;

  const gainPct =
    marketAvgAud && rrpAud && rrpAud > 0
      ? Math.round(((marketAvgAud - rrpAud) / rrpAud) * 100 * 10) / 10
      : null;

  const pricing: ComputedPricing = {
    rrp_usd: rrpUsd,
    market_avg_eur: marketAvgPrice ?? null,
    exchange_rate_eur_aud: rates?.eur_to_aud ?? null,
    exchange_rate_usd_aud: rates?.usd_to_aud ?? null,
    rrp_aud: rrpAud,
    market_avg_aud: marketAvgAud,
    market_min_aud: marketMinAud,
    gain_pct: gainPct,
    exchange_rate_stale: rates?.stale ?? true,
  };

  return NextResponse.json({
    set,
    market,
    pricing,
    scansUsed: gate.scansUsed,
    isPro: gate.isPro,
  });
}
