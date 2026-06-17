"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { joinWaitlist, createLifetimeCheckout } from "@/app/waitlist-action";

const steps = [
  { icon: "📷", title: "Take a photo", desc: "Point your camera at any LEGO box" },
  { icon: "🤖", title: "AI reads it", desc: "Claude Vision finds the set number" },
  { icon: "💰", title: "See the value", desc: "USD market price, retirement status, and deal score — instantly" },
];

const appScreens = [
  {
    label: "Collection",
    title: "Track your LEGO portfolio",
    body: "$12,450 total value",
    accent: "+2.4%",
  },
  {
    label: "Scanner",
    title: "Scan sets in seconds",
    body: "Camera + manual set number",
    accent: "75192",
  },
  {
    label: "Result",
    title: "See the market value",
    body: "Millennium Falcon",
    accent: "$671",
  },
];

const STUDS = Array.from({ length: 10 });
const siteUrl = "https://brickvalue.live";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BrickVal",
    alternateName: "Brickvalue.live",
    url: siteUrl,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "iOS, Android, Web",
    description:
      "BrickVal helps LEGO collectors scan a LEGO box or enter a set number to estimate current USD market value using BrickLink and eBay market data.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BrickVal",
    url: siteUrl,
    email: "privacy@brickvalue.live",
    description:
      "BrickVal builds tools for LEGO collectors to identify sets and check current market value.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BrickVal",
    alternateName: "Brickvalue.live",
    url: siteUrl,
    description:
      "A LEGO set value scanner for checking USD market prices, retirement status, and resale signals.",
  },
];

