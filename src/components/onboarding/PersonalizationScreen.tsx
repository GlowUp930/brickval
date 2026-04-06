"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const options = [
  {
    icon: "\uD83C\uDFE0",
    label: "Check my collection's value",
    desc: "See what your sets are worth today",
  },
  {
    icon: "\uD83D\uDCB5",
    label: "Find deals at garage sales",
    desc: "Scan before you buy to avoid overpaying",
  },
  {
    icon: "\uD83C\uDFF7\uFE0F",
    label: "Sell my sets at the right price",
    desc: "Know the fair market price before listing",
  },
];

export function PersonalizationScreen({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    setSelected(index);
    // Auto-advance after brief pause to show selection
    setTimeout(onNext, 400);
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-2"
      >
        <h2
          className="text-2xl font-black tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          What brings you here?
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          This helps us tailor your experience
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 w-full">
        {options.map((opt, i) => (
          <motion.button
            key={opt.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
            onClick={() => handleSelect(i)}
            className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background:
                selected === i ? "rgba(245,197,24,0.08)" : "var(--surface)",
              border:
                selected === i
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border)",
            }}
          >
            <span className="text-2xl shrink-0">{opt.icon}</span>
            <div className="min-w-0">
              <p
                className="font-bold text-sm"
                style={{
                  color:
                    selected === i ? "var(--accent)" : "var(--foreground)",
                }}
              >
                {opt.label}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {opt.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
