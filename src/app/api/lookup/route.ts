import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCached, setCached } from "@/lib/cache";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkColors, getBrickLinkMarketData, getPartMarketData } from "@/lib/bricklink";
import { getBricksetRrp } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import { buildMinifigLookupPayload, sanitizeMinifigNumber, type MinifigLookupPayload } from "@/lib/minifig-lookup";
import { sortByMostRecentDate } from "@/lib/sort-transactions";
import type { ComputedPricing, EbaySale, SetInfo } from "@/types/market";

const LOOKUP_CACHE_TTL_HOURS = 24;

function lookupCacheKey(mode: string, identifier: string, colorId?: number | string) {
  return mode === "part"
    ? `lookup:part:${identifier}:${colorId ?? "none"}`
    : mode === "minifig"
      ? `lookup:minifig:${identifier}`
      : `lookup:set:${identifier}`;
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (error) {
    console.warn("[lookup] Auth unavailable; continuing as guest.", error);
  }

  let body: { setNumber?: string; mode?: string; colorId?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode ?? "set";

  // ── Minifig mode ──────────────────────────────────────────────────────────
  if (mode === "minifig") {
    const figNumber = sanitizeMinifigNumber(body.setNumber);
    if (!figNumber) {
      return NextResponse.json({ error: "Invalid figure number" }, { status: 400 });
    }

    const cacheKey = lookupCacheKey(mode, figNumber);
    const cached = await getCached<MinifigLookupPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const payload = await buildMinifigLookupPayload(figNumber);
    if (!payload) {
      return NextResponse.json(
        { error: "not_found", message: "We don't have data for this minifigure. Check the ID and try again." },
        { status: 404 }
      );
    }

    await setCached(cacheKey, payload, LOOKUP_CACHE_TTL_HOURS);
    return NextResponse.json(payload);
  }

  // ── Part mode ─────────────────────────────────────────────────────────────
  if (mode === "part") {
    const partNumber = body.setNumber?.trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
    const colorId = Number(body.colorId);

    if (!partNumber || partNumber.length < 2 || !Number.isFinite(colorId) || colorId < 0) {
      return NextResponse.json({ error: "Invalid part lookup" }, { status: 400 });
    }

    const cacheKey = lookupCacheKey(mode, partNumber, colorId);
    const cached = await getCached<{ partInfo: unknown; pricing: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [partData, colors] = await Promise.all([
      getPartMarketData(partNumber, colorId).catch(() => null),
      getBrickLinkColors().catch(() => []),
    ]);

    if (!partData?.item && !partData?.sold_used && !partData?.stock_used && !partData?.sold_new && !partData?.stock_new) {
      return NextResponse.json(
        { error: "not_found", message: "We don't have data for this part. Try a different match." },
        { status: 404 }
      );
    }

    const color = colors.find((entry) => entry.color_id === colorId) ?? null;
    const item = partData.item;
    const partInfo = {
      name: item?.name ?? `Part ${partNumber}`,
      image_url: item?.image_url ?? item?.thumbnail_url ?? null,
      part_number: partNumber,
      year_released: item?.year_released ?? null,
      color_id: colorId,
      color_name: color?.color_name ?? null,
    };

    const soldUsed = partData.sold_used;
    const stockUsed = partData.stock_used;
    const soldNew = partData.sold_new;
    const stockNew = partData.stock_new;

    const soldDetails = sortByMostRecentDate((soldNew?.price_detail ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price),
      quantity: d.quantity,
      date: d.date_ordered,
      country: d.seller_country_code,
    })));
    const soldUsedDetails = sortByMostRecentDate((soldUsed?.price_detail ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price),
      quantity: d.quantity,
      date: d.date_ordered,
      country: d.seller_country_code,
    })));
    const stockDetails = (stockNew?.price_detail ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price),
      quantity: d.quantity,
      country: d.seller_country_code,
    }));
    const stockUsedDetails = (stockUsed?.price_detail ?? []).map((d) => ({
      price_usd: parseFloat(d.unit_price),
      quantity: d.quantity,
      country: d.seller_country_code,
    }));

    const newSoldAvg = soldNew?.qty_avg_price ? (parseFloat(soldNew.qty_avg_price) || null) : null;
    const newStockAvg = stockNew?.qty_avg_price ? (parseFloat(stockNew.qty_avg_price) || null) : null;
    const usedSoldAvg = soldUsed?.qty_avg_price ? (parseFloat(soldUsed.qty_avg_price) || null) : null;
    const usedStockAvg = stockUsed?.qty_avg_price ? (parseFloat(stockUsed.qty_avg_price) || null) : null;

    const payload = {
      partInfo,
      pricing: {
        hero_new_avg_usd: newSoldAvg ?? newStockAvg ?? null,
        rrp_usd: null,
        gain_pct: null,
        bricklink_new_qty: soldNew?.unit_quantity ?? stockNew?.unit_quantity ?? null,
        data_source:
          newSoldAvg !== null || usedSoldAvg !== null
            ? "sold"
            : newStockAvg !== null || usedStockAvg !== null
              ? "listing"
              : null,
        new_sold_avg_usd: newSoldAvg,
        new_sold_min_usd: soldNew?.min_price ? (parseFloat(soldNew.min_price) || null) : null,
        new_sold_max_usd: soldNew?.max_price ? (parseFloat(soldNew.max_price) || null) : null,
        new_sold_qty: soldNew?.unit_quantity ?? null,
        new_stock_avg_usd: newStockAvg,
        new_stock_qty: stockNew?.unit_quantity ?? null,
        used_sold_avg_usd: usedSoldAvg,
        used_sold_min_usd: soldUsed?.min_price ? (parseFloat(soldUsed.min_price) || null) : null,
        used_sold_max_usd: soldUsed?.max_price ? (parseFloat(soldUsed.max_price) || null) : null,
        used_sold_qty: soldUsed?.unit_quantity ?? null,
        used_stock_avg_usd: usedStockAvg,
        used_stock_qty: stockUsed?.unit_quantity ?? null,
        sold_details: soldDetails,
        stock_details: stockDetails,
        sold_used_details: soldUsedDetails,
        stock_used_details: stockUsedDetails,
      },
    };
    await setCached(cacheKey, payload, LOOKUP_CACHE_TTL_HOURS);
    return NextResponse.json(payload);
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
  let gate = { allowed: true, scansUsed: 0, isPro: false };
  if (userId) {
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
          message: "You've used all 5 free scans. Upgrade to Brickvalue Pro to continue.",
          scansUsed: gate.scansUsed,
        },
        { status: 402 }
      );
    }
  }

  const cacheKey = lookupCacheKey(mode, setNumber);
  const cached = await getCached<{ setInfo: SetInfo | null; pricing: ComputedPricing }>(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      ...(userId ? { scansUsed: gate.scansUsed, isPro: gate.isPro } : {}),
    });
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

  // Fetch eBay + BrickLink + Brickset in parallel — track whether failures occurred
  let ebayFailed = false;
  let brickLinkFailed = false;

  const [ebayData, brickLinkData, rrpUsd] = await Promise.all([
    getEbayMarketData(setNumber, ratesWithFallbacks).catch(() => {
      ebayFailed = true;
      return { new_sales: [] as EbaySale[], used_sales: [] as EbaySale[], data_source: "listing" as const };
    }),
    getBrickLinkMarketData(setNumber).catch((err) => {
      brickLinkFailed = true;
      console.warn("[lookup] BrickLink fetch failed:", err);
      return null;
    }),
    getBricksetRrp(setNumber).catch(() => null),
  ]);

  // Check for ANY data — including stock listings (not just sold)
  const hasBrickLink = brickLinkData?.sold_new || brickLinkData?.sold_used
    || brickLinkData?.stock_new || brickLinkData?.stock_used;
  const hasEbay = ebayData.new_sales.length > 0 || ebayData.used_sales.length > 0;
  const hasSetIdentity = !!brickLinkData?.item || rrpUsd !== null;

  if (!hasEbay && !hasBrickLink && !hasSetIdentity) {
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
    rates?.stale ?? true,
    rrpUsd
  );
  const resolvedSetInfo =
    setInfo ??
    (hasSetIdentity
      ? {
          name: `LEGO set #${setNumber}`,
          image_url: null,
          year_released: null,
          is_obsolete: false,
          set_number: setNumber,
        }
      : null);

  const payload = {
    setInfo: resolvedSetInfo,
    pricing,
  };
  await setCached(cacheKey, payload, LOOKUP_CACHE_TTL_HOURS);

  return NextResponse.json({
    ...payload,
    ...(userId ? { scansUsed: gate.scansUsed, isPro: gate.isPro } : {}),
  });
}
