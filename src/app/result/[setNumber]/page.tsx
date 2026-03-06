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

  // Fetch eBay + BrickLink in parallel
  const [ebayData, brickLinkData] = await Promise.all([
    getEbayMarketData(cleanedSetNumber, ratesWithFallbacks).catch(() => ({
      new_sales: [] as import("@/types/market").EbaySale[],
      used_sales: [] as import("@/types/market").EbaySale[],
      data_source: "listing" as const,
    })),
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
        <PriceReveal setInfo={setInfo} pricing={pricing} setNumber={cleanedSetNumber} />

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
