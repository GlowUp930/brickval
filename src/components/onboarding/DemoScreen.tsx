"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { setValue(target); }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, durationMs]);

  return value;
}

export function DemoScreen({ onNext: _ }: { onNext: () => void }) {
  const [showPrice, setShowPrice] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const animatedPrice = useCountUp(showPrice ? 289 : 0, 900);

  useEffect(() => {
    const t1 = setTimeout(() => setShowPrice(true), 400);
    const t2 = setTimeout(() => setShowBadge(true), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 text-center py-4 w-full">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--muted)" }}
      >
        Here&apos;s what you get
      </motion.p>

      {/* Result card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="w-full rounded-3xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px -12px rgba(0,0,0,0.6)",
        }}
      >
        {/* Set image */}
        <div
          className="relative h-28 flex items-center justify-center overflow-hidden"
          style={{ background: "var(--surface-2)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.bricklink.com/ItemImage/SN/0/75192-1.png"
            alt="LEGO Millennium Falcon 75192"
            className="h-full w-full object-contain p-2"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--surface))",
            }}
          />
        </div>

        {/* Identity */}
        <div className="px-4 pt-2 pb-3 text-center">
          <p
            className="font-bold text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Millennium Falcon
          </p>
          <p className="text-[11px]" style={{ color: "var(--muted)" }}>
            #75192 &middot; Star Wars &middot; 7,541 pieces
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(239,68,68,0.10)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              Retired
            </span>
          </div>
        </div>

        {/* Animated price */}
        <div
          className="mx-3 mb-3 rounded-2xl p-4 text-center"
          style={{
            border: "1px solid var(--border)",
            background:
              "linear-gradient(to bottom, rgba(245,197,24,0.05), transparent)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--accent)" }}
          >
            BrickLink Avg Sold &middot; New / Sealed
          </p>
          <p
            className="text-4xl font-bold tabular-nums leading-none"
            style={{ color: "var(--foreground)" }}
          >
            ${Math.round(animatedPrice)}
          </p>

          {/* Badge fades in after count-up */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={showBadge ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-2 mt-3 flex-wrap"
          >
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(34,197,94,0.18)",
                color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.30)",
              }}
            >
              +43% vs retail
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              42 real sales
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
