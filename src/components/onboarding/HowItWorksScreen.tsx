"use client";

import { motion } from "framer-motion";

const steps = [
  {
    icon: "\uD83D\uDCF7",
    title: "Point your camera",
    desc: "Snap a photo of any LEGO box",
  },
  {
    icon: "\u2728",
    title: "AI reads it instantly",
    desc: "Set number detected in under 2 seconds",
  },
  {
    icon: "\uD83D\uDCB0",
    title: "See the real value",
    desc: "USD market price from BrickLink + eBay",
  },
];

export function HowItWorksScreen({ onNext: _ }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-10 text-center py-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--muted)" }}
      >
        How it works
      </motion.p>

      <div className="flex flex-col gap-6 w-full">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.15, duration: 0.5 }}
            className="flex items-center gap-4 text-left"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              {step.icon}
            </div>
            <div className="min-w-0">
              <p
                className="font-bold text-base"
                style={{ color: "var(--foreground)" }}
              >
                {step.title}
              </p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
