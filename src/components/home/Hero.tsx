"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { joinWaitlist, createLifetimeCheckout } from "@/app/waitlist-action";

const siteUrl = "https://brickvalue.live";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BrickVal",
    applicationCategory: "UtilityApplication",
    operatingSystem: "iOS, Android, Web",
    description: "Scan any LEGO box. Get USD market value, retirement status, and resale signals in seconds.",
    url: siteUrl,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BrickVal",
    url: siteUrl,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "BrickVal",
    url: siteUrl,
  },
];

const launchPlatforms = [
  { name: "Betalist", svg: <svg key="betalist" viewBox="0 0 32 32" fill="none" className="w-6 h-6"><rect x="3" y="7" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="18" y="7" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="8" y="18" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><rect x="3" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /><rect x="9" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /><rect x="20" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /><rect x="26" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /><rect x="10" y="20" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /><rect x="16" y="20" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" /></svg> },
  { name: "TinyLaunch", svg: <svg key="tinylaunch" viewBox="0 0 32 32" fill="none" className="w-6 h-6"><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" /><path d="M10 20 L16 10 L22 20 Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.2" /></svg> },
  {
    name: "Brickset",
    svg: (
      <svg key="brickset" viewBox="0 0 32 32" fill="none" className="w-6 h-6">
        <rect x="4" y="8" width="6" height="16" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="13" y="4" width="6" height="24" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="22" y="10" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

function MarqueeRow() {
  const items = [...launchPlatforms, ...launchPlatforms, ...launchPlatforms];
  return (
    <div className="overflow-hidden w-full">
      <motion.div
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        className="flex items-center gap-12"
      >
        {items.map((platform, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 flex-shrink-0"
            style={{ color: "var(--muted)" }}
          >
            {platform.svg}
            <span className="text-sm font-semibold whitespace-nowrap">{platform.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"notify" | "lifetime">("notify");

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
      <main
        className="min-h-screen flex flex-col overflow-x-hidden w-full max-w-full"
        style={{ background: "var(--background)" }}
      >

        {/* ── Navbar: floating glass pill ── */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-4 py-2 rounded-2xl backdrop-blur-xl w-[calc(100%-2rem)] max-w-4xl"
          style={{ background: "rgba(13,13,15,0.75)", border: "1px solid var(--border)" }}
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
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
              <Link href="/privacy" className="transition-colors hover:opacity-80">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:opacity-80">Terms</Link>
            </div>
            <Link
              href="/scan"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg active:scale-95"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Get started
            </Link>
          </div>
        </motion.nav>

        {/* ── Hero: Cinematic Center Wide ── */}
        <section
          className="relative flex flex-col items-center justify-center px-6 pt-24 pb-20 text-center w-full overflow-hidden"
          style={{ minHeight: "92dvh" }}
        >
          {/* Background layers */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(245,197,24,0.07) 0%, rgba(245,197,24,0.02) 40%, transparent 70%)",
            }}
          />
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle, var(--accent) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-8 max-w-5xl w-full">
            {/* 1. Launch badge */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: "#22c55e" }} />
              Launching June 21
            </motion.div>

            {/* 2. Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tighter max-w-4xl"
              style={{ color: "var(--foreground)" }}
            >
              LEGO Set<br />
              <span style={{ color: "var(--accent)" }}>Value Scanner</span>
            </motion.h1>

            {/* 3. Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{ color: "var(--muted)" }}
            >
              Scan any LEGO box. Instant USD market value, retirement status, and resale signals in seconds.
            </motion.p>

            {/* 4. CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4"
            >
              <a
                href="https://apps.apple.com/app/idXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-semibold transition-all active:scale-[0.98] hover:shadow-2xl hover:shadow-black/40"
                style={{ background: "white", color: "black" }}
              >
                <AppleLogo />
                <div className="text-left leading-tight">
                  <div className="text-[10px] uppercase tracking-wide opacity-70">Download on the</div>
                  <div className="text-lg font-bold leading-tight">App Store</div>
                </div>
              </a>

              <Link
                href="/scan"
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--muted)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
              >
                or try on web
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Platform Marquee ── */}
        <section
          className="border-t py-16 px-6 overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6 max-w-5xl mx-auto"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--muted)" }}
            >
              Launching on
            </p>
            <MarqueeRow />
          </motion.div>
        </section>

        {/* ── Feature Bento Grid ── */}
        <section
          className="border-t px-6 py-24 md:py-32"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                Scan. Value. Collect.
              </h2>
              <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
                Point your camera at any LEGO box. Get market pricing, track your collection, and make informed decisions.
              </p>
            </motion.div>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
              style={{ gridAutoFlow: "dense" }}
            >
              {/* Cell 1: Big scanning card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="h-full p-8 flex flex-col justify-between"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,197,24,0.10), rgba(13,13,15,0.6) 50%)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-700 ease-out group-hover:scale-110"
                    style={{ background: "var(--accent)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" style={{ color: "var(--accent-fg)" }}>
                      <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="16" cy="8" r="1" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="mt-auto">
                    <h3 className="text-2xl font-black mb-2" style={{ color: "var(--foreground)" }}>
                      Scan any LEGO box
                    </h3>
                    <p className="text-sm leading-relaxed max-w-md" style={{ color: "var(--muted)" }}>
                      Use your camera or upload a photo. Our AI identifies the set number and pulls market data instantly.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Cell 2: Sets count */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="rounded-2xl p-8 flex flex-col items-center justify-center text-center group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-4xl font-black mb-1" style={{ color: "var(--accent)" }}>8,000+</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>sets supported</span>
              </motion.div>

              {/* Cell 3: Platforms */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="rounded-2xl p-8 flex flex-col items-center justify-center text-center group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-4xl font-black mb-1" style={{ color: "var(--accent)" }}>iOS</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  Android coming soon
                </span>
              </motion.div>

              {/* Cell 4: Market pricing */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="md:col-span-2 rounded-2xl overflow-hidden group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="p-8 flex flex-col sm:flex-row items-start gap-6">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-700 ease-out group-hover:scale-110"
                    style={{ background: "var(--accent)", opacity: 0.9 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" style={{ color: "var(--accent-fg)" }}>
                      <path d="M12 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M17 6H10C8.34315 6 7 7.34315 7 9C7 10.6569 8.34315 12 10 12H14C15.6569 12 17 13.3431 17 15C17 16.6569 15.6569 18 14 18H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2" style={{ color: "var(--foreground)" }}>
                      USD market value
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                      Real-time pricing waterfall: BrickLink sold data prioritized, then eBay averages, then active listings. Always in USD.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Cell 5: Full-width data strip */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="md:col-span-3 rounded-2xl p-6 group"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 justify-center">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold transition-transform duration-700 ease-out group-hover:scale-110"
                      style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                    >
                      B
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>BrickLink</span>
                  </div>
                  <div className="hidden sm:block w-px h-6" style={{ background: "var(--border)" }} />
                  <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
                    Market data from real sales across BrickLink and eBay
                  </p>
                  <div className="hidden sm:block w-px h-6" style={{ background: "var(--border)" }} />
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold transition-transform duration-700 ease-out group-hover:scale-110"
                      style={{ background: "var(--green)", color: "#fff" }}
                    >
                      e
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>eBay</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Data Sources ── */}
        <section
          className="border-t px-6 py-24 md:py-32"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                Real market data. No guesswork.
              </h2>
              <p className="text-base mt-4 max-w-xl mx-auto" style={{ color: "var(--muted)" }}>
                BrickVal combines real marketplace signals so collectors know what sets are worth before they buy or sell.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="rounded-2xl p-8 group"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  B
                </div>
                <h3 className="text-xl font-black mb-3" style={{ color: "var(--foreground)" }}>BrickLink</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  Owned by the LEGO Group, BrickLink is the world&apos;s largest online marketplace for LEGO parts, minifigures, and sets. We source sold price data from the last 6 months.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="rounded-2xl p-8 group"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ background: "var(--green)", color: "#fff" }}
                >
                  e
                </div>
                <h3 className="text-xl font-black mb-3" style={{ color: "var(--foreground)" }}>eBay</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  We analyze completed sales from eBay to provide realistic aftermarket valuations. Dual-source pricing means more accurate estimates.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          className="border-t px-6 py-24 md:py-32"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                Questions?
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  q: "What does BrickVal do?",
                  a: "Scan a LEGO box image or enter a set number. BrickVal identifies the set and returns an estimated USD market value using real transaction data.",
                },
                {
                  q: "Where does the price come from?",
                  a: "Pricing uses BrickLink sold data prioritized, then eBay averages, then active listings. All prices are in USD for consistency.",
                },
                {
                  q: "Who is it for?",
                  a: "LEGO collectors, resellers, and buyers who want to check value before cataloging, listing, negotiating, or purchasing.",
                },
                {
                  q: "When is Android available?",
                  a: "The iOS app launches June 21, 2026 with preorder availability. Android support is in development and coming soon.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.q}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="rounded-2xl p-6"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <h3 className="text-lg font-black mb-3" style={{ color: "var(--foreground)" }}>
                    {item.q}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {item.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Waitlist / Lifetime Deal ── */}
        <section
          id="waitlist"
          className="border-t px-6 py-24 md:py-32"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
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
              <div className="px-8 py-10 flex flex-col items-center gap-6 text-center">
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
                      <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                          Be First To Know
                        </h2>
                        <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                          Get notified the moment BrickVal launches with priority access and early-bird pricing.
                        </p>
                      </div>

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
                              You&apos;re locked in. We&apos;ll be in touch.
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
                              You&apos;re already on the list.
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
                                {status === "loading" ? "Snapping..." : "Snap in"}
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
                        No spam. Unsubscribe anytime.
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
                      <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                          Lifetime Access
                        </h2>
                        <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                          One-time payment. Unlimited scans forever. No subscription, ever.
                        </p>
                      </div>

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

                      <ul className="w-full text-sm text-left flex flex-col gap-3" style={{ color: "var(--muted)" }}>
                        {[
                          "Unlimited LEGO set scans",
                          "Minifigure scanning",
                          "BrickLink + eBay price comparison",
                          "All future features included",
                        ].map(f => (
                          <li key={f} className="flex items-center gap-2.5">
                            <span style={{ color: "var(--accent)" }} className="font-bold">&#10003;</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <form action={createLifetimeCheckout} className="w-full">
                        <button
                          type="submit"
                          className="w-full font-black py-4 px-6 rounded-2xl text-lg transition-all active:scale-[0.98]"
                          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                        >
                          Get Lifetime Access
                        </button>
                      </form>

                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        Billed once at launch. No recurring charges.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="border-t px-6 py-8"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              &copy; 2026 BrickVal &middot; Prices sourced from BrickLink + eBay
            </p>
            <nav className="flex items-center gap-4 text-xs" aria-label="Footer">
              <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--muted)" }}>Privacy</Link>
              <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--muted)" }}>Terms</Link>
              <Link href="/delete-account" className="transition-colors hover:opacity-80" style={{ color: "var(--muted)" }}>Delete account</Link>
            </nav>
          </div>
        </footer>

      </main>
    </>
  );
}
