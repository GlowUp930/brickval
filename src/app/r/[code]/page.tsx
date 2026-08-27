import Link from "next/link";

const appStoreUrl = "https://apps.apple.com/au/app/brickvalue/id6771715475";

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const safeCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-12 text-[var(--foreground)]">
      <section className="w-full max-w-md rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-[0_24px_80px_rgb(39_38_31/.14)] backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[var(--accent)] text-xl font-black">B</div>
          <div>
            <p className="font-display text-xl font-black">BrickVal</p>
            <p className="text-sm text-[var(--muted)]">LEGO collection value</p>
          </div>
        </div>
        <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">Friend invite</p>
        <h1 className="font-display text-4xl font-black leading-tight">Find the value in your collection.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted-strong)]">
          Open this link in BrickVal to claim your invite, or download the app and enter the code below.
        </p>
        <div className="mt-7 rounded-[18px] bg-[var(--surface)] px-5 py-4 text-center font-mono text-2xl font-black tracking-[0.18em]">
          {safeCode || "INVITE"}
        </div>
        <div className="mt-7 flex flex-col gap-3">
          <a
            href={`brickval://referral/${safeCode}`}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[var(--accent)] px-5 text-base font-extrabold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
          >
            Open BrickVal
          </a>
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-black/15 px-5 text-base font-extrabold transition hover:bg-black/5"
          >
            Download on the App Store
          </a>
          <Link href="/" className="pt-2 text-center text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)]">
            Learn about BrickVal
          </Link>
        </div>
      </section>
    </main>
  );
}
