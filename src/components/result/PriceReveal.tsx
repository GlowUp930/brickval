"use client";

import { useEffect, useRef, useState } from "react";
import type { BricksetSet } from "@/types/brickset";
import { getRetirementStatus } from "@/types/brickset";
import type { ComputedPricing, EbaySale } from "@/types/market";

interface Props {
  set: BricksetSet | null;
  pricing: ComputedPricing;
  setNumber?: string; // fallback label when set is null
}

// ── Animated count-up hook ─────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    if (target === 0) {
      setValue(0);
      prevTarget.current = 0;
      return;
    }

    const start = performance.now();
    const from = prevTarget.current;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        prevTarget.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

// ── Formatters ─────────────────────────────────────────────────────────────
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

// ── Retirement pill ────────────────────────────────────────────────────────
function RetirementPill({ set }: { set: BricksetSet }) {
  const status = getRetirementStatus(set);
  if (status === "unknown") return null;

  const styles =
    status === "retired"
      ? {
          bg: "rgba(239,68,68,0.10)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.25)",
          label: "Retired",
        }
      : {
          bg: "rgba(34,197,94,0.10)",
          color: "#22c55e",
          border: "1px solid rgba(34,197,94,0.25)",
          label: "Available",
        };

  return (
    <span
      className="self-start text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: styles.bg, color: styles.color, border: styles.border }}
    >
      {styles.label}
    </span>
  );
}

