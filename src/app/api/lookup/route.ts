import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBricksetData } from "@/lib/brickset";
import { getMarketPrice } from "@/lib/rapidapi";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import type { ComputedPricing } from "@/types/market";

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

  // Fetch Brickset, exchange rates, and RapidAPI market prices in parallel
  const [setResult, ratesResult, marketResult] = await Promise.allSettled([
    getBricksetData(setNumber),
    getExchangeRates(),
    getMarketPrice(setNumber),
  ]);

  const set = setResult.status === "fulfilled" ? setResult.value : null;
  const market = marketResult.status === "fulfilled" ? marketResult.value : null;
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

  const marketNewAud =
    market?.price_new_eur && rates
      ? Math.round(market.price_new_eur * rates.eur_to_aud * 100) / 100
      : null;

  const marketUsedAud =
    market?.price_used_eur && rates
      ? Math.round(market.price_used_eur * rates.eur_to_aud * 100) / 100
      : null;

  const gainPct =
    marketNewAud && rrpAud && rrpAud > 0
      ? Math.round(((marketNewAud - rrpAud) / rrpAud) * 100 * 10) / 10
      : null;

  const pricing: ComputedPricing = {
    rrp_usd: rrpUsd,
    market_avg_eur: market?.price_new_eur ?? null,
    exchange_rate_eur_aud: rates?.eur_to_aud ?? null,
    exchange_rate_usd_aud: rates?.usd_to_aud ?? null,
    rrp_aud: rrpAud,
    market_avg_aud: marketNewAud,
    market_min_aud: null,
    market_new_aud: marketNewAud,
    market_used_aud: marketUsedAud,
    market_new_qty: market?.sold_sets_new ?? null,
    market_used_qty: market?.sold_sets_used ?? null,
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
