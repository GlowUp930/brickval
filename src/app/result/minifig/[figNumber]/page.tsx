"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { MinifigInfo, MinifigPricing, BrickLinkDetail } from "@/types/market";

// ── Animated count-up ─────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef<number>(0);
  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target === 0) { setValue(0); prevTarget.current = 0; return; }
    const start = performance.now();
    const from = prevTarget.current;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { setValue(target); prevTarget.current = target; }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, durationMs]);
  return value;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdDecimal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function HeroPrice({ amount }: { amount: number }) {
  const animated = useCountUp(amount);
  return (
    <span className="text-5xl font-black tabular-nums" style={{ color: "var(--accent)" }}>
      {usd.format(animated)}
    </span>
  );
}

export default function MinifigResultPage() {
  const params = useParams();
  const router = useRouter();
  const figNumber = (params.figNumber as string).replace(/[^a-z0-9]/gi, "");

  const [figInfo, setFigInfo] = useState<MinifigInfo | null>(null);
  const [pricing, setPricing] = useState<MinifigPricing | null>(null);
  const [error, setError] = useState<string | null>(figNumber ? null : "Invalid figure number.");
  const [loading, setLoading] = useState<boolean>(!!figNumber);

  useEffect(() => {
    if (!figNumber) return;

    fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ setNumber: figNumber, mode: "minifig" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 402) { router.replace("/upgrade"); return; }
        if (!res.ok) { setError(data.message ?? "Something went wrong. Please try again."); return; }
        setFigInfo(data.figInfo);
        setPricing(data.pricing);
      })
      .catch(() => setError("Network error. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [figNumber, router]);

  const heroPrice = pricing?.used_sold_avg_usd ?? pricing?.used_stock_avg_usd ?? 0;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Looking up minifigure…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-5" style={{ background: "var(--background)" }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: "var(--surface-2)" }}>🧱</div>
        <p className="text-lg font-semibold max-w-xs" style={{ color: "var(--foreground)" }}>{error}</p>
        <Link href="/scan" className="font-bold py-3 px-8 rounded-2xl transition-all active:scale-95" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
          Try again
        </Link>
      </main>
    );
  }

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
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="font-bold text-[10px]" style={{ color: "var(--accent-fg)" }}>B</span>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>BrickVal</span>
        </div>
        <div className="w-9" />
      </header>

      <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-5 py-6 gap-6">

        {/* Identity */}
        <div className="flex items-center gap-4">
          {figInfo?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={figInfo.image_url}
              alt={figInfo.name}
              className="w-20 h-20 rounded-2xl object-contain"
              style={{ background: "var(--surface-2)" }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
              Minifigure · {figInfo?.fig_number ?? figNumber}
            </p>
            <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
              {figInfo?.name ?? figNumber}
            </h1>
            {figInfo?.year_released && (
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Released {figInfo.year_released}</p>
            )}
          </div>
        </div>

        {/* Hero price */}
        {heroPrice > 0 && (
          <div className="rounded-3xl p-6 flex flex-col items-center gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              {pricing?.used_sold_avg_usd ? "Avg sold price (used)" : "Avg asking price (used)"}
            </p>
            <HeroPrice amount={heroPrice} />
            {pricing?.used_sold_qty && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Based on {pricing.used_sold_qty} {pricing.used_sold_qty === 1 ? "sale" : "sales"} on BrickLink
              </p>
            )}
          </div>
        )}

        {/* Price breakdown */}
        {pricing && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>BrickLink Used Pricing</p>
            </div>
            <div className="divide-y" style={{ background: "var(--surface-2)" }}>
              {pricing.used_sold_avg_usd !== null && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>Sold avg (last 6mo)</span>
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{usdDecimal.format(pricing.used_sold_avg_usd)}</span>
                </div>
              )}
              {pricing.used_sold_min_usd !== null && pricing.used_sold_max_usd !== null && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--muted)" }}>Range</span>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{usdDecimal.format(pricing.used_sold_min_usd)} – {usdDecimal.format(pricing.used_sold_max_usd)}</span>
                </div>
              )}
              {pricing.used_stock_avg_usd !== null && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>Active listings avg</span>
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{usdDecimal.format(pricing.used_stock_avg_usd)}</span>
                </div>
              )}
              {pricing.used_stock_qty !== null && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm" style={{ color: "var(--muted)" }}>Active listings</span>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>{pricing.used_stock_qty} listings</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent sold transactions */}
        {pricing && pricing.sold_details.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Recent BrickLink Sales</p>
            </div>
            <div className="divide-y" style={{ background: "var(--surface-2)" }}>
              {pricing.sold_details.slice(0, 8).map((d: BrickLinkDetail, i: number) => (
                <div key={i} className="flex justify-between items-center px-4 py-3">
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Used · {d.quantity} pc</span>
                    {d.date && <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{new Date(d.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{usdDecimal.format(d.price_usd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attribution */}
        <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
          Prices from{" "}
          <a href={`https://www.bricklink.com/v2/catalog/catalogitem.page?M=${figInfo?.fig_number ?? figNumber}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            BrickLink
          </a>
          {" · "}No affiliation · For reference only
        </p>

        {/* CTA */}
        <Link
          href="/scan"
          className="flex items-center justify-center gap-2 w-full text-center font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] glow-accent-sm"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
          Scan another
        </Link>

      </div>
    </main>
  );
}
