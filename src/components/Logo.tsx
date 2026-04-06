"use client";

/**
 * Brickvalue.live logo — a premium brick icon + wordmark.
 * Used across navbar, onboarding, and share dialogs.
 *
 * Sizes:
 *   "sm"  — 24px icon, compact text (headers/nav)
 *   "md"  — 32px icon, normal text (default)
 *   "lg"  — 48px icon, large text (onboarding hero)
 */

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: "w-6 h-6", radius: "rounded-md", text: "text-sm", brick: "text-[9px]" },
  md: { icon: "w-8 h-8", radius: "rounded-lg", text: "text-lg", brick: "text-[11px]" },
  lg: { icon: "w-12 h-12", radius: "rounded-xl", text: "text-2xl", brick: "text-sm" },
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brick icon — two studs on top */}
      <div
        className={`${s.icon} ${s.radius} relative flex items-center justify-center overflow-hidden`}
        style={{
          background: "linear-gradient(135deg, #f5c518, #e6b200)",
          boxShadow: "0 2px 8px rgba(245,197,24,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {/* Studs */}
        <div className="absolute top-[3px] flex gap-[3px]">
          <div
            className="w-[6px] h-[6px] rounded-full"
            style={{
              background: "linear-gradient(180deg, #ffd740, #e6b200)",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.15), 0 0.5px 1px rgba(0,0,0,0.1)",
            }}
          />
          <div
            className="w-[6px] h-[6px] rounded-full"
            style={{
              background: "linear-gradient(180deg, #ffd740, #e6b200)",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.15), 0 0.5px 1px rgba(0,0,0,0.1)",
            }}
          />
        </div>
        {/* Letter */}
        <span
          className={`${s.brick} font-black mt-1 select-none`}
          style={{ color: "var(--accent-fg)" }}
        >
          BV
        </span>
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className={`${s.text} font-black tracking-tight select-none`}
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
