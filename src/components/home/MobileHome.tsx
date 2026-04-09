"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";

// ── Static mock data ─────────────────────────────────────────────────────────

const TOTAL_VALUE = 4284.0;
const TOTAL_PAID = 2150.0;
const TOTAL_GAIN = TOTAL_VALUE - TOTAL_PAID;
const GAIN_PCT = ((TOTAL_GAIN / TOTAL_PAID) * 100).toFixed(1);

const STATS = { total: 12, new: 8, used: 4 };

const TIME_TABS = ["7D", "1M", "3M", "6M", "1Y"] as const;

const SETS = [
  { setNumber: "75192", name: "Millennium Falcon", condition: "New",  qty: 1, value: 289.0,  paid: 200.0,  theme: "Star Wars" },
  { setNumber: "10294", name: "Titanic",           condition: "New",  qty: 1, value: 478.0,  paid: 285.0,  theme: "Creator" },
  { setNumber: "21325", name: "Medieval Blacksmith",condition: "Used", qty: 2, value: 248.0,  paid: 160.0,  theme: "Ideas" },
  { setNumber: "10281", name: "Bonsai Tree",       condition: "New",  qty: 3, value: 189.0,  paid: 135.0,  theme: "Botanical" },
];

// SVG chart path — smooth rising trend (y=0 top, y=100 bottom in viewBox 0 0 300 100)
const CHART_LINE = "M0,88 C25,84 45,78 70,68 C95,58 110,50 140,40 C168,30 190,20 225,13 C255,7 278,4 300,2";
const CHART_AREA = `${CHART_LINE} L300,100 L0,100 Z`;

// ── Component ────────────────────────────────────────────────────────────────

export function MobileHome() {
  const [activeTab, setActiveTab] = useState<(typeof TIME_TABS)[number]>("1Y");

  return (
    <main
      className="min-h-screen flex flex-col pb-24"
      style={{ background: "var(--background)" }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 pt-12 pb-3">
        <Logo size="sm" showText />
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <span>🇺🇸</span>
          <span>USD</span>
        </div>
      </header>

      {/* ── Collection Value ── */}
      <section className="px-5 pt-6 pb-1 text-center">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3"
          style={{ color: "var(--muted)" }}
        >
          Your collection is worth
        </p>
        <p
          className="text-5xl font-black tabular-nums leading-none mb-2"
          style={{ color: "#22c55e" }}
        >
          ${TOTAL_VALUE.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Total Paid · ${TOTAL_PAID.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
          <span style={{ color: "#22c55e" }}>(+{GAIN_PCT}%)</span>
        </p>
      </section>

      {/* ── Stats Row ── */}
      <section className="flex gap-2.5 px-5 pt-5 pb-1">
        {[
          { label: "Total Sets", value: STATS.total },
          { label: "New",        value: STATS.new },
          { label: "Used",       value: STATS.used },
        ].map((s) => (
          <div
            key={s.label}
            className="flex-1 rounded-2xl py-3 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-xl font-black" style={{ color: "var(--foreground)" }}>{s.value}</p>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: "var(--muted)" }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </section>

      {/* ── Chart ── */}
      <section className="px-5 pt-4">
        <div
          className="rounded-3xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Gain badge + date range */}
          <div className="flex items-center justify-between mb-1 px-1">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.22)",
              }}
            >
              +${TOTAL_GAIN.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({GAIN_PCT}%)
            </span>
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>All time</span>
          </div>

          {/* SVG line chart */}
          <div className="relative mt-2">
            <svg viewBox="0 0 300 100" className="w-full" style={{ height: 110 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.28" />
                  <stop offset="80%"  stopColor="#22c55e" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Filled area */}
              <path d={CHART_AREA} fill="url(#chartFill)" />
              {/* Line */}
              <path d={CHART_LINE} stroke="#22c55e" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* End dot */}
              <circle cx="300" cy="2" r="3.5" fill="#22c55e" />
              <circle cx="300" cy="2" r="7" fill="rgba(34,197,94,0.22)" />
            </svg>
          </div>

          {/* Time period tabs */}
          <div className="flex gap-1 mt-3">
            {TIME_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 rounded-full text-xs font-bold transition-all"
                style={
                  activeTab === tab
                    ? { background: "var(--accent)", color: "var(--accent-fg)" }
                    : { color: "var(--muted)" }
                }
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Performers ── */}
      <section className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
            Top Performers
          </p>
          <button className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
            See all
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {SETS.map((set) => {
            const gain    = set.value - set.paid;
            const gainPct = ((gain / set.paid) * 100).toFixed(0);
            return (
              <div
                key={set.setNumber}
                className="flex items-center gap-3 p-3 rounded-2xl active:opacity-80 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {/* Set thumbnail */}
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ background: "var(--surface-2)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.bricklink.com/ItemImage/SN/0/${set.setNumber}-1.png`}
                    alt={set.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-sm truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {set.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                    #{set.setNumber} · {set.condition} · Qty {set.qty}
                  </p>
                </div>

                {/* Value + gain */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    ${set.value.toFixed(2)}
                  </p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                  >
                    +{gainPct}%
                  </span>
                </div>

                {/* Chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 ml-0.5">
                  <path d="M9 18l6-6-6-6" stroke="#6b6b7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom nav */}
      <BottomNav />
    </main>
  );
}
