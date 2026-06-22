"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { MinifigInfo, MinifigPricing, BrickLinkDetail } from "@/types/market";
import { BrandMark } from "@/components/BrandMark";

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef<number>(0);
  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (target === 0) {
      prevTarget.current = 0;
      rafRef.current = requestAnimationFrame(() => setValue(0));
      return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    }
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

// ── Formatters ────────────────────────────────────────────────────────────────
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const usdDecimal = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatSaleDate(isoDate: string): string {
  try { return new Date(isoDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return isoDate; }
}
function formatShortDate(isoDate: string): string {
  try { return new Date(isoDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }); }
  catch { return isoDate; }
}

// ── Liquidity signal ──────────────────────────────────────────────────────────
function getLiquiditySignal(qty: number | null): { label: string; color: string } | null {
  if (!qty) return null;
  if (qty >= 15) return { label: "High liquidity", color: "#22c55e" };
  if (qty >= 5)  return { label: "Med liquidity",  color: "#f5c518" };
  return { label: "Low liquidity", color: "#f97316" };
}

// ── Price delta (newest half vs oldest half) ──────────────────────────────────
function computePriceDelta(details: BrickLinkDetail[]): { delta: number; pct: number } | null {
  const sorted = [...details].filter((d) => d.price_usd > 0 && d.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  if (sorted.length < 2) return null;
  const mid = Math.floor(sorted.length / 2);
  const newer = sorted.slice(0, mid);
  const older = sorted.slice(mid);
  const oldAvg = older.reduce((s, x) => s + x.price_usd, 0) / older.length;
  const newAvg = newer.reduce((s, x) => s + x.price_usd, 0) / newer.length;
  if (oldAvg === 0) return null;
  return { delta: newAvg - oldAvg, pct: ((newAvg - oldAvg) / oldAvg) * 100 };
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function MinifigSparkline({ details }: { details: BrickLinkDetail[] }) {
  const sorted = [...details].filter((d) => d.price_usd > 0 && d.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  if (sorted.length < 2) return null;
  const prices = sorted.map((d) => d.price_usd);
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
  const xLabels = [
    { label: formatShortDate(sorted[0].date!), x: toX(0) },
    { label: formatShortDate(sorted[sorted.length - 1].date!), x: toX(sorted.length - 1) },
  ];
  return (
    <div className="mx-4 mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }} aria-hidden="true">
        <defs>
          <linearGradient id="figSparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5c518" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f5c518" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map(({ price, y }, i) => (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={W - padRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="system-ui,-apple-system,sans-serif">
              {usd.format(price)}
            </text>
          </g>
        ))}
        <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {xLabels.map(({ label, x }, i) => (
          <text key={i} x={x} y={H - padBottom + 14} textAnchor={i === 0 ? "start" : "end"} fontSize="9" fill="rgba(255,255,255,0.35)" fontFamily="system-ui,-apple-system,sans-serif">
            {label}
          </text>
        ))}
        <polygon points={areaPoints} fill="url(#figSparkFill)" />
        <polyline points={linePoints} fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#f5c518" />)}
      </svg>
    </div>
  );
}

