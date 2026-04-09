"use client";

/**
 * BrickVal logo — a top-down 2×2 LEGO brick icon with scan-bracket corners.
 * Matches the app icon design: yellow brick, grey viewfinder brackets, dark bg.
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

/** Top-down 2×2 LEGO brick with camera-viewfinder corner brackets. */
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
      {/* Corner scan brackets */}
      <path d="M4 15 L4 4 L15 4" stroke="#888898" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M33 4 L44 4 L44 15" stroke="#888898" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 33 L4 44 L15 44" stroke="#888898" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M33 44 L44 44 L44 33" stroke="#888898" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Brick body — top-down 2×2 view */}
      <rect x="10" y="10" width="28" height="28" rx="4" fill="#F5C518"/>
      {/* Subtle inner shadow for depth */}
      <rect x="10" y="10" width="28" height="28" rx="4" fill="rgba(0,0,0,0.06)"/>

      {/* 4 studs */}
      <circle cx="17.5" cy="17.5" r="4.2" fill="#D4971A"/>
      <circle cx="30.5" cy="17.5" r="4.2" fill="#D4971A"/>
      <circle cx="17.5" cy="30.5" r="4.2" fill="#D4971A"/>
      <circle cx="30.5" cy="30.5" r="4.2" fill="#D4971A"/>

      {/* Stud highlights */}
      <circle cx="16.2" cy="16.2" r="1.6" fill="rgba(255,255,255,0.38)"/>
      <circle cx="29.2" cy="16.2" r="1.6" fill="rgba(255,255,255,0.38)"/>
      <circle cx="16.2" cy="29.2" r="1.6" fill="rgba(255,255,255,0.38)"/>
      <circle cx="29.2" cy="29.2" r="1.6" fill="rgba(255,255,255,0.38)"/>
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
          <span style={{ color: "var(--accent)" }}>Val</span>
        </span>
      )}
    </div>
  );
}
