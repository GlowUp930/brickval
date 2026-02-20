import { createCheckoutSession } from "./actions";
import Link from "next/link";

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm text-center flex flex-col gap-6">
        {/* Icon */}
        <div className="text-5xl">🧱</div>

        {/* Headline */}
        <div>
          <h1 className="text-2xl font-black mb-2">
            You&apos;ve used your 5 free scans
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Upgrade to BrickVal Pro for unlimited scans and instant access to
            current LEGO market prices.
          </p>
        </div>

        {/* Price */}
        <div className="bg-yellow-50 rounded-2xl p-4">
          <p className="text-3xl font-black">
            $12.99{" "}
            <span className="text-base font-normal text-gray-500">
              AUD/month
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-1">Cancel anytime</p>
        </div>

        {/* Features */}
        <ul className="text-sm text-gray-600 text-left flex flex-col gap-2">
          {[
            "Unlimited LEGO set scans",
            "Real-time secondary market prices",
            "Retirement status for every set",
            "RRP vs market value comparison",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-yellow-500 font-bold">✓</span>
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <form action={createCheckoutSession}>
          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 px-6 rounded-2xl text-lg transition-colors"
          >
            Upgrade to Pro
          </button>
        </form>

        <Link
          href="/scan"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to scanner
        </Link>
      </div>
    </main>
  );
}
