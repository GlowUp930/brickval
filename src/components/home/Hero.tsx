"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { joinWaitlist, createLifetimeCheckout } from "@/app/waitlist-action";

const steps = [
  { icon: "📷", title: "Take a photo", desc: "Point your camera at any LEGO box" },
  { icon: "🤖", title: "AI reads it", desc: "Claude Vision finds the set number" },
  { icon: "💰", title: "See the value", desc: "Get current market prices instantly" },
];

const STUDS = Array.from({ length: 10 });

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
                        Be first when Pro lands.
                      </h2>
                      <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
                        Get notified the moment BrickVal Pro goes live —<br className="hidden sm:block" />
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
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          © 2026 BrickVal · Prices sourced from BrickLink + eBay
        </p>
      </footer>
    </main>
  );
}
