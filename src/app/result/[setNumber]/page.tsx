import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBricksetData } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { getEbayMarketData } from "@/lib/ebay";
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
  const usdToAud = rates?.usd_to_aud ?? 1.55;

  // Fetch eBay + Brickset in parallel — Brickset is best-effort only
  const [ebayData, set] = await Promise.all([
    getEbayMarketData(cleanedSetNumber, usdToAud).catch(() => ({
      new_sales: [],
      used_sales: [],
    })),
    getBricksetData(cleanedSetNumber).catch(() => null),
  ]);

  // eBay is the primary source — gate on it, not Brickset
  if (ebayData.new_sales.length === 0 && ebayData.used_sales.length === 0) {
    return (
      <ErrorScreen
        message={`No eBay listings found for set #${cleanedSetNumber}. Double-check the number and try again.`}
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

  // Brickset data is optional — only used for RRP + gain %
  const rrpUsd = set?.LEGOCom?.US?.retailPrice ?? null;
  const rrpAud =
    rrpUsd && rates
      ? Math.round(rrpUsd * rates.usd_to_aud * 100) / 100
      : null;

  const gainPct =
    ebayNewAvgUsd && rrpUsd && rrpUsd > 0
      ? Math.round(((ebayNewAvgUsd - rrpUsd) / rrpUsd) * 100 * 10) / 10
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
