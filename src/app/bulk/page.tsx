"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

type BulkResultRow =
  | {
      setNumber: string;
      setInfo: {
        name: string;
        image_url: string | null;
        set_number: string;
        year_released: number | null;
        is_obsolete: boolean;
      } | null;
      pricing: {
        rrp_usd: number | null;
        gain_pct: number | null;
        bricklink_new_avg_usd: number | null;
        ebay_new_avg_usd: number | null;
        ebay_used_avg_usd: number | null;
        data_source: "sold" | "listing";
      };
      error?: never;
    }
  | { setNumber: string; error: string; setInfo?: never; pricing?: never };

function parseSetNumbers(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[\n,]+/)
    .map((t) => t.trim().replace(/[^0-9]/g, ""))
    .filter((t) => t.length >= 4)
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

function PriceCell({ value }: { value: number | null }) {
  return (
    <td className="text-right px-3 py-3 font-medium tabular-nums">
      {value != null ? (
        <span style={{ color: "var(--foreground)" }}>${Math.round(value)}</span>
      ) : (
        <span style={{ color: "var(--muted)" }}>&mdash;</span>
      )}
    </td>
  );
}

function ResultsTable({ results }: { results: BulkResultRow[] }) {
  const found = results.filter((r) => !r.error).length;
  const notFound = results.length - found;

  return (
    <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Summary bar */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
          {results.length} set{results.length !== 1 ? "s" : ""} looked up
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {found} found &middot; {notFound} not found
        </p>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: "600px" }}>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {["SET", "BL NEW", "EBAY NEW", "EBAY USED", "RRP", "GAIN", "SOURCE"].map((h, i) => (
                <th
                  key={h}
                  className={`py-2.5 text-xs font-bold tracking-wide ${i === 0 ? "text-left px-4" : "text-right px-3"} ${h === "SOURCE" ? "text-center" : ""}`}
                  style={{ color: "var(--muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr
                key={row.setNumber}
                className="border-t transition-colors"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <td className="px-4 py-3">
                  {row.error ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                        style={{ background: "var(--surface)", color: "var(--muted)" }}
                      >
                        ?
                      </div>
                      <div>
                        <p className="text-xs italic" style={{ color: "var(--muted)" }}>Not found</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>#{row.setNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/result/${row.setNumber}`} className="flex items-center gap-2 group">
                      {row.setInfo?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.setInfo.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs" style={{ background: "var(--surface)", color: "var(--muted)" }}>?</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:underline" style={{ color: "var(--foreground)", maxWidth: "140px" }}>
                          {row.setInfo?.name ?? row.setNumber}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>#{row.setNumber}</p>
                      </div>
                    </Link>
                  )}
                </td>
                <PriceCell value={row.pricing?.bricklink_new_avg_usd ?? null} />
                <PriceCell value={row.pricing?.ebay_new_avg_usd ?? null} />
                <PriceCell value={row.pricing?.ebay_used_avg_usd ?? null} />
                <PriceCell value={row.pricing?.rrp_usd ?? null} />
                <td className="text-right px-3 py-3 font-bold">
                  {row.pricing?.gain_pct != null ? (
                    <span style={{ color: row.pricing.gain_pct >= 0 ? "var(--green)" : "var(--red)" }}>
                      {row.pricing.gain_pct >= 0 ? "+" : ""}{Math.round(row.pricing.gain_pct)}%
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>&mdash;</span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  {!row.error && row.pricing?.data_source === "sold" ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "var(--green)" }}>Sold</span>
                  ) : !row.error ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--surface)", color: "var(--muted)" }}>Listing</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BulkPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResultRow[] | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const parsedCount = parseSetNumbers(input).length;
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopError(null);
    setResults(null);

    const numbers = parseSetNumbers(input);
    if (numbers.length === 0) {
      setTopError("Enter at least one valid set number (4+ digits).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bulk-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setNumbers: numbers.slice(0, 20) }),
      });

      if (res.status === 401) {
        setTopError("You must be signed in to use bulk lookup.");
        return;
      }
      if (res.status === 402) {
        setTopError("Upgrade to Brickvalue Pro to use bulk lookup.");
        return;
      }
      if (!res.ok) {
        setTopError("Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setResults(data.results);
    } catch {
      setTopError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "rgba(13,13,15,0.85)" }}
      >
        <Link href="/">
          <Logo size="sm" />
        </Link>
        {authEnabled ? (
          <UserButton />
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Preview
          </span>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 py-8 max-w-2xl mx-auto w-full gap-6">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: "var(--foreground)" }}>
            Bulk Set Lookup
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Paste up to 20 set numbers, one per line or comma-separated.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className="rounded-3xl p-5 flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <textarea
              rows={6}
              placeholder={"75192\n10497\n42151"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium resize-none focus:outline-none"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
            />

            {parsedCount > 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {parsedCount} set{parsedCount !== 1 ? "s" : ""} detected
                {parsedCount > 20 ? " — only first 20 will be looked up" : ""}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full py-3.5 rounded-full font-black text-sm transition-transform active:scale-[0.98] disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {loading ? "Looking up..." : "Look up sets"}
            </button>
          </div>
        </form>

        {topError && (
          <p className="text-sm text-center" style={{ color: "var(--red)" }}>{topError}</p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
            <p className="text-sm" style={{ color: "var(--muted)" }}>Fetching market data...</p>
          </div>
        )}

        {results && !loading && <ResultsTable results={results} />}
      </div>
    </main>
  );
}
