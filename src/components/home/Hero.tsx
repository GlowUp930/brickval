import Link from "next/link";

export function Hero() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧱</span>
          <span className="text-lg font-black tracking-tight" style={{ color: "var(--foreground)" }}>BrickVal</span>
        </div>
        <Link
          href="/scan"
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Get started
        </Link>
      </nav>

      {/* Hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-lg mx-auto w-full gap-8">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
          style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px solid var(--border)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)" }} />
          AI-powered LEGO scanner
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-black leading-[1.05] tracking-tight" style={{ color: "var(--foreground)" }}>
          Know what your<br />
          <span style={{ color: "var(--accent)" }}>LEGO sets</span><br />
          are worth.
        </h1>

        {/* Sub */}
        <p className="text-lg leading-relaxed max-w-sm" style={{ color: "var(--muted)" }}>
          Scan the box with your phone. Get the AUD retail price and retirement status in seconds.
        </p>

        {/* CTA */}
        <Link
          href="/scan"
          className="w-full max-w-xs font-black py-4 px-8 rounded-2xl text-xl transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          Scan a set — it&apos;s free
        </Link>

        {/* Trust row */}
        <div className="flex items-center gap-6" style={{ color: "var(--muted)" }}>
          <div className="flex items-center gap-1.5 text-sm">
            <span>⚡</span>
            <span>Instant results</span>
          </div>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <div className="flex items-center gap-1.5 text-sm">
            <span>🤖</span>
            <span>AI-powered</span>
          </div>
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <div className="flex items-center gap-1.5 text-sm">
            <span>🇦🇺</span>
            <span>AUD prices</span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t px-6 py-12" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-center mb-8" style={{ color: "var(--muted)" }}>
            How it works
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { icon: "📷", step: "1", title: "Take a photo", desc: "Point your camera at any LEGO box" },
              { icon: "🤖", step: "2", title: "AI reads it", desc: "Claude Vision finds the set number" },
              { icon: "💰", step: "3", title: "See the value", desc: "Get the RRP in AUD instantly" },
            ].map(({ icon, title, desc, step }) => (
              <div key={step} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-1"
                  style={{ background: "var(--surface-2)" }}
                >
                  {icon}
                </div>
                <p className="font-bold text-sm" style={{ color: "var(--foreground)" }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--muted)" }}>© 2026 BrickVal · Prices sourced from Brickset</p>
      </footer>
    </main>
  );
}
