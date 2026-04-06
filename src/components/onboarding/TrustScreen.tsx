"use client";

import { motion } from "framer-motion";

const sources = [
  {
    letter: "B",
    bg: "var(--accent)",
    fg: "var(--accent-fg)",
    name: "BrickLink",
    desc: "World's largest LEGO marketplace, owned by the LEGO Group. Real sold prices from 10,000+ stores.",
  },
  {
    letter: "e",
    bg: "var(--green)",
    fg: "#fff",
    name: "eBay",
    desc: "Completed sales data from 4 global marketplaces. US, AU, UK, and DE.",
  },
];

export function TrustScreen({ onNext: _ }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-2"
      >
        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          Trusted Data
        </p>
        <h2
          className="text-2xl font-black tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Powered by real market data
        </h2>
      </motion.div>

      <div className="flex flex-col gap-4 w-full">
        {sources.map((src, i) => (
          <motion.div
            key={src.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
            className="flex items-start gap-4 p-4 rounded-2xl text-left"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: src.bg, color: src.fg }}
            >
              {src.letter}
            </div>
            <div className="min-w-0">
              <p
                className="font-bold text-sm mb-0.5"
                style={{ color: "var(--foreground)" }}
              >
                {src.name}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {src.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs font-medium"
        style={{ color: "var(--muted)" }}
      >
        Prices updated daily &middot; Cached for speed
      </motion.p>
    </div>
  );
}
