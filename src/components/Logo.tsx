"use client";

/**
 * Brickvalue.live logo — a LEGO 2×1 brick icon + wordmark.
 * The icon is a side-profile brick with two studs, rendered as an SVG
 * so it scales crisply at every size.
 *
 * Sizes:
 *   "sm"  — 24px icon (headers/nav)
 *   "md"  — 32px icon (default)
 *   "lg"  — 48px icon (onboarding hero)
 */

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const dims = {
  sm: { px: 24, text: "text-sm", gap: "gap-2" },
  md: { px: 32, text: "text-lg", gap: "gap-2.5" },
  lg: { px: 48, text: "text-2xl", gap: "gap-3" },
};

/**
 * SVG LEGO 2×1 brick — isometric-ish side view.
 * Gold gradient with two studs on top, subtle 3D depth.
 */
function BrickIcon({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Main brick body gradient */}
        <linearGradient id="brickBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd740" />
          <stop offset="100%" stopColor="#d4a017" />
        </linearGradient>
        {/* Brick front face — slightly darker */}
        <linearGradient id="brickFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c518" />
          <stop offset="100%" stopColor="#c9960d" />
        </linearGradient>
        {/* Stud top gradient */}
        <linearGradient id="studTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#e6b200" />
        </linearGradient>
        {/* Stud side gradient */}
        <linearGradient id="studSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="brickGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Ambient glow behind brick */}
      <rect x="6" y="14" width="36" height="24" rx="2" fill="#f5c518" opacity="0.15" filter="url(#brickGlow)" />

      {/* ── Brick body ── */}
      {/* Top face */}
      <rect x="6" y="16" width="36" height="20" rx="3" fill="url(#brickBody)" />
      {/* Front face overlay for depth */}
      <rect x="6" y="24" width="36" height="12" rx="0" fill="url(#brickFront)" opacity="0.5" />
      {/* Bottom edge highlight */}
      <rect x="6" y="34" width="36" height="2" rx="1" fill="rgba(0,0,0,0.12)" />
      {/* Top edge highlight */}
      <rect x="6" y="16" width="36" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />
      {/* Left edge shadow */}
      <rect x="6" y="16" width="1.2" height="20" fill="rgba(255,255,255,0.15)" />
      {/* Right edge shadow */}
      <rect x="40.8" y="16" width="1.2" height="20" fill="rgba(0,0,0,0.08)" />

      {/* ── Left stud ── */}
      {/* Stud cylinder side */}
      <rect x="12" y="10" width="8" height="7" rx="1" fill="url(#studSide)" />
      {/* Stud top ellipse */}
      <ellipse cx="16" cy="10.5" rx="4" ry="2" fill="url(#studTop)" />
      {/* Stud highlight */}
      <ellipse cx="15" cy="10" rx="1.8" ry="0.8" fill="rgba(255,255,255,0.35)" />

      {/* ── Right stud ── */}
      {/* Stud cylinder side */}
      <rect x="28" y="10" width="8" height="7" rx="1" fill="url(#studSide)" />
      {/* Stud top ellipse */}
      <ellipse cx="32" cy="10.5" rx="4" ry="2" fill="url(#studTop)" />
      {/* Stud highlight */}
      <ellipse cx="31" cy="10" rx="1.8" ry="0.8" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const d = dims[size];

  return (
    <div className={`flex items-center ${d.gap} ${className}`}>
      <BrickIcon px={d.px} />

      {showText && (
        <span
          className={`${d.text} font-black tracking-tight select-none`}
          style={{ color: "var(--foreground)" }}
        >
          Brick
          <span style={{ color: "var(--accent)" }}>value</span>
          <span className="font-normal opacity-50">.live</span>
        </span>
      )}
    </div>
  );
}
