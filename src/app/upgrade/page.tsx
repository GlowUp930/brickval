"use client";

import { useEffect, useState } from "react";
import { createCheckoutSession } from "./actions";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

const features = [
  "Unlimited LEGO set scans",
  "Unlimited minifigure scans",
  "Real-time BrickLink + eBay prices",
  "Deal score & retirement status",
  "All future features included",
];

function useIsNative(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(typeof window !== "undefined" && "ReactNativeWebView" in window);
  }, []);
  return native;
}

function triggerNativePaywall() {
  if (typeof window !== "undefined" && "ReactNativeWebView" in window) {
    (window as { ReactNativeWebView: { postMessage: (msg: string) => void } }).ReactNativeWebView.postMessage(
      JSON.stringify({ action: "show_paywall" })
    );
  }
}

export default function UpgradePage() {
  const isNative = useIsNative();

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 35%, rgba(245,197,24,0.04), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col gap-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 48px -12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="md" showText={false} />
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ color: "var(--foreground)" }}>
            Brickvalue Lifetime
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Pay once, scan forever. No subscription. No renewal.
          </p>
        </div>

        {/* Price */}
        <div className="rounded-2xl p-5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="text-4xl font-black" style={{ color: "var(--foreground)" }}>
            $29.99
          </p>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--accent)" }}>
            One-time payment &middot; Lifetime access
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Less than $0.08/day over a year
          </p>
        </div>

        {/* Features */}
        <ul className="text-sm text-left flex flex-col gap-3" style={{ color: "var(--muted)" }}>
          {features.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{ background: "rgba(245,197,24,0.15)", color: "var(--accent)" }}
              >
                &#10003;
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isNative ? (
          <button
            onClick={triggerNativePaywall}
            className="w-full font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "0 4px 24px rgba(245,197,24,0.3)",
            }}
          >
            Get lifetime access
          </button>
        ) : (
          <form action={createCheckoutSession}>
            <button
              type="submit"
              className="w-full font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                boxShadow: "0 4px 24px rgba(245,197,24,0.3)",
              }}
            >
              Get lifetime access
            </button>
          </form>
        )}

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {isNative
            ? "Secure checkout via Google Play"
            : "Secure checkout via Stripe"}
        </p>

        <Link
          href="/scan"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--muted)" }}
        >
          Back to scanner
        </Link>
      </motion.div>
    </main>
  );
}