// ── BrickLink row ─────────────────────────────────────────────────────────────
function BLRow({ detail, type, isLast }: { detail: BrickLinkDetail; type: "sold" | "stock"; isLast: boolean }) {
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
        {usdDecimal.format(detail.price_usd)}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MinifigResultPage() {
  const params = useParams();
  const router = useRouter();
  const figNumber = (params.figNumber as string).replace(/[^a-z0-9]/gi, "");

  const [figInfo, setFigInfo] = useState<MinifigInfo | null>(null);
  const [pricing, setPricing] = useState<MinifigPricing | null>(null);
  const [error, setError] = useState<string | null>(figNumber ? null : "Invalid figure number.");
  const [loading, setLoading] = useState<boolean>(!!figNumber);
  const [tab, setTab] = useState<"used" | "new">("used");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

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
        // Auto-select tab: prefer used if has sold data, else new
        if (data.pricing) {
          const hasUsedSold = (data.pricing.used_sold_avg_usd ?? null) !== null;
          const hasNewSold  = (data.pricing.new_sold_avg_usd  ?? null) !== null;
          if (!hasUsedSold && hasNewSold) setTab("new");
        }
      })
      .catch(() => setError("Network error. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [figNumber, router]);

  // ── Derived pricing ───────────────────────────────────────────────────────
  // Treat 0 as no-data (BrickLink returns 0 avg when there are no transactions)
  const heroBase = tab === "used"
    ? (pricing?.used_sold_avg_usd || pricing?.used_stock_avg_usd || null)
    : (pricing?.new_sold_avg_usd  || pricing?.new_stock_avg_usd  || null);
  const heroUsd = heroBase !== null ? Math.round(heroBase * 100) / 100 : null;

  const heroFromSold = tab === "used"
    ? !!(pricing?.used_sold_avg_usd)
    : !!(pricing?.new_sold_avg_usd);

  const heroSaleQty = tab === "used"
    ? (pricing?.used_sold_qty ?? pricing?.used_stock_qty ?? null)
    : (pricing?.new_sold_qty  ?? pricing?.new_stock_qty  ?? null);

  const soldDetails = tab === "used"
    ? (pricing?.sold_details     ?? [])
    : (pricing?.sold_new_details ?? []);

  const stockDetails = tab === "used"
    ? (pricing?.stock_details     ?? [])
    : (pricing?.stock_new_details ?? []);

  const soldAvg  = tab === "used" ? (pricing?.used_sold_avg_usd  ?? null) : (pricing?.new_sold_avg_usd  ?? null);
  const stockAvg = tab === "used" ? (pricing?.used_stock_avg_usd ?? null) : (pricing?.new_stock_avg_usd ?? null);

  const hasUsedData = !!(pricing?.used_sold_avg_usd || pricing?.used_stock_avg_usd);
  const hasNewData  = !!(pricing?.new_sold_avg_usd  || pricing?.new_stock_avg_usd);
  const showTabs    = hasUsedData && hasNewData;

  const minUsd = tab === "used" ? (pricing?.used_sold_min_usd ?? null) : (pricing?.new_sold_min_usd ?? null);
  const maxUsd = tab === "used" ? (pricing?.used_sold_max_usd ?? null) : (pricing?.new_sold_max_usd ?? null);

  const liquiditySignal = getLiquiditySignal(heroSaleQty);
  const priceDelta      = computePriceDelta(soldDetails);

  // Platform spread
  const showPlatformSpread = !!(soldAvg || stockAvg);
  let askingGap: { pct: number; delta: number } | null = null;
  if (soldAvg !== null && stockAvg !== null && soldAvg > 0) {
    const pct = ((stockAvg - soldAvg) / soldAvg) * 100;
    askingGap = { pct, delta: stockAvg - soldAvg };
  }

  const animated = useCountUp(heroUsd ?? 0);

  // ── Share handler ─────────────────────────────────────────────────────────
  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const displayName = figInfo?.name ?? figNumber;
    const text = heroUsd !== null
      ? `${displayName} — ${usd.format(heroUsd)} market value`
      : displayName;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "BrickVal", text, url }); return; }
      catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch { /* silent */ }
  }

  const bricklinkUrl = figInfo?.fig_number
    ? `https://www.bricklink.com/v2/catalog/catalogitem.page?M=${figInfo.fig_number}#T=P`
    : null;

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Error ─────────────────────────────────────────────────────────────────
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

  const displayName = figInfo?.name ?? figNumber;
  const heroLabel = heroFromSold
    ? (tab === "new" ? "BL Avg Sold · New / Sealed" : "BL Avg Sold · Used")
    : (tab === "new" ? "BL Avg Listed · New / Sealed" : "BL Avg Listed · Used");

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* ── Header ── */}
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
        <BrandMark iconClassName="h-6 w-6" textClassName="text-sm" />
        <div className="w-9" />
      </header>

      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">

        {/* ── 1. Hero image ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 260 }}>
          {figInfo?.image_url && (
            <div
              className="absolute inset-0 scale-150 blur-3xl opacity-20"
              style={{ backgroundImage: `url(${figInfo.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          )}
          {figInfo?.image_url ? (
            <div className="relative flex items-center justify-center py-8 px-6 h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={figInfo.image_url}
                alt={displayName}
                className="max-h-56 object-contain drop-shadow-2xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <span className="text-6xl">🧱</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
        </div>

        {/* ── 2. Identity block ── */}
        <div className="px-5 pt-2 pb-5 flex flex-col items-center gap-1.5">
          <div className="w-full flex justify-end mb-1">
            <button onClick={handleShare} aria-label="Share"
              className="p-2 rounded-full transition-opacity active:opacity-60"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              {shareState === "copied" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="12" cy="3" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="4" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="12" cy="13" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5.7 7.1l4.7-2.8M5.7 8.9l4.7 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <h1 className="text-xl font-bold leading-tight text-center" style={{ color: "var(--foreground)" }}>
            🧱 {displayName}
          </h1>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {[
              `Minifig · ${figInfo?.fig_number ?? figNumber}`,
              figInfo?.year_released && String(figInfo.year_released),
            ].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* ── 3. Hero price card ── */}
        <div className="mx-5 mb-5 rounded-3xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* Condition tabs */}
          {showTabs && (
            <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
              {(["used", "new"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all"
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
            {heroUsd === null ? (
              <p className="text-sm font-medium px-4 py-3 rounded-xl mx-auto max-w-xs text-center"
                style={{ color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                No transaction data available on BrickLink
              </p>
            ) : (
              <p className="text-5xl font-bold leading-none tabular-nums" style={{ color: "var(--foreground)" }}
                aria-label={usd.format(heroUsd)}>
                {usd.format(animated)}
              </p>
            )}
            {heroUsd !== null && heroFromSold && heroSaleQty ? (
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Based on {heroSaleQty} real {heroSaleQty === 1 ? "sale" : "sales"} · last 6 months
                </p>
                {liquiditySignal && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${liquiditySignal.color}18`, color: liquiditySignal.color, border: `1px solid ${liquiditySignal.color}40` }}>
                    {liquiditySignal.label}
                  </span>
                )}
              </div>
            ) : heroUsd !== null && heroSaleQty ? (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>{heroSaleQty} active listings · asking prices</p>
            ) : heroUsd !== null ? (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>USD · BrickLink</p>
            ) : null}
            {heroUsd !== null && !heroFromSold && (
              <p className="text-[11px] mt-2 px-2" style={{ color: "#f97316" }}>
                Asking price only — no sold transactions recorded on BrickLink
              </p>
            )}
            {minUsd !== null && maxUsd !== null && (minUsd > 0 || maxUsd > 0) && (
              <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                Range: {usdDecimal.format(minUsd)} – {usdDecimal.format(maxUsd)}
              </p>
            )}
          </div>

          {/* Trend row */}
          {priceDelta !== null && (
            <div className="px-6 pb-5" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="pt-4 flex items-center justify-center gap-3 flex-wrap">
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
                  {priceDelta.delta >= 0 ? "+" : ""}{usdDecimal.format(Math.abs(priceDelta.delta))}
                  {" "}({priceDelta.pct >= 0 ? "+" : ""}{priceDelta.pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Platform spread ── */}
        {showPlatformSpread && (
          <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Price by source
              </p>
            </div>
            <div className="flex" style={{ borderTop: "1px solid var(--border)" }}>
              {soldAvg !== null && (
                <div className="flex-1 px-3 py-3 text-center">
                  <p className="text-[10px] font-medium mb-1" style={{ color: "var(--muted)" }}>BL Sold</p>
                  {soldAvg === 0 ? (
                    <p className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>No transactions</p>
                  ) : (
                    <p className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{usdDecimal.format(soldAvg)}</p>
                  )}
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--muted)" }}>real sales</p>
                </div>
              )}
              {stockAvg !== null && (
                <div className="flex-1 px-3 py-3 text-center" style={soldAvg !== null ? { borderLeft: "1px solid var(--border)" } : {}}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: "var(--muted)" }}>BL Listed</p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{usdDecimal.format(stockAvg)}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--muted)" }}>asking</p>
                </div>
              )}
            </div>
            {askingGap !== null && (
              <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-[11px] text-center" style={{ color: "var(--muted)" }}>
                  {askingGap.pct >= 0
                    ? `Sellers asking ${askingGap.pct.toFixed(0)}% above recent sold prices`
                    : `Sellers asking ${Math.abs(askingGap.pct).toFixed(0)}% below recent sold prices`}
                  {" · "}
                  <span style={{ color: askingGap.pct >= 0 ? "#f97316" : "#22c55e", fontWeight: 600 }}>
                    {askingGap.pct >= 0 ? "+" : ""}{usdDecimal.format(askingGap.delta)}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 5. BrickLink active badge ── */}
        {(soldDetails.length > 0 || stockDetails.length > 0) && (
          <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
            style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.15)" }}>
            <span className="text-base leading-none mt-0.5">📦</span>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>BrickLink</span>
              {soldDetails.length > 0
                ? " — real sold transactions from the last 6 months."
                : " — active store listings (asking prices)."}
            </p>
          </div>
        )}

        {/* ── 6. Sold transactions + sparkline ── */}
        {soldDetails.length > 0 && (
          <div className="mb-4">
            <div className="mx-4 rounded-t-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderBottom: "none" }}>
              <div className="px-4 pt-3.5 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  BrickLink Sold · {tab === "new" ? "New / Sealed" : "Used"}
                </p>
              </div>
            </div>
            <MinifigSparkline details={soldDetails} />
            <div className="mx-4 rounded-b-2xl overflow-hidden" style={{ border: "1px solid var(--border)", borderTop: "none" }}>
              {[...soldDetails]
                .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
                .slice(0, 8).map((d, i) => (
                <BLRow key={i} detail={d} type="sold" isLast={i === Math.min(soldDetails.length, 8) - 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── 7. Stock listings ── */}
        {stockDetails.length > 0 && (
          <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 pt-3.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                BrickLink Listings · {tab === "new" ? "New / Sealed" : "Used"}
              </p>
            </div>
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {stockDetails.slice(0, 5).map((d, i) => (
                <BLRow key={i} detail={d} type="stock" isLast={i === Math.min(stockDetails.length, 5) - 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── 8. Buy CTA ── */}
        {bricklinkUrl && (
          <div className="mx-5 mb-5">
            <a href={bricklinkUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-xs font-bold transition-opacity active:opacity-70"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1C3.69 1 1 3.69 1 7s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1 7h12M7 1c-1.5 1.8-2.5 3.8-2.5 6s1 4.2 2.5 6M7 1c1.5 1.8 2.5 3.8 2.5 6s-1 4.2-2.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              View on BrickLink
            </a>
          </div>
        )}

        {/* ── 9. Attribution ── */}
        <p className="text-center text-[11px] pb-2 pt-1 px-4" style={{ color: "var(--muted)" }}>
          Source: BrickLink · USD · No affiliation · For reference only
        </p>

        {/* ── 10. Scan another CTA ── */}
        <div className="px-5 pb-8 pt-3">
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

      </div>
    </main>
  );
}
