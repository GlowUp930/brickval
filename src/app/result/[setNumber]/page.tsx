import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getExchangeRates } from "@/lib/frankfurter";
import { getEbayMarketData } from "@/lib/ebay";
import { getBrickLinkMarketData } from "@/lib/bricklink";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { computePricing } from "@/lib/compute-pricing";
import { PriceReveal } from "@/components/result/PriceReveal";
import Link from "next/link";

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

  // Fetch eBay + BrickLink in parallel — track whether failures occurred
  const [ebayResult, brickLinkResult] = await Promise.allSettled([
    getEbayMarketData(cleanedSetNumber, ratesWithFallbacks),
    getBrickLinkMarketData(cleanedSetNumber),
  ]);

  const ebayFailed = ebayResult.status === "rejected";
  const brickLinkFailed = brickLinkResult.status === "rejected";
  const ebayData = ebayFailed
    ? { new_sales: [] as import("@/types/market").EbaySale[], used_sales: [] as import("@/types/market").EbaySale[], data_source: "listing" as const }
    : ebayResult.value;
  const brickLinkData = brickLinkFailed ? null : brickLinkResult.value;

  // Check for ANY data — including stock listings (not just sold)
  const hasBrickLink = brickLinkData?.sold_new || brickLinkData?.sold_used
    || brickLinkData?.stock_new || brickLinkData?.stock_used;
  const hasEbay = ebayData.new_sales.length > 0 || ebayData.used_sales.length > 0;

  if (!hasEbay && !hasBrickLink) {
    if (ebayFailed && brickLinkFailed) {
      return (
        <ErrorScreen
          message="Something went wrong. Please try again in a moment."
          backLabel="Try again"
          backHref="/scan"
        />
      );
    }
    return (
      <ErrorScreen
        message={`No listings found for set #${cleanedSetNumber}. Double-check the number and try again.`}
        backLabel="Try another set"
        backHref="/scan"
      />
    );
  }

  // Compute SetInfo + pricing from raw API data (shared with API route)
  const { setInfo, pricing } = computePricing(
    ebayData,
    brickLinkData,
    cleanedSetNumber,
    rates?.stale ?? true
  );

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "rgba(13,13,15,0.8)" }}
      >
        <Link
          href="/scan"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <span className="font-bold text-[10px]" style={{ color: "var(--accent-fg)" }}>B</span>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            BrickVal
          </span>
        </div>
        <div className="w-9" />
      </header>

      {/* Content — no outer padding so hero image goes full-bleed */}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <PriceReveal setInfo={setInfo} pricing={pricing} setNumber={cleanedSetNumber} />

        {/* Scan another CTA */}
        <div className="px-5 pb-8">
          <Link
            href="/scan"
            className="flex items-center justify-center gap-2 w-full text-center font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] glow-accent-sm"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            </svg>
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
