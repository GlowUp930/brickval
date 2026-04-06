"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Finally an app that gives me real prices, not guesses. Saved me hundreds at a garage sale.",
    author: "LEGO collector, 15+ years",
  },
  {
    quote: "I scanned my entire collection in an afternoon. Now I know exactly what it's all worth.",
    author: "AFOL community member",
  },
];

export function SocialProofScreen({ onNext: _ }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center py-8">
      {/* Rating */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className="text-2xl"
              style={{ color: star <= 4 ? "var(--accent)" : "var(--muted)", opacity: star === 5 ? 0.4 : 1 }}
            >
              {star <= 4 ? "\u2605" : "\u2606"}
            </span>
          ))}
        </div>
        <p
          className="text-sm font-bold"
          style={{ color: "var(--foreground)" }}
        >
          4.8 out of 5
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Loved by LEGO collectors worldwide
        </p>
      </motion.div>

      {/* Testimonials */}
      <div className="flex flex-col gap-4 w-full">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.2, duration: 0.5 }}
            className="p-4 rounded-2xl text-left"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="text-sm leading-relaxed mb-2 italic"
              style={{ color: "var(--foreground)" }}
            >
              &ldquo;{t.quote}&rdquo;
            </p>
            <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              {t.author}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
