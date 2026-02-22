"use client";

import { useEffect, useRef, useState } from "react";
import type { BricksetSet } from "@/types/brickset";
import type { ComputedPricing, EbaySale } from "@/types/market";

interface Props {
  set: BricksetSet | null;
  pricing: ComputedPricing;
}

function useCountUp(target: number, durationMs = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

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
        setValue(target);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatSaleDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function SaleRow({ sale }: { sale: EbaySale }) {
  return (
    <a
      href={sale.item_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl transition-opacity hover:opacity-80"
      style={{ textDecoration: "none" }}
    >
      <div
        className="flex justify-between items-center py-2.5 px-3 rounded-xl gap-3"
        style={{ background: "var(--surface-2, rgba(255,255,255,0.04))" }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-snug"
            style={{
              color: "var(--foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sale.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {formatSaleDate(sale.sold_date)}
          </p>
        </div>
        <p
          className="text-sm font-black tabular-nums flex-shrink-0"
          style={{ color: "var(--accent)" }}
        >
          {usdFormatter.format(sale.price_usd)}
        </p>
      </div>
    </a>
  );
}

function SaleSection({
  label,
  sales,
  avgUsd,
}: {
  label: string;
  sales: EbaySale[];
  avgUsd: number | null;
}) {
  if (sales.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </p>
        {avgUsd !== null && (
          <p className="text-xs font-bold" style={{ color: "var(--muted)" }}>
            avg {usdFormatter.format(avgUsd)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {sales.map((sale, i) => (
          <SaleRow key={i} sale={sale} />
        ))}
      </div>
    </div>
  );
}

export function PriceReveal({ set, pricing }: Props) {
  const hasEbayData =
    pricing.ebay_new_sales.length > 0 || pricing.ebay_used_sales.length > 0;

  // Hero price priority: eBay new avg → eBay used avg → RRP (all USD)
  const heroUsd =
    pricing.ebay_new_avg_usd ??
    pricing.ebay_used_avg_usd ??
    pricing.rrp_usd ??
    null;

  const animated = useCountUp(heroUsd ?? 0, 1500);

  const heroLabel = hasEbayData
    ? pricing.ebay_new_avg_usd !== null
      ? "Avg Recent Sale Price · New"
      : "Avg Recent Sale Price · Used"
    : "Retail Price (RRP)";

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── 1. Hero price card ── */}
      <div
        className="w-full rounded-2xl p-5 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--muted)" }}
        >
          {heroLabel}
        </p>

        {/* Animated hero price */}
        <div
          className="text-6xl font-black tabular-nums leading-none"
          style={{ color: heroUsd !== null ? "var(--accent)" : "var(--muted)" }}
          aria-label={heroUsd !== null ? usdFormatter.format(heroUsd) : "Price unavailable"}
        >
          {heroUsd !== null ? usdFormatter.format(animated) : "N/A"}
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
            className="inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{
              background:
                pricing.gain_pct >= 0
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
              color: pricing.gain_pct >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            {pricing.gain_pct >= 0 ? "+" : ""}
            {pricing.gain_pct.toFixed(1)}% vs RRP
          </div>
        )}

        {/* RRP reference line */}
        {hasEbayData && pricing.rrp_usd && (
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            RRP: ~{usdFormatter.format(pricing.rrp_usd)}
          </p>
        )}

        {/* No price at all */}
        {heroUsd === null && (
          <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
            Price data not available for this set
          </p>
        )}
      </div>

      {/* ── 2. LEGO set image ── */}
      {set?.image?.imageURL && (
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={set!.image!.imageURL}
            alt={set!.name}
            className="w-full object-contain"
            style={{ maxHeight: "220px", background: "var(--surface)" }}
          />
        </div>
      )}

      {/* ── 3 & 4. eBay sold listings ── */}
      {hasEbayData && (
        <div
          className="w-full rounded-2xl p-4 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <SaleSection
            label="New / Sealed"
            sales={pricing.ebay_new_sales}
            avgUsd={pricing.ebay_new_avg_usd}
          />
          <SaleSection
            label="Used"
            sales={pricing.ebay_used_sales}
            avgUsd={pricing.ebay_used_avg_usd}
          />

          {/* Attribution */}
          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            Source: eBay Australia · sold listings · USD
          </p>
        </div>
      )}
    </div>
  );
}
