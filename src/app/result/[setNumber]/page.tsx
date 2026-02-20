import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBricksetData } from "@/lib/brickset";
import { getExchangeRates } from "@/lib/frankfurter";
import { getMarketPrice } from "@/lib/rapidapi";
import { checkAndIncrementScan } from "@/lib/scan-gate";
import { SetDetails } from "@/components/result/SetDetails";
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

  // Fetch all data in parallel
  const [setResult, ratesResult, marketResult] = await Promise.allSettled([
    getBricksetData(cleanedSetNumber),
    getExchangeRates(),
    getMarketPrice(cleanedSetNumber),
  ]);

  const set = setResult.status === "fulfilled" ? setResult.value : null;
  const market = marketResult.status === "fulfilled" ? marketResult.value : null;
  const rates = ratesResult.status === "fulfilled" ? ratesResult.value : null;

  if (!set) {
    return (
      <ErrorScreen
        message={`We don't have data for set #${cleanedSetNumber}. Double-check the number and try again.`}
        backLabel="Try another set"
        backHref="/scan"
      />
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

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-5 py-8 max-w-sm mx-auto w-full gap-5">
        <SetDetails set={set} />
        <PriceReveal pricing={pricing} />

        {/* Scan another CTA */}
        <Link
          href="/scan"
          className="w-full text-center font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98]"
          style={{
            background: "var(--surface)",
            color: "var(--foreground)",
            border: "2px solid var(--border)",
          }}
        >
          Scan another set
        </Link>
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