function StudRow() {
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      {STUDS.map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full"
          style={{
            background: "var(--accent)",
            boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(245,197,24,0.3)",
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  const [activeTab, setActiveTab] = useState<"notify" | "lifetime">("notify");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");

  async function handleWaitlist() {
    if (!email || status === "loading") return;
    setStatus("loading");
    const result = await joinWaitlist(email);
    if (result.ok && result.duplicate) setStatus("duplicate");
    else if (result.ok) setStatus("success");
    else setStatus("error");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl border-b"
        style={{ background: "rgba(13,13,15,0.8)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <span className="font-bold text-sm" style={{ color: "var(--accent-fg)" }}>B</span>
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            BrickVal
          </span>
        </div>
        <Link
          href="/scan"
          className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Get started
        </Link>
      </motion.nav>

      {/* ── Hero Section ── */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 pt-28 pb-16 text-center max-w-lg mx-auto w-full overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--border)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
              style={{ background: "var(--accent)" }}
            />
            LEGO set value checker
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            LEGO Set<br />
            <span style={{ color: "var(--accent)" }}>Value Scanner</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base leading-relaxed max-w-sm"
            style={{ color: "var(--muted)" }}
          >
            Check what a LEGO set is worth in USD. Scan the box or enter a set number to see market value, retirement status, and resale signals.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
          >
            <Link
              href="/scan"
              className="w-full sm:flex-1 text-center font-black py-4 px-6 rounded-2xl text-lg transition-all active:scale-95 hover:glow-accent-sm"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Scan a set — free
            </Link>
            <button
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:flex-1 font-bold py-4 px-6 rounded-2xl text-lg transition-all active:scale-95"
              style={{
                background: "transparent",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              Get early access ↓
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex items-center gap-6"
            style={{ color: "var(--muted)" }}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <span>⚡</span><span>Instant results</span>
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-1.5 text-sm">
              <span>🤖</span><span>AI-powered</span>
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-1.5 text-sm">
              <span>💵</span><span>USD prices</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── App previews ── */}
      <section className="border-t px-6 py-20" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "var(--muted)" }}>
              App preview
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              Built for fast LEGO valuation
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {appScreens.map((screen, i) => (
              <motion.div
                key={screen.label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="rounded-[2rem] overflow-hidden"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 18px 60px -24px rgba(0,0,0,0.8)",
                }}
              >
                <div className="px-5 pt-5 pb-4" style={{ background: "var(--surface)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      {screen.label}
                    </span>
                    <span className="w-8 h-8 rounded-full" style={{ background: "var(--accent)" }} />
                  </div>
                  <h3 className="text-xl font-black leading-tight" style={{ color: "var(--foreground)" }}>
                    {screen.title}
                  </h3>
                  <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                    {screen.body}
                  </p>
                </div>

                <div className="p-5">
                  <div
                    className="rounded-3xl p-4 min-h-[220px] flex flex-col justify-between"
                    style={{
                      background: "linear-gradient(180deg, rgba(245,197,24,0.12), rgba(13,13,15,0.4))",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>BrickVal</span>
                      <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                        {screen.accent}
                      </span>
                    </div>
                    <div>
                      <div className="h-24 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-3 w-3/4 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.18)" }} />
                      <div className="h-3 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t px-6 py-20" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-center mb-12"
            style={{ color: "var(--muted)" }}
          >
            How it works
          </motion.p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="flex flex-col items-center gap-4 text-center group"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all group-hover:glow-accent-sm"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  {step.icon}
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: "var(--foreground)" }}>{step.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Mini result demo ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-14 flex flex-col items-center gap-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
              Here&apos;s what you get
            </p>
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 8px 40px -12px rgba(0,0,0,0.6)" }}
            >
              {/* Set image area */}
              <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{ background: "var(--surface)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.bricklink.com/ItemImage/SN/0/75192-1.png"
                  alt="LEGO Millennium Falcon 75192"
                  className="h-full w-full object-contain"
                  style={{ padding: "8px" }}
                />
                <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
              </div>

              {/* Identity */}
              <div className="px-4 pt-1 pb-3 text-center">
                <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>Millennium Falcon</p>
                <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>#75192 · 2017</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                    Retired
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.28)" }}>
                    💎 Retired &amp; Appreciating
                  </span>
                </div>
              </div>

              {/* Price card */}
              <div className="mx-3 mb-3 rounded-2xl p-4 text-center"
                style={{ border: "1px solid var(--border)", background: "linear-gradient(to bottom, rgba(245,197,24,0.05), transparent)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                  BrickLink Avg Sold · New / Sealed
                </p>
                <p className="text-4xl font-bold tabular-nums leading-none" style={{ color: "var(--foreground)" }}>$289</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Based on 42 real sales · last 6 months</p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.18)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.30)" }}>
                    +43% vs retail
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>RRP: ~$200</span>
                </div>
              </div>

              {/* Sample transaction rows */}
              <div className="mx-3 mb-3 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {[
                  { label: "BrickLink sold · US", date: "12 Mar 2026", price: "$295" },
                  { label: "BrickLink sold · DE", date: "8 Mar 2026", price: "$281" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3"
                    style={{ background: "var(--surface)", borderBottom: i === 0 ? "1px solid var(--border)" : "none" }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{row.label}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted)" }}>{row.date}</p>
                    </div>
                    <span className="text-xs font-black tabular-nums" style={{ color: "var(--accent)" }}>{row.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Data Sources ── */}
      <section className="py-20 px-6" style={{ background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-4"
            style={{ color: "var(--muted)" }}
          >
            Trusted Data
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold mb-6"
            style={{ color: "var(--foreground)" }}
          >
            LEGO price data from real marketplaces
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg max-w-2xl mx-auto mb-12"
            style={{ color: "var(--muted)" }}
          >
            BrickVal combines BrickLink and eBay market signals so collectors can estimate what LEGO sets are worth before they buy, sell, or catalog a collection.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="p-8 rounded-2xl flex flex-col items-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-6"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                B
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>BrickLink</h3>
              <p style={{ color: "var(--muted)" }}>
                Owned by the LEGO Group, BrickLink is the world&apos;s largest online marketplace to buy and sell LEGO parts, Minifigures and sets.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-2xl flex flex-col items-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-6"
                style={{ background: "var(--green)", color: "#fff" }}
              >
                e
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>eBay</h3>
              <p style={{ color: "var(--muted)" }}>
                We analyze completed sales data from eBay, one of the world&apos;s largest online marketplaces, to provide realistic aftermarket valuations.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Search Answers ── */}
      <section className="border-t px-6 py-20" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: "var(--muted)" }}>
              LEGO value answers
            </p>
            <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              Built for collectors who need a fast price check
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "What does BrickVal do?",
                body: "BrickVal scans a LEGO box image or accepts a set number, identifies the set, and returns an estimated USD market value.",
              },
              {
                title: "Where does the price come from?",
                body: "Pricing uses BrickLink market data and eBay resale signals, with BrickLink sold prices prioritized where available.",
              },
              {
                title: "Who is it for?",
                body: "BrickVal is for LEGO collectors, resellers, and buyers who want to check value before cataloging, listing, negotiating, or buying.",
              },
              {
                title: "Why USD pricing?",
                body: "The app shows USD market value by default so pricing is consistent across sets, sources, and collection totals.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl p-6"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <h3 className="text-lg font-black mb-3" style={{ color: "var(--foreground)" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section
        id="waitlist"
        className="border-t px-6 py-20"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              boxShadow: "0 6px 0 var(--border)",
            }}
          >
            {/* Top stud row */}
            <div
              className="px-6 pt-5 pb-3"
              style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
            >
              <StudRow />
            </div>

            {/* Card body */}
            <div className="px-8 py-10 flex flex-col items-center gap-6 text-center">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                🧱 Early Access
              </div>

              {/* Tabs */}
              <div
                className="flex w-full rounded-xl p-1 gap-1"
                style={{ background: "var(--surface)" }}
              >
                <button
                  onClick={() => setActiveTab("notify")}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: activeTab === "notify" ? "var(--accent)" : "transparent",
                    color: activeTab === "notify" ? "var(--accent-fg)" : "var(--muted)",
                  }}
                >
                  Notify Me
                </button>
                <button
                  onClick={() => setActiveTab("lifetime")}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: activeTab === "lifetime" ? "var(--accent)" : "transparent",
                    color: activeTab === "lifetime" ? "var(--accent-fg)" : "var(--muted)",
                  }}
                >
                  Lifetime Deal
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "notify" ? (
                  <motion.div
                    key="notify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="w-full flex flex-col items-center gap-6"
                  >
                    {/* Headline */}
                    <div className="flex flex-col gap-2">
                      <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                        Be First To Know When We Launch
                      </h2>
                      <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                        Get notified the moment BrickVal goes live —
                        with priority access and early-bird pricing.
                      </p>
                    </div>

                    {/* Form / Status */}
                    <div className="w-full">
                      <AnimatePresence mode="wait">
                        {status === "success" ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="py-4 px-6 rounded-2xl text-center font-bold"
                            style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)" }}
                          >
                            You&apos;re locked in! We&apos;ll be in touch. 🎉
                          </motion.div>
                        ) : status === "duplicate" ? (
                          <motion.div
                            key="duplicate"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="py-4 px-6 rounded-2xl text-center font-bold"
                            style={{ background: "rgba(245,197,24,0.1)", color: "var(--accent)", border: "1px solid rgba(245,197,24,0.3)" }}
                          >
                            You&apos;re already on the list! 🧱
                          </motion.div>
                        ) : (
                          <motion.div
                            key="form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col sm:flex-row gap-3"
                          >
                            <input
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleWaitlist()}
                              placeholder="your@email.com"
                              className="flex-1 px-5 py-3.5 rounded-xl text-base outline-none transition-all"
                              style={{
                                background: "var(--surface)",
                                color: "var(--foreground)",
                                border: "1px solid var(--border)",
                              }}
                              onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                            />
                            <button
                              onClick={handleWaitlist}
                              disabled={status === "loading"}
                              className="px-7 py-3.5 rounded-xl font-black text-base transition-all active:scale-95 disabled:opacity-60"
                              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                            >
                              {status === "loading" ? "Snapping…" : "Snap in →"}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {status === "error" && (
                        <p className="mt-3 text-sm text-center" style={{ color: "var(--red)" }}>
                          Something went wrong. Try again.
                        </p>
                      )}
                    </div>

                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      🔒 No spam · Unsubscribe anytime
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="lifetime"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="w-full flex flex-col items-center gap-6"
                  >
                    {/* Headline */}
                    <div className="flex flex-col gap-2">
                      <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                        Lifetime Access
                      </h2>
                      <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                        One-time payment. Unlimited scans forever.<br className="hidden sm:block" />
                        No subscription, ever.
                      </p>
                    </div>

                    {/* Price */}
                    <div
                      className="w-full rounded-2xl py-5 px-6"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <p className="text-4xl font-black" style={{ color: "var(--foreground)" }}>
                        $29.99
                        <span className="text-base font-normal ml-2" style={{ color: "var(--muted)" }}>
                          one-time
                        </span>
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="w-full text-sm text-left flex flex-col gap-3" style={{ color: "var(--muted)" }}>
                      {[
                        "Unlimited LEGO set scans",
                        "Minifigure scanning",
                        "BrickLink + eBay price comparison",
                        "All future features included",
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2.5">
                          <span style={{ color: "var(--accent)" }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <form action={createLifetimeCheckout} className="w-full">
                      <button
                        type="submit"
                        className="w-full font-black py-4 px-6 rounded-2xl text-lg transition-all active:scale-[0.98]"
                        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                      >
                        Get Lifetime Access →
                      </button>
                    </form>

                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      🔒 Billed once at launch · No recurring charges
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom stud row */}
            <div
              className="px-6 pb-5 pt-3"
              style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
            >
              <StudRow />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-6 text-center" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            © 2026 BrickVal · Prices sourced from BrickLink + eBay
          </p>
          <nav className="flex items-center gap-4 text-xs" aria-label="Footer">
            <Link href="/privacy" style={{ color: "var(--muted)" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "var(--muted)" }}>Terms</Link>
            <Link href="/delete-account" style={{ color: "var(--muted)" }}>Delete account</Link>
          </nav>
        </div>
      </footer>
      </main>
    </>
  );
}
