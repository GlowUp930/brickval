"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

const features = [
  "Unlimited single and bulk scans",
  "Unlimited collection space",
  "Full market history and insights",
  "Theme and accent customization",
  "All future Pro features included",
];

export default function UpgradePage() {
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
            BrickValue Pro
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Keep scanning, collecting, and tracking the value of your LEGO collection.
          </p>
        </div>

        {/* Price */}
        <div className="rounded-2xl p-5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="text-4xl font-black" style={{ color: "var(--foreground)" }}>
            A$9.99
            <span className="text-base font-normal" style={{ color: "var(--muted)" }}>
              {" "}/ month
            </span>
          </p>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--accent)" }}>
            Or A$79.99/year with a 7-day free trial
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Subscription managed securely by Apple on iOS
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
        <a
          href="https://apps.apple.com/au/app/brickvalue/id6771715475"
          className="w-full font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "0 4px 24px rgba(245,197,24,0.3)",
          }}
        >
          Open BrickValue on iPhone
        </a>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Choose a plan in the app. Cancel anytime in Apple Settings.
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
