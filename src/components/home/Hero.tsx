"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { joinWaitlist, createLifetimeCheckout } from "@/app/waitlist-action";
import { Logo } from "@/components/Logo";

const steps = [
  { title: "Snap a photo", desc: "Point your camera at any LEGO box" },
  { title: "AI identifies it", desc: "Set number detected in under 2 seconds" },
  { title: "See the value", desc: "Real market price from BrickLink + eBay" },
];

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
        style={{ background: "rgba(13,13,15,0.85)", borderColor: "var(--border)" }}
      >
        <Logo size="sm" />
        <Link
          href="/scan"
          className="text-sm font-bold px-5 py-2.5 rounded-full transition-all hover:shadow-lg active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Get started
        </Link>
      </motion.nav>

      {/* ── Hero Section ── */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center max-w-lg mx-auto w-full overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(245,197,24,0.06), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
              style={{ background: "var(--accent)" }}
            />
            AI-powered LEGO scanner
          </motion.div>

          {/* Headline — large, confident, minimal */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-5xl sm:text-6xl font-black leading-[1.02] tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Know what your{" "}
            <span style={{ color: "var(--accent)" }}>LEGO</span>{" "}
            is worth.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg leading-relaxed max-w-sm"
            style={{ color: "var(--muted)" }}
          >
            Scan the box. Get the market value.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="flex flex-col items-center gap-4 w-full max-w-sm"
          >
            <Link
              href="/scan"
              className="w-full text-center font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                boxShadow: "0 4px 24px rgba(245,197,24,0.3)",
              }}
            >
              Scan a set — free
            </Link>
            <button
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-semibold transition-colors"
              style={{ color: "var(--muted)" }}
            >
              Join the waitlist
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24" style={{ background: "var(--surface)" }}>
        <div className="max-w-lg mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-[0.25em] text-center mb-16"
            style={{ color: "var(--muted)" }}
          >
            How it works
          </motion.p>
          <div className="flex flex-col gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="flex items-start gap-5"
              >
                {/* Step number */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  {i + 1}
                </div>
                <div className="pt-1.5">
                  <p className="font-bold text-base" style={{ color: "var(--foreground)" }}>{step.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Mini result demo ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 flex flex-col items-center gap-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--muted)" }}>
              Here&apos;s what you get
            </p>
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 12px 48px -12px rgba(0,0,0,0.6)" }}
            >
              {/* Set image area */}
              <div className="relative h-28 flex items-center justify-center overflow-hidden" style={{ background: "var(--surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://img.bricklink.com/ItemImage/SN/0/75192-1.png"
                  alt="LEGO Millennium Falcon 75192"
                  className="h-full w-full object-contain p-2"
                />
                <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
              </div>

              {/* Identity */}
              <div className="px-4 pt-1 pb-3 text-center">
                <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>Millennium Falcon</p>
                <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>#75192 &middot; 2017</p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                  Retired
                </span>
              </div>

              {/* Price card */}
              <div className="mx-3 mb-3 rounded-2xl p-4 text-center"
                style={{ border: "1px solid var(--border)", background: "linear-gradient(to bottom, rgba(245,197,24,0.05), transparent)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                  BrickLink Avg Sold &middot; New / Sealed
                </p>
                <p className="text-4xl font-bold tabular-nums leading-none" style={{ color: "var(--foreground)" }}>$289</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>Based on 42 real sales &middot; last 6 months</p>
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.18)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.30)" }}>
                    +43% vs retail
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>RRP: ~$200</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Data Sources ── */}
      <section className="py-24 px-6" style={{ background: "var(--background)" }}>
        <div className="max-w-lg mx-auto text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-[0.25em] mb-4"
            style={{ color: "var(--muted)" }}
          >
            Trusted Data
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-black mb-12"
            style={{ color: "var(--foreground)" }}
          >
            Prices you can trust
          </motion.h2>

          <div className="flex flex-col gap-4">
            {[
              { letter: "B", bg: "var(--accent)", fg: "var(--accent-fg)", name: "BrickLink", desc: "Owned by the LEGO Group. Real sold prices from 10,000+ stores worldwide." },
              { letter: "e", bg: "var(--green)", fg: "#fff", name: "eBay", desc: "Completed sales data from US, AU, UK, and DE marketplaces." },
            ].map((src, i) => (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 p-5 rounded-2xl text-left"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: src.bg, color: src.fg }}
                >
                  {src.letter}
                </div>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: "var(--foreground)" }}>{src.name}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{src.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Waitlist ── */}
      <section
        id="waitlist"
        className="px-6 py-24"
        style={{ background: "var(--surface)" }}
      >
        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 48px -12px rgba(0,0,0,0.5)",
            }}
          >
            {/* Card body */}
            <div className="px-8 py-10 flex flex-col items-center gap-6 text-center">
              {/* Tabs */}
              <div
                className="flex w-full rounded-full p-1 gap-1"
                style={{ background: "var(--surface)" }}
              >
                <button
                  onClick={() => setActiveTab("notify")}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
                  style={{
                    background: activeTab === "notify" ? "var(--accent)" : "transparent",
                    color: activeTab === "notify" ? "var(--accent-fg)" : "var(--muted)",
                  }}
                >
                  Notify Me
                </button>
                <button
                  onClick={() => setActiveTab("lifetime")}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
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
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                        Get early access
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                        Be first to know when Brickvalue Pro goes live.
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
                            className="py-4 px-6 rounded-2xl text-center font-bold"
                            style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.3)" }}
                          >
                            You&apos;re in! We&apos;ll be in touch.
                          </motion.div>
                        ) : status === "duplicate" ? (
                          <motion.div
                            key="duplicate"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
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
                            className="flex flex-col gap-3"
                          >
                            <input
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleWaitlist()}
                              placeholder="your@email.com"
                              className="w-full px-5 py-3.5 rounded-full text-base outline-none transition-all"
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
                              className="w-full px-7 py-3.5 rounded-full font-black text-base transition-all active:scale-[0.98] disabled:opacity-60"
                              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                            >
                              {status === "loading" ? "Joining..." : "Join waitlist"}
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
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--foreground)" }}>
                        Lifetime access
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                        One-time payment. Unlimited scans forever.
                      </p>
                    </div>

                    <div
                      className="w-full rounded-2xl py-5 px-6 text-center"
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
                          <span style={{ color: "var(--accent)" }}>&#10003;</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <form action={createLifetimeCheckout} className="w-full">
                      <button
                        type="submit"
                        className="w-full font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
                        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                      >
                        Get lifetime access
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
      <footer className="border-t px-6 py-8 text-center" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col items-center gap-3">
          <Logo size="sm" />
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            &copy; 2026 Brickvalue.live &middot; Prices sourced from BrickLink + eBay
          </p>
          <Link href="/privacy" className="text-xs transition-colors" style={{ color: "var(--muted)" }}>
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}
