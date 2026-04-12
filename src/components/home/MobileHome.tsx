"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:             "#0e0e0e",
  primary:        "#ffc32c",
  onPrimary:      "#584000",
  surface:        "#131313",
  surfaceHigh:    "#1c1c1c",
  onSurface:      "#f0f0f4",
  muted:          "#68686e",
  green:          "#22c55e",
  amber:          "#f59e0b",
} as const;

const F = {
  headline: "Manrope, var(--font-manrope), sans-serif",
  label:    "'Space Grotesk', var(--font-space-grotesk), sans-serif",
  body:     "var(--font-geist-sans), system-ui, sans-serif",
} as const;

// ── Mock data ─────────────────────────────────────────────────────────────────
const RECENT_SCANS = [
  { setNumber: "75192", name: "Millennium Falcon",  price: 849,  gain: +12.0 },
  { setNumber: "42056", name: "Porsche 911 GT3",    price: 612,  gain:  +4.2 },
];

const MARKET_SIGNALS = [
  { setNumber: "21044", name: "Paris",            theme: "Architecture", badge: "Retiring",  color: C.amber, gain: 42.1 },
  { setNumber: "21309", name: "Apollo Saturn V",  theme: "Ideas",        badge: "Rising",    color: C.green, gain: 28.2 },
];

// ── Icons ─────────────────────────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function AvatarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={C.muted}>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function ScanCornerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.onPrimary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
      <polyline points="23 7 23 1 17 1" />
      <polyline points="1 17 1 23 7 23" />
      <polyline points="7 1 1 1 1 7" />
      <polyline points="17 23 23 23 23 17" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
    </svg>
  );
}

