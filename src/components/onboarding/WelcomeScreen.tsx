"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export function WelcomeScreen({ onNext: _ }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center py-12">
      {/* Logo brick with glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
      >
        <div
          className="absolute -inset-8 rounded-full blur-3xl opacity-25"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative">
          <Logo size="lg" showText={false} />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-col gap-3"
      >
        <h1
          className="text-4xl font-black leading-tight tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Know what your{" "}
          <span style={{ color: "var(--accent)" }}>LEGO</span> is worth.
        </h1>
        <p className="text-lg font-black tracking-tight" style={{ color: "var(--foreground)" }}>
          Brick<span style={{ color: "var(--accent)" }}>value</span><span className="font-normal opacity-50">.live</span>
        </p>
        <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
          Scan any set. See the real market value.
        </p>
      </motion.div>

      {/* Stud row decoration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex items-center gap-2.5"
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="w-3.5 h-3.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow:
                "inset 0 -2px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(245,197,24,0.3)",
              opacity: 0.6 + i * 0.06,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
