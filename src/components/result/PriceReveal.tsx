"use client";

import { useEffect, useRef, useState } from "react";
import type { BrickLinkDetail, ComputedPricing, EbaySale, SetInfo } from "@/types/market";

interface Props {
  setInfo: SetInfo | null;
  pricing: ComputedPricing;
  setNumber?: string;
}

// ── Animated count-up hook ──────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
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

// ── Formatters ───────────────────────────────────────────────────────────────
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function formatSaleDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch { return isoDate; }
}
function formatShortDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  } catch { return isoDate; }
}

// ── Convert BrickLink sold details → EbaySale[] for sparkline reuse ──────────
function blDetailsToEbaySales(details: BrickLinkDetail[]): EbaySale[] {
  return details
    .filter((d) => d.price_usd > 0)
    .map((d) => ({
      title: `BrickLink sale${d.country ? ` · ${d.country}` : ""}`,
      price_usd: d.price_usd,
      sold_date: d.date ?? new Date().toISOString(),
      condition: "New",
      item_url: "#",
    }))
    .sort((a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime());
}

// ── 30-day price delta ───────────────────────────────────────────────────────
// Sales are sorted newest-first, so slice(0, mid) = newer half, slice(mid) = older half.
function computePriceDelta(sales: EbaySale[]): { delta: number; pct: number } | null {
  if (sales.length < 2) return null;
  const mid = Math.floor(sales.length / 2);
  const newer = sales.slice(0, mid);   // first half = most recent (array is newest-first)
  const older = sales.slice(mid);      // second half = oldest
  const oldAvg = older.reduce((s, x) => s + x.price_usd, 0) / older.length;
  const newAvg = newer.reduce((s, x) => s + x.price_usd, 0) / newer.length;
  if (oldAvg === 0) return null;
  return { delta: newAvg - oldAvg, pct: ((newAvg - oldAvg) / oldAvg) * 100 };
}

// ── Retirement pill (from BrickLink is_obsolete) ─────────────────────────────
function RetirementPill({ isObsolete }: { isObsolete: boolean }) {
  const styles = isObsolete
    ? { bg: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", label: "Retired" }
    : { bg: "rgba(34,197,94,0.10)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", label: "Available" };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: styles.bg, color: styles.color, border: styles.border }}>
      {styles.label}
    </span>
  );
}


// ── Sparkline ────────────────────────────────────────────────────────────────
function PriceSparkline({ sales, dataSource }: { sales: EbaySale[]; dataSource: "sold" | "listing" }) {
  if (sales.length < 2) return null;
  const prices = sales.map((s) => s.price_usd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const W = 340, H = 140, padLeft = 52, padRight = 8, padTop = 12, padBottom = 28;
  const toX = (i: number) => padLeft + (i / (prices.length - 1)) * (W - padLeft - padRight);
  const toY = (p: number) => max === min
    ? padTop + (H - padTop - padBottom) / 2
    : padTop + ((max - p) / (max - min)) * (H - padTop - padBottom);
  const coords = prices.map((p, i) => ({ x: toX(i), y: toY(p) }));
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `${padLeft},${H - padBottom} ${linePoints} ${W - padRight},${H - padBottom}`;
  const yLabels = [
    { price: max, y: toY(max) },
    { price: (max + min) / 2, y: toY((max + min) / 2) },
    { price: min, y: toY(min) },
  ];
  let xLabels: { label: string; x: number }[];
  if (dataSource === "sold") {
    xLabels = [
      { label: formatShortDate(sales[sales.length - 1].sold_date), x: toX(0) },
      { label: formatShortDate(sales[0].sold_date), x: toX(sales.length - 1) },
    ];
  } else {
    const now = new Date();
    const ago = new Date(now); ago.setDate(now.getDate() - 30);
    xLabels = [
      { label: formatShortDate(ago.toISOString()), x: toX(0) },
      { label: formatShortDate(now.toISOString()), x: toX(sales.length - 1) },
    ];
  }
  return (
    <div className="mx-4 mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} aria-hidden="true">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map(({ price, y }, i) => (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="system-ui, -apple-system, sans-serif">
              {usdFormatter.format(price)}
            </text>
          </g>
        ))}
        <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {xLabels.map(({ label, x }, i) => (
          <text key={i} x={x} y={H - padBottom + 14} textAnchor={i === 0 ? "start" : "end"} fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="system-ui, -apple-system, sans-serif">
            {label}
          </text>
        ))}
        <polygon points={areaPoints} fill="url(#sparkFill)" />
        <polyline points={linePoints} fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#f5c518" />)}
      </svg>
    </div>
  );
}

