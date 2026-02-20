import Link from "next/link";

export function PricingSection() {
  return (
    <section className="bg-gray-50 py-20 px-6">
      <div className="max-w-sm mx-auto flex flex-col items-center gap-8 text-center">
        <h2 className="text-3xl font-black">Simple pricing</h2>

        <div className="bg-white rounded-3xl p-8 w-full shadow-sm flex flex-col gap-5">
          {/* Free tier */}
          <div className="flex flex-col gap-1">
            <p className="font-bold text-lg">Free</p>
            <p className="text-3xl font-black">$0</p>
            <p className="text-gray-400 text-sm">5 scans to try it out</p>
          </div>

          <hr className="border-gray-100" />

          {/* Pro tier */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center gap-2">
              <p className="font-bold text-lg">Pro</p>
              <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                POPULAR
              </span>
            </div>
            <p className="text-3xl font-black">
              $12.99{" "}
              <span className="text-base font-normal text-gray-400">
                AUD/month
              </span>
            </p>
            <p className="text-gray-400 text-sm">Unlimited scans · Cancel anytime</p>
          </div>

          <ul className="text-sm text-gray-600 text-left flex flex-col gap-2">
            {[
              "Unlimited LEGO set scans",
              "Real-time secondary market prices",
              "Retirement status badge",
              "RRP vs market value (% gain)",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/scan"
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 px-6 rounded-2xl transition-colors"
          >
            Start scanning free
          </Link>
        </div>
      </div>
    </section>
  );
}
