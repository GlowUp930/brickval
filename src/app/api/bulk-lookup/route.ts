import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { getBricksetRrp } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import type { EbaySale, SetInfo, ComputedPricing } from "@/types/market";

type BulkLookupRow =
  | { setNumber: string; setInfo: SetInfo | null; pricing: ComputedPricing; error?: never }
  | { setNumber: string; error: "not_found"; setInfo?: never; pricing?: never };

async function lookupOne(
  setNumber: string,
  ratesWithFallbacks: {
    eur_to_aud: number;
    usd_to_aud: number;
    gbp_to_usd: number;
    eur_to_usd: number;
    aud_to_usd: number;
    stale: boolean;
  },
  ratesStale: boolean
): Promise<BulkLookupRow> {
  const [ebayData, brickLinkData, rrpUsd] = await Promise.all([
    getEbayMarketData(setNumber, ratesWithFallbacks).catch(() => ({
      new_sales: [] as EbaySale[],
      used_sales: [] as EbaySale[],
      data_source: "listing" as const,
    })),
    getBrickLinkMarketData(setNumber).catch(() => null),
    getBricksetRrp(setNumber).catch(() => null),
  ]);

  const hasData =
    brickLinkData?.sold_new ||
    brickLinkData?.sold_used ||
    brickLinkData?.stock_new ||
    brickLinkData?.stock_used ||
    ebayData.new_sales.length > 0 ||
    ebayData.used_sales.length > 0;

  if (!hasData) return { setNumber, error: "not_found" };

  const { setInfo, pricing } = computePricing(
    ebayData,
    brickLinkData,
    setNumber,
    ratesStale,
    rrpUsd
  );

  return { setNumber, setInfo, pricing };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { setNumbers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.setNumbers) || body.setNumbers.length === 0) {
    return NextResponse.json({ error: "No set numbers provided" }, { status: 400 });
  }

  // Sanitize: strip non-digits, require >=4 digits, deduplicate, cap at 20
  const seen = new Set<string>();
  const setNumbers: string[] = (body.setNumbers as unknown[])
    .map((s) => String(s).trim().replace(/[^0-9]/g, ""))
    .filter((s) => s.length >= 4)
    .filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; })
    .slice(0, 20);

  if (setNumbers.length === 0) {
    return NextResponse.json({ error: "No valid set numbers" }, { status: 400 });
  }

  // Gate: one check per bulk job (stubbed — returns allowed: true)
  let gate;
  try {
    gate = await checkAndIncrementScan(userId);
  } catch (err) {
    console.error("[bulk-lookup] Scan gate error:", err);
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

  // Fetch exchange rates once — shared across all lookups
  const rates = await getExchangeRates().catch(() => null);
  const ratesWithFallbacks = {
    eur_to_aud: rates?.eur_to_aud ?? 1.65,
    usd_to_aud: rates?.usd_to_aud ?? 1.55,
    gbp_to_usd: rates?.gbp_to_usd ?? 1.27,
    eur_to_usd: rates?.eur_to_usd ?? 1.08,
    aud_to_usd: rates?.aud_to_usd ?? 0.645,
    stale: rates?.stale ?? true,
  };

  // Process in batches of 3 to avoid overwhelming upstream APIs
  const BATCH_SIZE = 3;
  const results: BulkLookupRow[] = [];

  for (let i = 0; i < setNumbers.length; i += BATCH_SIZE) {
    const batch = setNumbers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((n) => lookupOne(n, ratesWithFallbacks, rates?.stale ?? true))
    );
    results.push(...batchResults);
  }

  return NextResponse.json({ results });
}
