"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualEntry() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = value.trim().replace(/[^0-9]/g, "");
    if (cleaned.length < 4) {
      setError("Set numbers are at least 4 digits.");
      return;
    }
    setError(null);
    router.push(`/result/${cleaned}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <div className="flex gap-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="e.g. 42151"
        value={value}
        onChange={(e) => { setValue(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
        maxLength={8}
        className="flex-1 px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
        style={{
          background: "var(--surface)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 2px rgba(245,197,24,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
      />
      <button
        type="submit"
        disabled={value.trim().length < 4}
        className="px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        Look up
      </button>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
    </form>
  );
}
