"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:                    "#0e0e0e",
  primary:               "#ffc32c",
  primaryContainer:      "#e9b011",
  onPrimary:             "#584000",
  surfaceContainerLow:   "#131313",
  surfaceContainerHigh:  "#20201f",
  onSurface:             "#ffffff",
  onSurfaceVariant:      "#adaaaa",
} as const;

const F = {
  headline: "Manrope, var(--font-manrope), sans-serif",
  label:    "'Space Grotesk', var(--font-space-grotesk), sans-serif",
  body:     "Inter, var(--font-geist-sans), sans-serif",
} as const;

// ── Static mock data ───────────────────────────────────────────────────────────
const RECENT_SCANS = [
  { setNumber: "75192", name: "Star Wars UCS Falcon",    price: 849.99, gain: 12.0 },
  { setNumber: "42056", name: "Technic Porsche 911 GT3", price: 612.40, gain: 4.2  },
];

const MARKET_TRENDS = [
  { setNumber: "21044", name: "Paris Skyline",        theme: "Architecture", badge: "Retiring Soon", gain: 42.00 },
  { setNumber: "21309", name: "NASA Apollo Saturn V",  theme: "Ideas",        badge: "Bullish",       gain: 28.15 },
];

// ── Icons (SVG) ───────────────────────────────────────────────────────────────
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffc32c">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
    </svg>
  );
}

function ScanFocusIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 15H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm0-10h4V3H5C3.9 3 3 3.9 3 5v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#adaaaa">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MobileHome() {
  return (
    <main className="min-h-screen pb-28" style={{ background: C.bg, color: C.onSurface, fontFamily: F.body }}>

      {/* ── TopAppBar ── */}
      <header
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16"
        style={{
          background: "rgba(14,14,14,0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,195,44,0.2)" }}
        >
          <UserIcon />
        </div>

        {/* Wordmark */}
        <h1
          className="text-2xl font-black tracking-tighter select-none"
          style={{ color: C.primary, fontFamily: F.headline }}
        >
          BrickValue
        </h1>

        {/* Bell */}
        <button className="active:opacity-60 transition-opacity">
          <BellIcon />
        </button>
      </header>

      {/* ── Scrollable content ── */}
      <div className="pt-24 px-6 flex flex-col gap-10">

        {/* ── Hero: collection value ── */}
        <section>
          <p
            className="uppercase text-xs tracking-widest mb-2"
            style={{ color: C.onSurfaceVariant, fontFamily: F.label }}
          >
            Your Collection Value
          </p>

          <div className="flex items-baseline gap-4 flex-wrap">
            <h2
              className="text-5xl font-extrabold tracking-tighter"
              style={{ fontFamily: F.headline }}
            >
              $12,450.00
            </h2>
            <span
              className="flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full"
              style={{ color: C.primary, background: "rgba(255,195,44,0.1)", fontFamily: F.label }}
            >
              <TrendingUpIcon />
              +2.4%
            </span>
          </div>

          {/* Sparkline — line draws itself left→right on mount */}
          <div
            className="mt-6 h-32 w-full relative overflow-hidden"
            style={{ background: C.surfaceContainerLow, borderRadius: 12 }}
          >
            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ffc32c" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ffc32c" stopOpacity="0"    />
                </linearGradient>
              </defs>
              {/* Area fill — fades in after the line starts */}
              <path
                d="M0 80 Q 50 70, 100 85 T 200 40 T 300 60 T 400 20 L400 100 L0 100 Z"
                fill="url(#sparkFill)"
                style={{ animation: "fill-fade 1s ease-out 0.7s both" }}
              />
              {/* Line — draws left→right */}
              <path
                d="M0 80 Q 50 70, 100 85 T 200 40 T 300 60 T 400 20"
                fill="none"
                stroke="#ffc32c"
                strokeWidth="3"
                strokeLinecap="round"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255,195,44,0.6))",
                  strokeDasharray: 620,
                  strokeDashoffset: 620,
                  animation: "draw-line 1.5s cubic-bezier(0.4,0,0.2,1) 0.1s forwards",
                }}
              />
              {/* End dot — appears when line arrives */}
              <circle
                cx="400" cy="20" r="4"
                fill="#ffc32c"
                style={{ animation: "fill-fade 0.3s ease-out 1.5s both" }}
              />
              <circle
                cx="400" cy="20" r="8"
                fill="rgba(255,195,44,0.2)"
                style={{ animation: "dot-pulse 0.8s ease-out 1.6s both" }}
              />
            </svg>
          </div>
        </section>

        {/* ── Scan CTA ── */}
        <section>
          <Link
            href="/scan"
            className="w-full h-32 flex items-center justify-between px-8 relative overflow-hidden active:scale-95 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${C.primary}, ${C.primaryContainer})`,
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(255,195,44,0.2)",
            }}
          >
            <div>
              <h3
                className="text-2xl font-bold"
                style={{ color: C.onPrimary, fontFamily: F.headline }}
              >
                Scan LEGO
              </h3>
              <p className="text-sm mt-1" style={{ color: "rgba(88,64,0,0.8)" }}>
                Identify sets instantly via camera
              </p>
            </div>
            <span style={{ color: "rgba(88,64,0,0.9)" }}>
              <ScanFocusIcon />
            </span>
          </Link>
        </section>

        {/* ── Recent Scans ── */}
        <section>
          <div className="flex justify-between items-end mb-5">
            <h3
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: F.headline }}
            >
              Recent Scans
            </h3>
            <button
              className="text-xs uppercase tracking-widest"
              style={{ color: C.primary, fontFamily: F.label }}
            >
              View All
            </button>
          </div>

          {/* Horizontal scroll — hide scrollbar */}
          <div
            className="flex gap-4 overflow-x-auto pb-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {RECENT_SCANS.map((set) => (
              <div
                key={set.setNumber}
                className="shrink-0 overflow-hidden"
                style={{ minWidth: 270, background: C.surfaceContainerHigh, borderRadius: 12 }}
              >
                {/* Image area */}
                <div className="h-40 relative flex items-center justify-center" style={{ background: "#111" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.bricklink.com/ItemImage/SN/0/${set.setNumber}-1.png`}
                    alt={set.name}
                    className="h-full w-full object-contain p-3"
                  />
                  {/* Set number badge */}
                  <div
                    className="absolute top-3 right-3 px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-white"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      borderRadius: 4,
                      fontFamily: F.label,
                    }}
                  >
                    {set.setNumber}
                  </div>
                </div>

                {/* Card info */}
                <div className="p-4">
                  <h4
                    className="font-bold text-lg truncate"
                    style={{ fontFamily: F.headline }}
                  >
                    {set.name}
                  </h4>
                  <p className="text-sm mt-1" style={{ color: C.onSurfaceVariant, fontFamily: F.label }}>
                    ${set.price.toFixed(2)}
                    <span className="ml-2 font-semibold" style={{ color: C.primary }}>
                      +{set.gain}%
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Market Trends ── */}
        <section className="pb-2">
          <h3
            className="text-2xl font-bold tracking-tight mb-5"
            style={{ fontFamily: F.headline }}
          >
            Market Trends
          </h3>

          <div className="flex flex-col gap-3">
            {MARKET_TRENDS.map((set) => (
              <div
                key={set.setNumber}
                className="flex items-center gap-4 p-4"
                style={{
                  background: C.surfaceContainerLow,
                  borderRadius: 12,
                  borderLeft: `4px solid ${C.primary}`,
                }}
              >
                {/* Thumbnail */}
                <div
                  className="w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "#000", borderRadius: 8 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.bricklink.com/ItemImage/SN/0/${set.setNumber}-1.png`}
                    alt={set.name}
                    className="w-full h-full object-contain p-1 opacity-90"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: C.primary, fontFamily: F.label }}
                  >
                    {set.badge}
                  </p>
                  <h4
                    className="font-bold truncate"
                    style={{ fontFamily: F.headline }}
                  >
                    {set.name}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: C.onSurfaceVariant }}>
                    {set.theme} · {set.setNumber}
                  </p>
                </div>

                {/* Gain */}
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: C.primary, fontFamily: F.label }}>
                    +${set.gain.toFixed(2)}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-wide mt-0.5"
                    style={{ color: C.onSurfaceVariant, fontFamily: F.label }}
                  >
                    This Month
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
