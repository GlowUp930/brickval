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
      <label htmlFor="set-number" className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
        Set number
      </label>
      <div className="flex gap-2">
        <input
          id="set-number"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 75192"
          value={value}
          onChange={(e) => { setValue(e.target.value.replace(/[^0-9]/g, "")); setError(null); }}
          maxLength={8}
          className="flex-1 rounded-xl px-4 py-3 text-lg focus:outline-none transition-colors"
          style={{
            background: "var(--surface)",
            color: "var(--foreground)",
            border: "2px solid var(--border)",
          }}
          onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
          onBlur={(e) => e.target.style.borderColor = "var(--border)"}
        />
        <button
          type="submit"
          disabled={value.trim().length < 4}
          className="font-bold px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "2px solid var(--border)" }}
        >
          Go
        </button>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
    </form>
  );
}
