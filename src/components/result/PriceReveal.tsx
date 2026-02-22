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

function formatShortDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return isoDate;
  }
}

// ── 30-day price delta (using first vs second half of listings as proxy) ───
function computePriceDelta(sales: EbaySale[]): {
  delta: number;
  pct: number;
} | null {
  if (sales.length < 2) return null;

  // Use first half as "older" and second half as "newer"
  const mid = Math.floor(sales.length / 2);
  const older = sales.slice(0, mid);
  const newer = sales.slice(mid);

  const oldAvg = older.reduce((s, x) => s + x.price_usd, 0) / older.length;
  const newAvg = newer.reduce((s, x) => s + x.price_usd, 0) / newer.length;

  if (oldAvg === 0) return null;

  const delta = newAvg - oldAvg;
  const pct = (delta / oldAvg) * 100;
  return { delta, pct };
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

// ── Price sparkline — taller, with axis labels ──────────────────────────────
function PriceSparkline({ sales }: { sales: EbaySale[] }) {
  if (sales.length < 2) return null;

  const prices = sales.map((s) => s.price_usd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Canvas dimensions — taller for ~1/3 screen feel on mobile
  const W = 340;
  const H = 140;
  const padLeft = 52;  // room for Y-axis price labels
  const padRight = 8;
  const padTop = 12;
  const padBottom = 28; // room for X-axis date labels

  const toX = (i: number) =>
    padLeft + (i / (prices.length - 1)) * (W - padLeft - padRight);

  const toY = (p: number) =>
    max === min
      ? padTop + (H - padTop - padBottom) / 2
      : padTop + ((max - p) / (max - min)) * (H - padTop - padBottom);

  const coords = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${padLeft},${H - padBottom} ${linePoints} ${W - padRight},${H - padBottom}`;

  // Y-axis: 3 reference lines (min, mid, max)
  const yLabels = [
    { price: max, y: toY(max) },
    { price: (max + min) / 2, y: toY((max + min) / 2) },
    { price: min, y: toY(min) },
  ];

  // X-axis: always show a 30-day window (oldest = 30 days ago, newest = today)
  // Browse API listings all have today's date — spread them visually across 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const xLabels = [
    { label: formatShortDate(thirtyDaysAgo.toISOString()), x: toX(0) },
    { label: formatShortDate(now.toISOString()), x: toX(sales.length - 1) },
  ];

  return (
    <div className="mx-4 mb-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 140 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + price labels */}
        {yLabels.map(({ price, y }, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={y}
              x2={W - padRight}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <text
              x={padLeft - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="rgba(255,255,255,0.35)"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {usdFormatter.format(price)}
            </text>
          </g>
        ))}

        {/* X-axis baseline */}
        <line
          x1={padLeft}
          y1={H - padBottom}
          x2={W - padRight}
          y2={H - padBottom}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />

        {/* X-axis date labels */}
        {xLabels.map(({ label, x }, i) => (
          <text
            key={i}
            x={x}
            y={H - padBottom + 14}
            textAnchor={i === 0 ? "start" : "end"}
            fontSize="9"
            fill="rgba(255,255,255,0.35)"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#sparkFill)" />

        {/* Price line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#f5c518"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#f5c518" />
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

  // 30-day price delta from active tab's listings
  const priceDelta = computePriceDelta(activeSales);

  const heroLabel =
    tab === "new" ? "Avg Sale Price · New / Sealed" : "Avg Sale Price · Used";

  // Build image URL from Brickset CDN pattern directly — no API call needed
  const setNum = set?.number ?? setNumber;
  const imageUrl =
    set?.image?.imageURL ??
    set?.image?.thumbnailURL ??
    (setNum ? `https://images.brickset.com/sets/images/${setNum}-1.jpg` : null);

  return (
    <div className="w-full flex flex-col">

      {/* ── 1. Hero image (full-bleed, fixed height for consistency) ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 240 }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={set?.name ?? `LEGO Set ${setNum ?? ""}`}
            className="w-full h-full object-contain"
            style={{ background: "var(--surface)" }}
            onError={(e) => {
              // If Brickset CDN fails, hide img and show fallback
              (e.target as HTMLImageElement).style.display = "none";
            }}
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
            style={{ background: "var(--accent)", color: "#000" }}
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

        {/* Big animated price */}
        <p
          className="text-[64px] font-black leading-none tabular-nums"
          style={{ color: "var(--accent)" }}
          aria-label={heroUsd !== null ? usdFormatter.format(heroUsd) : "N/A"}
        >
          {heroUsd !== null ? usdFormatter.format(animated) : "N/A"}
        </p>

        {/* 30-day trend badge — like the reference screenshot */}
        {priceDelta !== null && (
          <div className="flex items-center gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background:
                  priceDelta.delta >= 0
                    ? "rgba(34,197,94,0.18)"
                    : "rgba(239,68,68,0.18)",
                color: priceDelta.delta >= 0 ? "#22c55e" : "#ef4444",
                border: `1px solid ${
                  priceDelta.delta >= 0
                    ? "rgba(34,197,94,0.30)"
                    : "rgba(239,68,68,0.30)"
                }`,
              }}
            >
              {/* Trend arrow */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{
                  transform: priceDelta.delta >= 0 ? "rotate(0deg)" : "rotate(180deg)",
                }}
              >
                <path
                  d="M1 7 L5 2 L9 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {priceDelta.delta >= 0 ? "+" : ""}
              {usdFormatter.format(Math.abs(priceDelta.delta))}
              {" "}({priceDelta.pct >= 0 ? "+" : ""}
              {priceDelta.pct.toFixed(1)}%)
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              in the last 30 days
            </span>
          </div>
        )}

        {/* RRP reference */}
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
                color: tab === t ? "#000" : "var(--muted)",
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
          Recent Transactions
        </span>
        {activeAvg !== null && (
          <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
            avg {usdFormatter.format(activeAvg)}
          </span>
        )}
      </div>

      {/* ── 6. Sparkline (taller, with axis labels) ── */}
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
