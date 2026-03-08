import { createCheckoutSession } from "./actions";
import Link from "next/link";

export default function UpgradePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <div
        className="rounded-3xl p-8 max-w-sm w-full text-center flex flex-col gap-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Icon */}
        <div className="text-5xl">🧱</div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ color: "var(--foreground)" }}>
            You&apos;ve used your 5 free scans
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Upgrade to BrickVal Pro for unlimited scans and instant access to
            current LEGO market prices.
          </p>
        </div>

        {/* Price */}
        <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)" }}>
          <p className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
            $12.99{" "}
            <span className="text-base font-normal" style={{ color: "var(--muted)" }}>
              USD/month
            </span>
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Cancel anytime</p>
        </div>

        {/* Features */}
        <ul className="text-sm text-left flex flex-col gap-2" style={{ color: "var(--muted)" }}>
          {[
            "Unlimited LEGO set scans",
            "Real-time secondary market prices",
            "Retirement status for every set",
            "BrickLink + eBay price comparison",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="font-bold" style={{ color: "var(--accent)" }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <form action={createCheckoutSession}>
          <button
            type="submit"
            className="w-full font-black py-4 px-6 rounded-2xl text-lg transition-all active:scale-[0.98]"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Upgrade to Pro
          </button>
        </form>

        <Link
          href="/scan"
          className="text-sm transition-colors"
          style={{ color: "var(--muted)" }}
        >
          ← Back to scanner
        </Link>
      </div>
    </main>
  );
}
