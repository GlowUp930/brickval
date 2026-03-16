"use client";

import Link from "next/link";

export default function ResultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-5"
      style={{ background: "var(--background)" }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: "var(--surface-2)" }}
      >
        ⚠️
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Something went wrong
        </h2>
        <p className="text-sm max-w-xs" style={{ color: "var(--muted)" }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="font-bold py-3 px-6 rounded-2xl transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Try again
        </button>
        <Link
          href="/scan"
          className="font-semibold py-3 px-6 rounded-2xl transition-all active:scale-95"
          style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          Back to scan
        </Link>
      </div>
    </main>
  );
}
