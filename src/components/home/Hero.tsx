"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const steps = [
  { icon: "📷", title: "Take a photo", desc: "Point your camera at any LEGO box" },
  { icon: "🤖", title: "AI reads it", desc: "Claude Vision finds the set number" },
  { icon: "💰", title: "See the value", desc: "Get current market prices instantly" },
];

export function Hero() {
  return (
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
            AI-powered LEGO scanner
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Know what your<br />
            <span style={{ color: "var(--accent)" }}>LEGO sets</span><br />
            are worth.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base leading-relaxed max-w-sm"
            style={{ color: "var(--muted)" }}
          >
            Scan the box with your phone. Get the current market value and retirement status in seconds.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
          >
            <Link
              href="/scan"
              className="inline-block w-full max-w-xs font-black py-4 px-8 rounded-2xl text-xl transition-all active:scale-95 hover:glow-accent-sm"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Scan a set — it&apos;s free
            </Link>
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
            Accurate Pricing You Can Trust
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg max-w-2xl mx-auto mb-12"
            style={{ color: "var(--muted)" }}
          >
            We aggregate real-time market data from the most reliable sources in the secondary market to give you the true value of your LEGO sets.
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

      {/* ── Footer ── */}
      <footer className="border-t px-6 py-6 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          © 2026 BrickVal · Prices sourced from BrickLink + eBay
        </p>
      </footer>
    </main>
  );
}
