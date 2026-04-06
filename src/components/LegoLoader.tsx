"use client";

import { motion } from "framer-motion";

/**
 * Full-screen LEGO-themed loading overlay.
 * Shows animated bricks stacking + rotating status text.
 *
 * Usage:
 *   <LegoLoader message="Scanning set..." />
 */

const BRICK_COLORS = [
  "#f5c518", // gold (brand)
  "#e74c3c", // red
  "#3498db", // blue
  "#2ecc71", // green
  "#f39c12", // orange
];

function Brick({ color, delay, x }: { color: string; delay: number; x: number }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0, rotate: -15 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1], // bouncy
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 1.6,
      }}
      className="absolute"
      style={{ left: x }}
    >
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
        {/* Brick body */}
        <rect x="0" y="6" width="32" height="18" rx="2" fill={color} />
        {/* Top highlight */}
        <rect x="0" y="6" width="32" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />
        {/* Bottom shadow */}
        <rect x="0" y="22" width="32" height="2" rx="1" fill="rgba(0,0,0,0.15)" />
        {/* Left stud */}
        <rect x="5" y="2" width="7" height="5" rx="1" fill={color} />
        <ellipse cx="8.5" cy="2.5" rx="3.5" ry="1.5" fill="rgba(255,255,255,0.2)" />
        <ellipse cx="8.5" cy="2.5" rx="3.5" ry="1.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
        {/* Right stud */}
        <rect x="20" y="2" width="7" height="5" rx="1" fill={color} />
        <ellipse cx="23.5" cy="2.5" rx="3.5" ry="1.5" fill="rgba(255,255,255,0.2)" />
        <ellipse cx="23.5" cy="2.5" rx="3.5" ry="1.5" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
}

interface LegoLoaderProps {
  message?: string;
}

export function LegoLoader({ message = "Looking up..." }: LegoLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "rgba(13,13,15,0.92)", backdropFilter: "blur(8px)" }}
    >
      {/* Stacking bricks animation */}
      <div className="relative w-40 h-32 mb-8">
        {BRICK_COLORS.map((color, i) => (
          <Brick
            key={i}
            color={color}
            delay={i * 0.2}
            x={4 + (i % 2) * 16 + (i % 3) * 4}
          />
        ))}
      </div>

      {/* Pulsing message */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-base font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {message}
      </motion.p>

      {/* Subtitle */}
      <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
        Fetching real market data...
      </p>
    </motion.div>
  );
}
