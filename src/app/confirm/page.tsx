"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { IdentifyCandidate, CandidatePreview } from "@/types/scan";

const STALE_MS = 10 * 60 * 1000; // 10 minutes

interface StoredConfirm {
  mode: "set" | "minifig";
  candidates: IdentifyCandidate[];
  timestamp: number;
}

interface CardData extends CandidatePreview {
  rank: number;
}

export default function ConfirmPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"set" | "minifig">("set");
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("brickval_confirm") : null;
    if (!raw) { router.replace("/scan"); return; }

    let stored: StoredConfirm;
    try { stored = JSON.parse(raw); }
    catch { router.replace("/scan"); return; }

    if (Date.now() - stored.timestamp > STALE_MS) {
      sessionStorage.removeItem("brickval_confirm");
      router.replace("/scan");
      return;
    }

    setMode(stored.mode);

    // Fetch preview data for all candidates in parallel
    fetch("/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: stored.mode, ids: stored.candidates.map((c) => c.id) }),
    })
      .then((r) => r.json())
      .then((data: { previews: CandidatePreview[] }) => {
        const previews = data.previews ?? [];
        setCards(
          stored.candidates.map((c, i) => {
            const preview = previews.find((p) => p.id === c.id) ?? {
              id: c.id, name: null, image_url: null, year_released: null, is_obsolete: null,
            };
            return { ...preview, rank: i };
          })
        );
      })
      .catch(() => {
        // Fallback: render cards with raw IDs only, no preview images
        setCards(
          stored.candidates.map((c, i) => ({
            id: c.id, name: null, image_url: null, year_released: null, is_obsolete: null, rank: i,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleSelect(id: string) {
    sessionStorage.removeItem("brickval_confirm");
    if (mode === "minifig") {
      router.push(`/result/minifig/${id}`);
    } else {
      router.push(`/result/${id}`);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading matches…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "rgba(13,13,15,0.8)" }}
      >
        <Link
          href="/scan"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="font-bold text-[10px]" style={{ color: "var(--accent-fg)" }}>B</span>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>BrickVal</span>
        </div>
        <div className="w-9" />
      </header>

      <div className="flex-1 flex flex-col w-full max-w-md mx-auto px-5 pt-6 pb-8 gap-4">
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Which {mode === "minifig" ? "minifigure" : "set"} is this?
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            We found a few possible matches. Tap the right one.
          </p>
        </div>

        {/* Candidate cards */}
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleSelect(card.id)}
            className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {/* Thumbnail */}
            <div
              className="w-20 h-20 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {card.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.image_url}
                  alt={card.name ?? card.id}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span className="text-3xl">🧱</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Rank + retirement badges */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: card.rank === 0 ? "rgba(245,197,24,0.12)" : "rgba(107,107,122,0.15)",
                    color: card.rank === 0 ? "var(--accent)" : "var(--muted)",
                    border: `1px solid ${card.rank === 0 ? "rgba(245,197,24,0.25)" : "rgba(107,107,122,0.25)"}`,
                  }}
                >
                  {card.rank === 0 ? "Best match" : "Possible match"}
                </span>
                {mode === "set" && card.is_obsolete !== null && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: card.is_obsolete ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
                      color: card.is_obsolete ? "#ef4444" : "#22c55e",
                      border: `1px solid ${card.is_obsolete ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                    }}
                  >
                    {card.is_obsolete ? "Retired" : "In Stores"}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm leading-snug truncate" style={{ color: "var(--foreground)" }}>
                {card.name ?? `${mode === "minifig" ? "Minifig" : "Set"} #${card.id}`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {mode === "minifig" ? "Minifig" : "Set"} #{card.id}
                {card.year_released ? ` · ${card.year_released}` : ""}
              </p>
            </div>

            {/* Chevron */}
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0" style={{ color: "var(--muted)" }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}

        {/* None of these */}
        <Link
          href="/scan"
          className="w-full py-3.5 rounded-2xl text-center font-semibold text-sm transition-all active:scale-[0.98]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          None of these
        </Link>

        {/* Manual entry shortcut — set mode only */}
        {mode === "set" && (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            <Link href="/scan" className="underline underline-offset-2" style={{ color: "var(--muted)" }}>
              Enter set number manually instead
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
