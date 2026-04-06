"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export function GetStartedScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center py-8">
      {/* Celebration burst */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        {/* Glow ring */}
        <div
          className="absolute -inset-8 rounded-full blur-3xl opacity-20"
          style={{ background: "var(--accent)" }}
        />
        {/* Stud burst pattern */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 300 }}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: "var(--accent)",
                boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.2)",
                transform: `rotate(${i * 45}deg) translateY(-38px)`,
                opacity: 0.6 + i * 0.05,
              }}
            />
          ))}
          <Logo size="lg" showText={false} />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-col gap-3"
      >
        <h2
          className="text-3xl font-black tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          You&apos;re all set!
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
          Your first 5 scans are free.
          <br />
          See what your LEGO collection is really worth.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full flex flex-col gap-3"
      >
        <button
          onClick={onNext}
          className="w-full font-black py-4 px-6 rounded-full text-lg transition-all active:scale-[0.98]"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            boxShadow: "0 4px 24px rgba(245,197,24,0.3)",
          }}
        >
          Scan My First Set
        </button>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Pro: Unlimited scans for less than $0.43/day
        </p>
      </motion.div>
    </div>
  );
}
