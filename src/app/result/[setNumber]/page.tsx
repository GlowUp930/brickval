import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBricksetData } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { PriceReveal } from "@/components/result/PriceReveal";
import Link from "next/link";
import type { ComputedPricing } from "@/types/market";

interface Props {
  params: Promise<{ setNumber: string }>;
}

export default async function ResultPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { setNumber } = await params;
  const cleanedSetNumber = setNumber.replace(/[^0-9]/g, "");

  if (cleanedSetNumber.length < 4) {
    return <ErrorScreen message="Invalid set number. Please try again." />;
  }

  // Check and increment scan counter atomically
  let gate;
  try {
    gate = await checkAndIncrementScan(userId);
  } catch {
    return (
      <ErrorScreen message="Something went wrong. Please try again in a moment." />
    );
  }

  if (!gate.allowed) {
    redirect("/upgrade");
  }

  // Fetch exchange rates first (fast — Supabase-cached)
  const rates = await getExchangeRates().catch(() => null);

  // Build a rates object with fallbacks for eBay multi-marketplace conversion
  const ratesWithFallbacks = {
    eur_to_aud: rates?.eur_to_aud ?? 1.65,
    usd_to_aud: rates?.usd_to_aud ?? 1.55,
    gbp_to_usd: rates?.gbp_to_usd ?? 1.27,
    eur_to_usd: rates?.eur_to_usd ?? 1.08,
    aud_to_usd: rates?.aud_to_usd ?? 0.645,
    stale: rates?.stale ?? true,
  };

  // Fetch eBay + Brickset + BrickLink in parallel
  const [ebayData, set, brickLinkData] = await Promise.all([
    getEbayMarketData(cleanedSetNumber, ratesWithFallbacks).catch(() => ({
      new_sales: [] as import("@/types/market").EbaySale[],
      used_sales: [] as import("@/types/market").EbaySale[],
      data_source: "listing" as const,
    })),
    getBricksetData(cleanedSetNumber).catch(() => null),
    getBrickLinkMarketData(cleanedSetNumber).catch(() => null),
  ]);

  // Gate on having ANY data (eBay OR BrickLink)
  const hasBrickLink = brickLinkData?.sold_new || brickLinkData?.sold_used;
  if (ebayData.new_sales.length === 0 && ebayData.used_sales.length === 0 && !hasBrickLink) {
    return (
      <ErrorScreen
        message={`No listings found for set #${cleanedSetNumber}. Double-check the number and try again.`}
        backLabel="Try another set"
        backHref="/scan"
      />
    );
  }

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

  // Brickset data is optional — only used for RRP + gain %
  const rrpUsd = set?.LEGOCom?.US?.retailPrice ?? null;
  const rrpAud =
    rrpUsd && rates
      ? Math.round(rrpUsd * rates.usd_to_aud * 100) / 100
      : null;

  // BrickLink sold is PRIMARY hero price; fall back to eBay sold, then BrickLink stock
  const heroNewAvgUsd = blNewAvg ?? ebayNewAvgUsd ?? blStockNewAvg;

  const gainPct =
    heroNewAvgUsd && rrpUsd && rrpUsd > 0
      ? Math.round(((heroNewAvgUsd - rrpUsd) / rrpUsd) * 100 * 10) / 10
      : null;

  const pricing: ComputedPricing = {
    rrp_usd: rrpUsd,
    market_avg_eur: null,
    exchange_rate_eur_aud: rates?.eur_to_aud ?? null,
    exchange_rate_usd_aud: rates?.usd_to_aud ?? null,
    rrp_aud: rrpAud,
    market_avg_aud: null,
    market_min_aud: null,
    market_new_aud: null,
    market_used_aud: null,
    market_new_qty: null,
    market_used_qty: null,
    gain_pct: gainPct,
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

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/scan"
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: "var(--muted)" }}
        >
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">🧱</span>
          <span className="text-base font-black tracking-tight" style={{ color: "var(--foreground)" }}>
            BrickVal
          </span>
        </div>
        <div className="w-16" />
      </header>

      {/* Content — no outer padding so hero image goes full-bleed */}
      <div className="flex-1 flex flex-col w-full max-w-sm mx-auto">
        <PriceReveal set={set} pricing={pricing} setNumber={cleanedSetNumber} />

        {/* Scan another CTA */}
        <div className="px-4 pb-8">
          <Link
            href="/scan"
            className="block w-full text-center font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: "var(--surface)",
              color: "var(--foreground)",
              border: "2px solid var(--border)",
            }}
          >
            Scan another set
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorScreen({
  message,
  backLabel = "Try again",
  backHref = "/scan",
}: {
  message: string;
  backLabel?: string;
  backHref?: string;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-5"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: "var(--surface-2)" }}
      >
        🧱
      </div>
      <p className="text-lg font-semibold max-w-xs" style={{ color: "var(--foreground)" }}>
        {message}
      </p>
      <Link
        href={backHref}
        className="font-bold py-3 px-8 rounded-2xl transition-all active:scale-95"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {backLabel}
      </Link>
    </main>
  );
}
