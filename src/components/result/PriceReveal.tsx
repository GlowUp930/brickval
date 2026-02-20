"use client";

import { useEffect, useRef, useState } from "react";
import type { ComputedPricing } from "@/types/market";

interface Props {
  pricing: ComputedPricing;
}

function useCountUp(target: number, durationMs = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);

      // Cubic ease-out: fast at start, settles at end
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target); // ensure we land exactly on target
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PriceReveal({ pricing }: Props) {
  const primaryAud = pricing.market_avg_aud ?? pricing.rrp_aud ?? null;
  const animated = useCountUp(primaryAud ?? 0, 1500);

  const isMarketPrice = pricing.market_avg_aud !== null;
  const hasPrice = primaryAud !== null;
  const showEurFallback = !isMarketPrice && pricing.market_avg_eur !== null;

  return (
    <div
      className="w-full rounded-2xl p-6 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--muted)" }}
      >
        {isMarketPrice ? "Current Market Value" : "Retail Price (RRP)"}
      </p>

      {/* Animated price — tabular-nums prevents layout jump as digits change */}
      <div
        className="text-6xl font-black tabular-nums leading-none"
        style={{ color: hasPrice ? "var(--accent)" : "var(--muted)" }}
        aria-label={hasPrice ? audFormatter.format(primaryAud!) : "Price unavailable"}
      >
        {hasPrice ? audFormatter.format(animated) : "N/A"}
      </div>

      {/* Exchange rate disclaimer */}
      {pricing.exchange_rate_stale && (
        <p className="text-xs mt-2" style={{ color: "#f59e0b" }}>
          Using estimated exchange rate
        </p>
      )}

      {/* EUR fallback when no AUD conversion */}
      {showEurFallback && (
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Currency conversion unavailable —{" "}
          {eurFormatter.format(pricing.market_avg_eur!)} EUR
        </p>
      )}

      {/* RRP comparison */}
      {isMarketPrice && pricing.rrp_aud && (
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          ~{audFormatter.format(pricing.rrp_aud)} RRP (converted from USD)
        </p>
      )}

      {/* % gain badge */}
      {pricing.gain_pct !== null && (
        <div
          className="inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: pricing.gain_pct >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: pricing.gain_pct >= 0 ? "var(--green)" : "var(--red)",
          }}
        >
          {pricing.gain_pct >= 0 ? "+" : ""}
          {pricing.gain_pct.toFixed(1)}% vs RRP
        </div>
      )}

      {/* No price at all */}
      {!hasPrice && !showEurFallback && (
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          Price data not available for this set
        </p>
      )}
    </div>
  );
}