// ── eBay sale row (clickable link) ───────────────────────────────────────────
function EbaySaleRow({ sale, dotColor, isLast }: { sale: EbaySale; dotColor: string; isLast: boolean }) {
  return (
    <a href={sale.item_url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-70"
      style={{ background: "var(--surface)", borderBottom: isLast ? "none" : "1px solid var(--border)", textDecoration: "none" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-snug" style={{ color: "var(--foreground)" }}>{sale.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{formatSaleDate(sale.sold_date)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-black tabular-nums" style={{ color: "var(--accent)" }}>{usdFormatter.format(sale.price_usd)}</span>
        <span className="text-base leading-none" style={{ color: "var(--muted)" }}>›</span>
      </div>
    </a>
  );
}

// ── BrickLink row (non-clickable — no listing URL from price guide API) ──────
function BrickLinkRow({ detail, type, isLast }: { detail: BrickLinkDetail; type: "sold" | "stock"; isLast: boolean }) {
  const dotColor = type === "sold" ? "var(--accent)" : "var(--muted)";
  const label = type === "sold"
    ? `BrickLink sold${detail.country ? ` · ${detail.country}` : ""}${detail.quantity > 1 ? ` (×${detail.quantity})` : ""}`
    : `BrickLink listing${detail.country ? ` · ${detail.country}` : ""}${detail.quantity > 1 ? ` · qty ${detail.quantity}` : ""}`;
  const sub = type === "sold" && detail.date ? formatSaleDate(detail.date) : "Currently available";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5"
      style={{ background: "var(--surface)", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-snug" style={{ color: "var(--foreground)" }}>{label}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>
      </div>
      <span className="text-sm font-black tabular-nums shrink-0" style={{ color: "var(--accent)" }}>
        {usdFormatter.format(detail.price_usd)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PriceReveal({ setInfo, pricing, setNumber }: Props) {
  // ── Determine data availability ──────────────────────────────────────────
  const hasBLSoldNew  = pricing.bricklink_sold_new_details.length > 0;
  const hasBLSoldUsed = pricing.bricklink_sold_used_details.length > 0;
  const hasBLStockNew  = pricing.bricklink_stock_new_details.length > 0;
  const hasBLStockUsed = pricing.bricklink_stock_used_details.length > 0;
  const hasBLSold  = hasBLSoldNew || hasBLSoldUsed;
  const hasBLStock = hasBLStockNew || hasBLStockUsed;
  const hasBrickLink = hasBLSold || hasBLStock
    || pricing.bricklink_new_avg_usd !== null
    || pricing.bricklink_used_avg_usd !== null;

  // Tab shows if either source has data for that condition
  const hasNew  = pricing.ebay_new_sales.length > 0  || hasBLSoldNew  || pricing.bricklink_new_avg_usd  !== null || pricing.bricklink_stock_new_avg_usd  !== null;
  const hasUsed = pricing.ebay_used_sales.length > 0 || hasBLSoldUsed || pricing.bricklink_used_avg_usd !== null || pricing.bricklink_stock_used_avg_usd !== null;

  const [tab, setTab] = useState<"new" | "used">(hasNew ? "new" : "used");

  // ── Convert BrickLink sold details for sparkline ──────────────────────────
  const blSoldNewSales  = blDetailsToEbaySales(pricing.bricklink_sold_new_details);
  const blSoldUsedSales = blDetailsToEbaySales(pricing.bricklink_sold_used_details);

  // ── Active transaction rows and sparkline source ──────────────────────────
  // Priority: BrickLink sold → eBay (sold or listing)
  const activeTransactions: EbaySale[] = hasBLSold
    ? (tab === "new" ? blSoldNewSales  : blSoldUsedSales)
    : (tab === "new" ? pricing.ebay_new_sales : pricing.ebay_used_sales);

  // Sparkline: BrickLink sold has real dates → "sold"; eBay follows its data_source
  const activeDataSource: "sold" | "listing" = hasBLSold ? "sold" : pricing.data_source;

  // Current stock details for the separate BrickLink listings section
  const activeStockDetails: BrickLinkDetail[] = tab === "new"
    ? pricing.bricklink_stock_new_details
    : pricing.bricklink_stock_used_details;

  // ── Hero price — BrickLink sold → eBay → BrickLink stock (same condition only)
  const heroUsd = tab === "new"
    ? (pricing.bricklink_new_avg_usd  ?? pricing.ebay_new_avg_usd  ?? pricing.bricklink_stock_new_avg_usd)
    : (pricing.bricklink_used_avg_usd ?? pricing.ebay_used_avg_usd ?? pricing.bricklink_stock_used_avg_usd);

  const heroFromBLSold = tab === "new"
    ? pricing.bricklink_new_avg_usd  !== null
    : pricing.bricklink_used_avg_usd !== null;
  const heroFromBLStock = !heroFromBLSold && (tab === "new"
    ? pricing.bricklink_stock_new_avg_usd  !== null
    : pricing.bricklink_stock_used_avg_usd !== null);
  const heroFromEbaySold = !heroFromBLSold && !heroFromBLStock && pricing.data_source === "sold";

  // Average shown in section header
  const activeAvg = tab === "new"
    ? (pricing.bricklink_new_avg_usd  ?? pricing.ebay_new_avg_usd)
    : (pricing.bricklink_used_avg_usd ?? pricing.ebay_used_avg_usd);

  const dotColor = tab === "new" ? "var(--accent)" : "var(--muted)";

  const animated = useCountUp(heroUsd ?? 0);
  const priceDelta = computePriceDelta(activeTransactions);

  // ── Hero label ────────────────────────────────────────────────────────────
  let heroLabel: string;
  if (heroFromBLSold) {
    heroLabel = tab === "new" ? "BrickLink Avg Sold · New / Sealed" : "BrickLink Avg Sold · Used";
  } else if (heroFromBLStock) {
    heroLabel = tab === "new" ? "BrickLink Avg Listed · New / Sealed" : "BrickLink Avg Listed · Used";
  } else if (heroFromEbaySold) {
    heroLabel = tab === "new" ? "Avg Sold Price · New / Sealed" : "Avg Sold Price · Used";
  } else {
    heroLabel = tab === "new" ? "Avg Listing Price · New / Sealed" : "Avg Listing Price · Used";
  }

  // ── Sale count for hero badge ─────────────────────────────────────────────
  const heroSaleQty = tab === "new"
    ? (pricing.bricklink_new_qty ?? pricing.bricklink_stock_new_qty)
    : (pricing.bricklink_used_qty ?? pricing.bricklink_stock_used_qty);

  // ── Section header label ──────────────────────────────────────────────────
  let sectionLabel: string;
  if (hasBLSold) {
    sectionLabel = "BrickLink Sold Transactions";
  } else if (pricing.data_source === "sold") {
    sectionLabel = "Recent Transactions";
  } else {
    sectionLabel = "Active eBay Listings";
  }

  // ── Image — from BrickLink item ───────────────────────────────────────────
  const imageUrl = setInfo?.image_url ?? null;
  const displayName = setInfo?.name ?? (setNumber ? `Set #${setNumber}` : "LEGO Set");

  return (
    <div className="w-full flex flex-col">

      {/* ── 1. Hero image ── */}
      <div className="relative w-full overflow-hidden" style={{ height: 260 }}>
        {imageUrl && (
          <>
            {/* Blurred background */}
            <div
              className="absolute inset-0 scale-150 blur-3xl opacity-20"
              style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          </>
        )}
        {imageUrl ? (
          <div className="relative flex items-center justify-center py-8 px-6 h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={displayName}
              className="max-h-56 object-contain drop-shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
            <span className="text-6xl">🧱</span>
          </div>
        )}
        {/* gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
      </div>

      {/* ── 2. Identity block ── */}
      <div className="px-5 pt-2 pb-5 text-center flex flex-col items-center gap-1.5">
        <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
          🧱 {displayName}
        </h1>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {[
            setInfo?.set_number && `#${setInfo.set_number.replace(/-\d+$/, "")}`,
            setInfo?.year_released && String(setInfo.year_released),
          ].filter(Boolean).join(" · ")}
        </p>
        {setInfo && <RetirementPill isObsolete={setInfo.is_obsolete} />}
      </div>

      {/* ── 3. Hero price card ── */}
      <div className="mx-5 mb-5 rounded-3xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {/* Condition tabs */}
        {hasNew && hasUsed && (
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {(["new", "used"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${
                  tab === t ? "" : ""
                }`}
                style={{
                  background: tab === t ? "rgba(245,197,24,0.08)" : "transparent",
                  color: tab === t ? "var(--accent)" : "var(--muted)",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                }}>
                {t === "new" ? "New / Sealed" : "Used"}
              </button>
            ))}
          </div>
        )}

        {/* Price display */}
        <div className="relative p-6 pb-4 text-center"
          style={{ background: "linear-gradient(to bottom, rgba(245,197,24,0.04), transparent)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            {heroLabel}
          </p>
          <p className="text-5xl font-bold leading-none tabular-nums" style={{ color: "var(--foreground)" }}
            aria-label={heroUsd !== null ? usdFormatter.format(heroUsd) : "N/A"}>
            {heroUsd !== null ? usdFormatter.format(animated) : "N/A"}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>USD median price</p>
        </div>

        {/* Trend + RRP row */}
        <div className="px-6 pb-5 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-4 flex items-center justify-center gap-3">
            {priceDelta !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: priceDelta.delta >= 0 ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                  color: priceDelta.delta >= 0 ? "#22c55e" : "#ef4444",
                  border: `1px solid ${priceDelta.delta >= 0 ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.30)"}`,
                }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                  style={{ transform: priceDelta.delta >= 0 ? "rotate(0deg)" : "rotate(180deg)" }}>
                  <path d="M1 7 L5 2 L9 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {priceDelta.delta >= 0 ? "+" : ""}{usdFormatter.format(Math.abs(priceDelta.delta))}
                {" "}({priceDelta.pct >= 0 ? "+" : ""}{priceDelta.pct.toFixed(1)}%)
              </span>
            )}
            {pricing.rrp_usd && (
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                RRP: ~{usdFormatter.format(pricing.rrp_usd)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Data source banner ── */}
      {hasBrickLink && (
        <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)" }}>
          <span className="text-sm leading-none mt-0.5">✅</span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            {heroFromBLSold
              ? `Sold price from BrickLink (last 6 months).${heroSaleQty ? ` Based on ${heroSaleQty} sales.` : ""}`
              : heroFromBLStock
                ? `No recent BrickLink sold data. Showing current BrickLink listing prices.${heroSaleQty ? ` ${heroSaleQty} listings.` : ""}`
                : "BrickLink data available below for reference."}
            {" "}eBay listings shown below.
          </p>
        </div>
      )}
      {!hasBrickLink && pricing.data_source !== "sold" && (
        <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={{ background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.20)" }}>
          <span className="text-sm leading-none mt-0.5">⚠️</span>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            No recent sold transactions found. Prices shown are current eBay listing prices.
          </p>
        </div>
      )}

      {/* ── 6. BrickLink sold transactions ── */}
      {hasBLSold && (
        <>
          <div className="mx-4 mb-2 flex justify-between items-center px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              {sectionLabel}
            </span>
            {activeAvg !== null && (
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
                avg {usdFormatter.format(activeAvg)}
              </span>
            )}
          </div>

          {/* Sparkline — BrickLink sold with real dates */}
          <PriceSparkline sales={activeTransactions} dataSource={activeDataSource} />

          <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(tab === "new" ? pricing.bricklink_sold_new_details : pricing.bricklink_sold_used_details)
              .slice(0, 10)
              .map((d, i, arr) => (
                <BrickLinkRow key={i} detail={d} type="sold" isLast={i === arr.length - 1} />
              ))}
          </div>
        </>
      )}

      {/* ── 7. BrickLink current stock (active listings) ── */}
      {hasBLStock && activeStockDetails.length > 0 && (
        <>
          <div className="mx-4 mb-2 flex justify-between items-center px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              BrickLink Current Listings
            </span>
            {(tab === "new" ? pricing.bricklink_stock_new_avg_usd : pricing.bricklink_stock_used_avg_usd) !== null && (
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
                avg {usdFormatter.format(
                  (tab === "new" ? pricing.bricklink_stock_new_avg_usd : pricing.bricklink_stock_used_avg_usd)!
                )}
              </span>
            )}
          </div>

          {/* Sparkline for stock — only show if no BrickLink sold data (avoids double chart) */}
          {!hasBLSold && (
            <PriceSparkline sales={blDetailsToEbaySales(activeStockDetails)} dataSource="listing" />
          )}

          <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {activeStockDetails.slice(0, 10).map((d, i, arr) => (
              <BrickLinkRow key={i} detail={d} type="stock" isLast={i === arr.length - 1} />
            ))}
          </div>
        </>
      )}

      {/* ── 8. eBay listings — shown when NO BrickLink data at all ── */}
      {!hasBLSold && !hasBLStock && (
        <>
          <div className="mx-4 mb-2 flex justify-between items-center px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              {pricing.data_source === "sold" ? "Recent Transactions" : "Active eBay Listings"}
            </span>
            {activeAvg !== null && (
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>
                avg {usdFormatter.format(activeAvg)}
              </span>
            )}
          </div>

          <PriceSparkline sales={activeTransactions} dataSource={pricing.data_source} />

          <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {activeTransactions.map((sale, i) => (
              <EbaySaleRow key={i} sale={sale} dotColor={dotColor} isLast={i === activeTransactions.length - 1} />
            ))}
          </div>
        </>
      )}

      {/* ── 9. Attribution ── */}
      <p className="text-center text-[11px] pb-8 pt-1 px-4" style={{ color: "var(--muted)" }}>
        {hasBLSold && !hasBLStock
          ? "Source: BrickLink (sold) + eBay (listings) · USD"
          : hasBLSold && hasBLStock
            ? "Source: BrickLink (sold + listed) + eBay (listings) · USD"
            : hasBLStock
              ? "Source: BrickLink (listed) + eBay (listings) · USD"
              : pricing.data_source === "sold"
                ? "Source: eBay Global · sold prices · USD"
                : "Source: eBay · listing prices · USD"}
      </p>
    </div>
  );
}