// ── Stagger helper ────────────────────────────────────────────────────────────
function rise(delay: string) {
  return { animation: `home-rise 0.45s cubic-bezier(0.16,1,0.3,1) ${delay} both` };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MobileHome() {
  return (
    <main
      className="min-h-screen pb-28"
      style={{ background: C.bg, color: C.onSurface, fontFamily: F.body }}
    >

      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-[60px]"
        style={{
          background: "rgba(14,14,14,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <button
          aria-label="Profile"
          className="w-9 h-9 flex items-center justify-center rounded-full active:opacity-70 transition-opacity"
          style={{ background: C.surface }}
        >
          <AvatarIcon />
        </button>

        <span
          className="text-xl font-black tracking-[-0.5px] select-none"
          style={{ color: C.primary, fontFamily: F.headline }}
        >
          BrickVal
        </span>

        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full active:opacity-70 transition-opacity"
        >
          <BellIcon />
        </button>
      </header>

      {/* ── Scrollable body ── */}
      <div className="pt-[76px] px-5 flex flex-col gap-9">

        {/* ── Portfolio ── */}
        <section style={rise("0.06s")}>

          {/* Label row */}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
            style={{ color: C.muted, fontFamily: F.label }}
          >
            Collection
          </p>

          {/* Value + badge */}
          <div className="flex items-end gap-3 mb-1">
            <h2
              className="text-[52px] leading-none font-black tracking-[-2px]"
              style={{
                fontFamily: F.headline,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              $12,450
            </h2>
            <span
              className="mb-2 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                color: C.primary,
                background: "rgba(255,195,44,0.10)",
                fontFamily: F.label,
              }}
            >
              <TrendUpIcon />
              +2.4%
            </span>
          </div>

          <p
            className="text-[12px] mb-5"
            style={{ color: C.muted, fontFamily: F.label }}
          >
            +$298 this month · 28 sets
          </p>

          {/* Sparkline — floats on dark background, no card wrapper */}
          <svg
            className="w-full block"
            height="68"
            viewBox="0 0 400 68"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sg-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ffc32c" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#ffc32c" stopOpacity="0"    />
              </linearGradient>
            </defs>
            <path
              d="M0 54 Q50 46 100 58 T200 26 T300 42 T400 10 L400 68 L0 68 Z"
              fill="url(#sg-area)"
              style={{ animation: "fill-fade 1s ease-out 0.7s both" }}
            />
            <path
              d="M0 54 Q50 46 100 58 T200 26 T300 42 T400 10"
              fill="none"
              stroke="#ffc32c"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                strokeDasharray: 520,
                strokeDashoffset: 520,
                animation: "draw-line 1.5s cubic-bezier(0.4,0,0.2,1) 0.15s forwards",
              }}
            />
            {/* End dot */}
            <circle
              cx="400" cy="10" r="3"
              fill="#ffc32c"
              style={{ animation: "fill-fade 0.3s ease-out 1.55s both" }}
            />
            <circle
              cx="400" cy="10" r="7"
              fill="rgba(255,195,44,0.2)"
              style={{ animation: "dot-pulse 0.8s ease-out 1.65s both" }}
            />
          </svg>

          {/* Month labels */}
          <div
            className="flex justify-between mt-2"
            style={{ fontFamily: F.label }}
            aria-hidden="true"
          >
            {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m) => (
              <span key={m} className="text-[9px]" style={{ color: C.muted }}>
                {m}
              </span>
            ))}
          </div>
        </section>

        {/* ── Scan CTA ── */}
        <section style={rise("0.12s")}>
          <Link
            href="/scan"
            className="flex items-center justify-between px-6 py-5 active:scale-[0.98] transition-transform select-none"
            style={{
              background: C.primary,
              borderRadius: 16,
              boxShadow: "0 10px 36px rgba(255,195,44,0.30), 0 2px 8px rgba(0,0,0,0.28)",
            }}
          >
            <div>
              <p
                className="text-[20px] font-black tracking-tight leading-none"
                style={{ color: C.onPrimary, fontFamily: F.headline }}
              >
                Scan a Set
              </p>
              <p
                className="text-[12px] mt-1.5 font-medium"
                style={{ color: "rgba(88,64,0,0.72)" }}
              >
                Identify &amp; value any LEGO set instantly
              </p>
            </div>
            <ScanCornerIcon />
          </Link>
        </section>

        {/* ── Recent Scans ── */}
        <section style={rise("0.18s")}>
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-[17px] font-bold tracking-tight"
              style={{ fontFamily: F.headline }}
            >
              Recent Scans
            </h3>
            <button
              className="flex items-center gap-0.5 text-[11px] font-semibold active:opacity-60 transition-opacity"
              style={{ color: C.primary, fontFamily: F.label }}
            >
              See all <ChevronRightIcon />
            </button>
          </div>

          {/* Horizontal scroll */}
          <div
            className="flex gap-3 overflow-x-auto pb-1"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as any}
          >
            {RECENT_SCANS.map((s) => (
              <div
                key={s.setNumber}
                className="shrink-0 overflow-hidden"
                style={{
                  width: 196,
                  background: C.surface,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Image */}
                <div
                  className="h-[116px] flex items-center justify-center"
                  style={{ background: "#0a0a0a", borderRadius: "14px 14px 0 0" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.bricklink.com/ItemImage/SN/0/${s.setNumber}-1.png`}
                    alt={s.name}
                    className="h-full w-full object-contain p-3"
                  />
                </div>

                {/* Info */}
                <div className="px-3 pb-3 pt-2.5">
                  <p
                    className="text-[13px] font-bold truncate leading-snug"
                    style={{ fontFamily: F.headline }}
                  >
                    {s.name}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ fontFamily: F.label, fontVariantNumeric: "tabular-nums" }}
                    >
                      ${s.price}
                    </span>
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: C.primary, fontFamily: F.label }}
                    >
                      +{s.gain}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Market Signals ── */}
        <section style={rise("0.24s")} className="pb-2">
          <h3
            className="text-[17px] font-bold tracking-tight mb-4"
            style={{ fontFamily: F.headline }}
          >
            Market Signals
          </h3>

          <div className="flex flex-col gap-2.5">
            {MARKET_SIGNALS.map((s) => (
              <div
                key={s.setNumber}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl"
                style={{
                  background: C.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Leading: gain % as primary visual anchor */}
                <div
                  className="shrink-0 w-14 text-right"
                  style={{ fontFamily: F.label, fontVariantNumeric: "tabular-nums" }}
                >
                  <p
                    className="text-[22px] font-black leading-none"
                    style={{ color: s.color }}
                  >
                    +{s.gain}
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-widest mt-0.5"
                    style={{ color: C.muted }}
                  >
                    pct
                  </p>
                </div>

                {/* Hairline divider */}
                <div
                  className="self-stretch shrink-0"
                  style={{ width: 1, background: "rgba(255,255,255,0.07)" }}
                />

                {/* Set image */}
                <div
                  className="w-11 h-11 shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "#0a0a0a", borderRadius: 8 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.bricklink.com/ItemImage/SN/0/${s.setNumber}-1.png`}
                    alt={s.name}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        color: s.color,
                        background: `color-mix(in oklch, ${s.color} 15%, transparent)`,
                        fontFamily: F.label,
                      }}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <p
                    className="text-[13px] font-bold truncate leading-snug"
                    style={{ fontFamily: F.headline }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: C.muted, fontFamily: F.label }}
                  >
                    {s.theme} · #{s.setNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}
