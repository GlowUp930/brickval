"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { joinWaitlist, createLifetimeCheckout } from "@/app/waitlist-action";

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

const launchPlatforms = [
  {
    name: "Betalist",
    svg: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 16h5l-1.5-5h3l-3.5 9 3-4h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "TinyLaunch",
    svg: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
        <path d="M16 4l-4 8h3l-1 7 6-9h-3.5L19 4h-3z" fill="currentColor" />
        <circle cx="20" cy="24" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="12" cy="26" r="1.5" fill="currentColor" opacity="0.25" />
      </svg>
    ),
  },
  {
    name: "Brickset",
    svg: (
      <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
        <rect x="3" y="7" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="7" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8" y="18" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
        <rect x="9" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
        <rect x="20" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
        <rect x="26" y="9" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
        <rect x="10" y="20" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
        <rect x="16" y="20" width="2" height="2" rx="0.8" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
];

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

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
  const [demoPlatform, setDemoPlatform] = useState<"ios" | "web">("ios");

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

      {/* ── Hero (Cinematic Center-Wide) ── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center w-full overflow-hidden"
        style={{ minHeight: "92dvh" }}
      >
        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(245,197,24,0.08) 0%, rgba(245,197,24,0.03) 35%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--accent) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8 max-w-5xl w-full">
          {/* Launch badge */}
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

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight max-w-4xl"
            style={{ color: "var(--foreground)" }}
          >
            LEGO Set<br />
            <span style={{ color: "var(--accent)" }}>Value Scanner</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl leading-relaxed max-w-2xl"
            style={{ color: "var(--muted)" }}
          >
            Scan any LEGO box. Get USD market value, retirement status, and resale signals in seconds.
            Powered by real BrickLink and eBay market data.
          </motion.p>

          {/* Primary CTA: App Store */}
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

          {/* Trust signal strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 pt-4"
            style={{ color: "var(--muted)" }}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              BrickLink + eBay data
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              8,000+ sets supported
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              iOS + Web + Android
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Platform Badges ── */}
      <section className="px-6 py-10" style={{ background: "var(--background)" }}>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-lg mx-auto flex flex-col items-center gap-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Launching on
          </p>
          <div className="flex items-center gap-8">
            {launchPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-2.5"
                style={{ color: "var(--muted)" }}
              >
                {platform.svg}
                <span className="text-sm font-semibold">{platform.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Demo Showcase ── */}
      <section className="border-t px-6 py-20" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
              See it in action
            </h2>
          </motion.div>

          {/* Segmented control */}
          <div className="flex justify-center mb-10">
            <div
              className="inline-flex rounded-full p-1 gap-0.5"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setDemoPlatform("ios")}
                className="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200"
                style={{
                  background: demoPlatform === "ios" ? "var(--foreground)" : "transparent",
                  color: demoPlatform === "ios" ? "var(--background)" : "var(--muted)",
                  boxShadow: demoPlatform === "ios" ? "0 2px 12px rgba(0,0,0,0.3)" : "none",
                }}
              >
                iPhone
              </button>
              <button
                onClick={() => setDemoPlatform("web")}
                className="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200"
                style={{
                  background: demoPlatform === "web" ? "var(--foreground)" : "transparent",
                  color: demoPlatform === "web" ? "var(--background)" : "var(--muted)",
                  boxShadow: demoPlatform === "web" ? "0 2px 12px rgba(0,0,0,0.3)" : "none",
                }}
              >
                Desktop
              </button>
            </div>
          </div>

          {/* Preview cards */}
          <AnimatePresence mode="wait">
            {demoPlatform === "ios" ? (
              <motion.div
                key="ios"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col md:flex-row items-center gap-8 md:gap-12 justify-center"
              >
                {/* iPhone frame + video placeholder */}
                <div className="relative w-[220px] h-[450px] rounded-[2.5rem] overflow-hidden flex-shrink-0"
                  style={{
                    background: "var(--background)",
                    border: "3px solid var(--border)",
                    boxShadow: "0 24px 80px -12px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl z-10" style={{ background: "var(--surface-2)" }} />
                  {/* Content */}
                  <div className="h-full flex flex-col items-center justify-center gap-4 px-6 pt-10">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <PlayIcon />
                    </div>
                    <p className="text-xs text-center leading-relaxed" style={{ color: "var(--muted)" }}>
                      Mobile app demo
                    </p>
                  </div>
                </div>

                {/* Side copy */}
                <div className="text-center md:text-left max-w-xs">
                  <h3 className="text-xl font-black mb-3" style={{ color: "var(--foreground)" }}>
                    Take it anywhere
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    Scan LEGO sets on the go. Point your camera, get instant USD market value, and build your collection - all from your iPhone.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="web"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
              >
                {/* Desktop browser frame */}
                <div className="w-full max-w-xl rounded-2xl overflow-hidden flex-shrink-0"
                  style={{
                    background: "var(--background)",
                    border: "2px solid var(--border)",
                    boxShadow: "0 24px 80px -12px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                    <span className="flex-1 mx-4 h-6 rounded-md text-[10px] flex items-center px-3" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                      brickvalue.live/scan
                    </span>
                  </div>
                  {/* Content */}
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <PlayIcon />
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Web app demo
                    </p>
                  </div>
                </div>

                <div className="text-center max-w-xs">
                  <h3 className="text-xl font-black mb-3" style={{ color: "var(--foreground)" }}>
                    Scan on desktop or at home
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    Upload a photo or enter a set number. Full market breakdown, transaction history, and price comparison on the big screen.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                        Get notified the moment BrickVal goes live -
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
                            You&apos;re locked in! We&apos;ll be in touch.
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
                            You&apos;re already on the list!
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
                      No spam - Unsubscribe anytime
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
                        Get Lifetime Access
                      </button>
                    </form>

                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Billed once at launch - No recurring charges
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
