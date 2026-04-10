"use client";

import { forwardRef, ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size    = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  startIcon?: ReactNode;
  endIcon?:   ReactNode;
}

// ── Style maps ────────────────────────────────────────────────────────────────
const BASE =
  "relative inline-flex items-center justify-center gap-2 font-bold rounded-full " +
  "select-none transition-all duration-150 active:scale-[0.97] " +
  "disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none";

const VARIANTS: Record<Variant, string> = {
  primary:     "btn-primary",
  secondary:   "btn-secondary",
  ghost:       "btn-ghost",
  destructive: "btn-destructive",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3.5 text-sm",
  lg: "px-8 py-4 text-base",
};

// ── Component ─────────────────────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      startIcon,
      endIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {/* Loading spinner — absolutely positioned so it doesn't shift layout */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="3"
              className="opacity-25"
            />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              className="opacity-75"
            />
          </svg>
        </span>
      )}

      {startIcon && !loading && (
        <span className="shrink-0">{startIcon}</span>
      )}

      {/* Keep the label in the DOM so the button doesn't resize during loading */}
      <span style={{ visibility: loading ? "hidden" : "visible" }}>
        {children}
      </span>

      {endIcon && !loading && (
        <span className="shrink-0">{endIcon}</span>
      )}
    </button>
  )
);
Button.displayName = "Button";
