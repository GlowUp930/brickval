import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached } from "@/lib/cache";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { getBricksetRrp } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkFeatureAccess, consumeFeatureUsage } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import {
  buildMinifigLookupPayload,
  sanitizeBulkMinifigNumbers,
  type MinifigLookupPayload,
} from "@/lib/minifig-lookup";
import type { EbaySale, SetInfo, ComputedPricing } from "@/types/market";

const LOOKUP_CACHE_TTL_HOURS = 24;

type BulkLookupRow =
  | { setNumber: string; setInfo: SetInfo | null; pricing: ComputedPricing; error?: never }
  | { setNumber: string; error: "not_found"; setInfo?: never; pricing?: never };

type BulkMinifigLookupRow =
  | { figNumber: string; result: MinifigLookupPayload; error?: never }
  | { figNumber: string; error: "not_found"; result?: never };

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

async function lookupOneMinifig(figNumber: string): Promise<BulkMinifigLookupRow> {
  const cacheKey = `lookup:minifig:${figNumber}`;
  const cached = await getCached<MinifigLookupPayload>(cacheKey);
  if (cached) return { figNumber, result: cached };

  const payload = await buildMinifigLookupPayload(figNumber);
  if (!payload) return { figNumber, error: "not_found" };

  await setCached(cacheKey, payload, LOOKUP_CACHE_TTL_HOURS);
  return { figNumber, result: payload };
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (error) {
    console.warn("[bulk-lookup] Auth unavailable; continuing as guest.", error);
  }

  let body: {
    setNumbers?: unknown;
    figNumbers?: unknown;
    mode?: unknown;
    source?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode === "minifig" ? "minifig" : "set";
  const isBulkScan = mode === "minifig" && body.source === "bulk-scan";
  if (mode === "set" && (!Array.isArray(body.setNumbers) || body.setNumbers.length === 0)) {
    return NextResponse.json({ error: "No set numbers provided" }, { status: 400 });
  }

  // Sanitize sets independently; minifigure pricing supports up to 40 unique IDs.
  const seen = new Set<string>();
  const rawSetNumbers = Array.isArray(body.setNumbers) ? body.setNumbers : [];
  const setNumbers: string[] = rawSetNumbers
    .map((s) => String(s).trim().replace(/[^0-9]/g, ""))
    .filter((s) => s.length >= 4)
    .filter((s) => { if (seen.has(s)) return false; seen.add(s); return true; })
    .slice(0, 20);

  const rawFigNumbers = Array.isArray(body.figNumbers)
    ? body.figNumbers
    : Array.isArray(body.setNumbers)
      ? body.setNumbers
      : [];
  const figNumbers = sanitizeBulkMinifigNumbers(rawFigNumbers);

  if (mode === "set" && setNumbers.length === 0) {
    return NextResponse.json({ error: "No valid set numbers" }, { status: 400 });
  }

  if (mode === "minifig" && figNumbers.length === 0) {
    return NextResponse.json({ error: "No valid minifigure numbers" }, { status: 400 });
  }

  if (userId && isBulkScan) {
    const gate = await checkFeatureAccess(userId, "bulk_scan");
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: "paywall",
          feature: "bulk_scan",
          message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.",
          usage: gate.usage,
        },
        { status: 402 }
      );
    }
  }

  if (mode === "minifig") {
    const BATCH_SIZE = 3;
    const results: BulkMinifigLookupRow[] = [];

    for (let i = 0; i < figNumbers.length; i += BATCH_SIZE) {
      const batch = figNumbers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((figNumber) => lookupOneMinifig(figNumber)));
      results.push(...batchResults);
    }

    if (userId && isBulkScan && results.some((row) => "result" in row)) {
      const gate = await consumeFeatureUsage(userId, "bulk_scan");
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: "paywall",
            feature: "bulk_scan",
            message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.",
            usage: gate.usage,
          },
          { status: 402 }
        );
      }
      return NextResponse.json({ mode: "minifig", results, usage: gate.usage });
    }

    return NextResponse.json({ mode: "minifig", results });
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
