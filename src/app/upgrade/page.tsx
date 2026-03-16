"use client";

import { createCheckoutSession } from "./actions";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";

const features = [
  "Unlimited LEGO set scans — forever",
  "Unlimited minifigure scans",
  "Real-time BrickLink + eBay prices",
  "Deal score & retirement status",
  "One-time payment, no subscription",
];

export default function UpgradePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl p-8 max-w-sm w-full text-center flex flex-col gap-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Icon */}
        <div className="text-5xl">💎</div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            BrickVal Lifetime
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Pay once, scan forever. Unlimited access to real-time LEGO market
            prices — no subscription, no renewal.
          </p>
        </div>

        {/* Price */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)" }}>
          <p className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>
            $29.99{" "}
            <span className="text-base font-normal" style={{ color: "var(--muted)" }}>
              USD
            </span>
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--accent)" }}>
            One-time payment · Lifetime access
          </p>
        </div>

        {/* Features */}
        <ul className="text-sm text-left flex flex-col gap-2.5" style={{ color: "var(--muted)" }}>
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <form action={createCheckoutSession}>
          <button
            type="submit"
            className="w-full font-bold py-4 px-6 rounded-2xl text-lg transition-all active:scale-[0.98] glow-accent"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Get Lifetime Access
          </button>
        </form>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Secure checkout via Stripe · No recurring charges
        </p>

        <Link
          href="/scan"
          className="text-sm transition-colors flex items-center justify-center gap-1"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to scanner
        </Link>
      </motion.div>
    </main>
  );
}