// ── Price sparkline (pure SVG, no deps) ────────────────────────────────────
function PriceSparkline({ sales }: { sales: EbaySale[] }) {
  if (sales.length < 2) return null;

  const prices = sales.map((s) => s.price_usd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const W = 300;
  const H = 56;
  const pad = 8;

  const coords = prices.map((p, i) => ({
    x: pad + (i / (prices.length - 1)) * (W - pad * 2),
    y:
      max === min
        ? H / 2
        : pad + ((max - p) / (max - min)) * (H - pad * 2),
  }));

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${pad},${H} ${linePoints} ${W - pad},${H}`;

  return (
    <div className="mx-4 mb-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 48 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#sparkFill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#f5c518"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill="#f5c518" />
        ))}
      </svg>
    </div>
  );
}

// ── Sale row ───────────────────────────────────────────────────────────────
function SaleRow({
  sale,
  dotColor,
  isLast,
}: {
  sale: EbaySale;
  dotColor: string;
  isLast: boolean;
}) {
  return (
    <a
      href={sale.item_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-70"
      style={{
        background: "var(--surface)",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        textDecoration: "none",
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: dotColor }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate leading-snug"
          style={{ color: "var(--foreground)" }}
        >
          {sale.title}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
          {formatSaleDate(sale.sold_date)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: "var(--accent)" }}
        >
          {usdFormatter.format(sale.price_usd)}
        </span>
        <span className="text-base leading-none" style={{ color: "var(--muted)" }}>
          ›
        </span>
      </div>
    </a>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function PriceReveal({ set, pricing, setNumber }: Props) {
  const hasNew = pricing.ebay_new_sales.length > 0;
  const hasUsed = pricing.ebay_used_sales.length > 0;

  const [tab, setTab] = useState<"new" | "used">(hasNew ? "new" : "used");

  const activeSales =
    tab === "new" ? pricing.ebay_new_sales : pricing.ebay_used_sales;
  const activeAvg =
    tab === "new" ? pricing.ebay_new_avg_usd : pricing.ebay_used_avg_usd;
  const dotColor = tab === "new" ? "var(--accent)" : "var(--muted)";

  const heroUsd =
    tab === "new"
      ? (pricing.ebay_new_avg_usd ?? pricing.ebay_used_avg_usd)
      : (pricing.ebay_used_avg_usd ?? pricing.ebay_new_avg_usd);

  const animated = useCountUp(heroUsd ?? 0);

  const heroLabel =
    tab === "new" ? "Avg Sale Price · New / Sealed" : "Avg Sale Price · Used";

  const imageUrl = set?.image?.imageURL ?? set?.image?.thumbnailURL ?? null;

  return (
    <div className="w-full flex flex-col">

      {/* ── 1. Hero image (full-bleed) ── */}
      <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={set?.name ?? "LEGO Set"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "var(--surface)" }}
          >
            <span className="text-6xl">🧱</span>
          </div>
        )}
        {/* Bottom fade into page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--background))",
          }}
        />
        {/* Theme badge — top-left overlay */}
        {set?.theme && (
          <span
            className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            LEGO {set.theme}
          </span>
        )}
      </div>

      {/* ── 2. Identity block ── */}
      <div className="px-4 pt-1 pb-5 flex flex-col gap-1.5">
        <h1
          className="text-[30px] font-black leading-tight"
          style={{ color: "var(--foreground)" }}
        >
          {set?.name ?? (setNumber ? `Set #${setNumber}` : "LEGO Set")}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {[
            set?.number && `#${set.number}`,
            set?.pieces && `${set.pieces.toLocaleString()} pcs`,
            set?.year && String(set.year),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {set && <RetirementPill set={set} />}
      </div>

      {/* ── 3. Hero price card ── */}
      <div
        className="mx-4 mb-5 rounded-2xl p-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "var(--muted)" }}
        >
          {heroLabel}
        </p>
        <p
          className="text-[64px] font-black leading-none tabular-nums"
          style={{ color: "var(--accent)" }}
          aria-label={heroUsd !== null ? usdFormatter.format(heroUsd) : "N/A"}
        >
          {heroUsd !== null ? usdFormatter.format(animated) : "N/A"}
        </p>

        {pricing.gain_pct !== null && (
          <span
            className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background:
                pricing.gain_pct >= 0
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)",
              color: pricing.gain_pct >= 0 ? "var(--green)" : "var(--red)",
              border: `1px solid ${
                pricing.gain_pct >= 0
                  ? "rgba(34,197,94,0.25)"
                  : "rgba(239,68,68,0.25)"
              }`,
            }}
          >
            {pricing.gain_pct >= 0 ? "+" : ""}
            {pricing.gain_pct.toFixed(1)}% vs RRP
          </span>
        )}

        {pricing.rrp_usd && (
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            RRP: ~{usdFormatter.format(pricing.rrp_usd)}
          </p>
        )}
      </div>

      {/* ── 4. New / Used toggle (only shown when both have data) ── */}
      {hasNew && hasUsed && (
        <div
          className="mx-4 mb-4 flex rounded-xl p-1 gap-1"
          style={{ background: "var(--surface-2)" }}
        >
          {(["new", "used"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: tab === t ? "var(--accent)" : "transparent",
                color: tab === t ? "var(--accent-fg)" : "var(--muted)",
              }}
            >
              {t === "new" ? "New / Sealed" : "Used"}
            </button>
          ))}
        </div>
      )}

      {/* ── 5. Section header ── */}
      <div className="mx-4 mb-2 flex justify-between items-center px-0.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--muted)" }}
        >
          {tab === "new" ? "New / Sealed" : "Used"}
        </span>
        {activeAvg !== null && (
          <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
            avg {usdFormatter.format(activeAvg)}
          </span>
        )}
      </div>

      {/* ── 6. Sparkline ── */}
      <PriceSparkline sales={activeSales} />

      {/* ── 7. Flat listing rows ── */}
      <div
        className="mx-4 mb-5 rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {activeSales.map((sale, i) => (
          <SaleRow
            key={i}
            sale={sale}
            dotColor={dotColor}
            isLast={i === activeSales.length - 1}
          />
        ))}
      </div>

      {/* ── 8. Attribution ── */}
      <p
        className="text-center text-[11px] pb-8 pt-1 px-4"
        style={{ color: "var(--muted)" }}
      >
        Source: eBay Australia · active listings · USD
      </p>
    </div>
  );
}
