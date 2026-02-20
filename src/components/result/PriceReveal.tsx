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

export function PriceReveal({ pricing }: Props) {
  // Hero price priority: new market → used market → RRP
  const heroPrice =
    pricing.market_new_aud ?? pricing.market_used_aud ?? pricing.rrp_aud ?? null;
  const animated = useCountUp(heroPrice ?? 0, 1500);

  const hasMarketData =
    pricing.market_new_aud !== null || pricing.market_used_aud !== null;
  const hasPrice = heroPrice !== null;

  return (
    <div
      className="w-full rounded-2xl p-6 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Label */}
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--muted)" }}
      >
        {hasMarketData ? "Current Market Value" : "Retail Price (RRP)"}
      </p>

      {/* Animated hero price — tabular-nums prevents layout jump as digits change */}
      <div
        className="text-6xl font-black tabular-nums leading-none"
        style={{ color: hasPrice ? "var(--accent)" : "var(--muted)" }}
        aria-label={hasPrice ? audFormatter.format(heroPrice!) : "Price unavailable"}
      >
        {hasPrice ? audFormatter.format(animated) : "N/A"}
      </div>

      {/* Exchange rate disclaimer */}
      {pricing.exchange_rate_stale && (
        <p className="text-xs mt-2" style={{ color: "#f59e0b" }}>
          Using estimated exchange rate
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

      {/* RRP comparison line */}
      {hasMarketData && pricing.rrp_aud && (
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          RRP: ~{audFormatter.format(pricing.rrp_aud)} (converted from USD)
        </p>
      )}

      {/* New / Used split — only shown when market data exists */}
      {hasMarketData && (
        <div className="grid grid-cols-2 gap-3 mt-4 w-full">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "var(--surface-2, rgba(255,255,255,0.05))" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              New / Sealed
            </p>
            <p
              className="text-lg font-black tabular-nums mt-1"
              style={{ color: "var(--foreground)" }}
            >
              {pricing.market_new_aud
                ? audFormatter.format(pricing.market_new_aud)
                : "N/A"}
            </p>
            {pricing.market_new_qty !== null && pricing.market_new_qty > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {pricing.market_new_qty} sold
              </p>
            )}
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "var(--surface-2, rgba(255,255,255,0.05))" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--muted)" }}
            >
              Used
            </p>
            <p
              className="text-lg font-black tabular-nums mt-1"
              style={{ color: "var(--foreground)" }}
            >
              {pricing.market_used_aud
                ? audFormatter.format(pricing.market_used_aud)
                : "N/A"}
            </p>
            {pricing.market_used_qty !== null && pricing.market_used_qty > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {pricing.market_used_qty} sold
              </p>
            )}
          </div>
        </div>
      )}

      {/* Source attribution */}
      {hasMarketData && (
        <p className="text-xs mt-3" style={{ color: "var(--muted)" }}>
          Source: BrickLink · 6-month avg · converted from EUR
        </p>
      )}

      {/* No price at all */}
      {!hasPrice && (
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          Price data not available for this set
        </p>
      )}
    </div>
  );
}
