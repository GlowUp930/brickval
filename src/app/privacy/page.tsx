import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy — Brickvalue.live",
};

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen px-6 py-16 max-w-2xl mx-auto"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="mb-10">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>
      <h1 className="text-3xl font-black mb-8" style={{ color: "var(--foreground)" }}>
        Privacy Policy
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Last updated: April 6, 2026
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            What We Collect
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <strong style={{ color: "var(--foreground)" }}>Account information:</strong> When you sign up via Clerk, we store your user ID. We do not store your email or password directly.
            </li>
            <li>
              <strong style={{ color: "var(--foreground)" }}>Photos you scan:</strong> Images are sent to our server for processing and are not stored after the scan is complete. We do not keep your photos.
            </li>
            <li>
              <strong style={{ color: "var(--foreground)" }}>Scan history:</strong> We track the number of scans you have used (a counter, not the images or results).
            </li>
            <li>
              <strong style={{ color: "var(--foreground)" }}>Payment information:</strong> Handled entirely by Stripe (web) or Google Play (Android). We never see or store your card details.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            How We Use Your Data
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>To identify LEGO sets from your photos using AI (Anthropic Claude Vision).</li>
            <li>To look up market prices from BrickLink and eBay.</li>
            <li>To manage your subscription and scan limits.</li>
            <li>To improve the service (anonymous, aggregated usage analytics via Vercel Analytics).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Third-Party Services
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li><strong style={{ color: "var(--foreground)" }}>Clerk</strong> — authentication</li>
            <li><strong style={{ color: "var(--foreground)" }}>Anthropic (Claude)</strong> — AI-powered set identification</li>
            <li><strong style={{ color: "var(--foreground)" }}>BrickLink &amp; eBay</strong> — market pricing data</li>
            <li><strong style={{ color: "var(--foreground)" }}>Stripe</strong> — web payment processing</li>
            <li><strong style={{ color: "var(--foreground)" }}>Google Play</strong> — Android payment processing</li>
            <li><strong style={{ color: "var(--foreground)" }}>Supabase</strong> — database hosting</li>
            <li><strong style={{ color: "var(--foreground)" }}>Vercel</strong> — hosting and analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Data Retention
          </h2>
          <p>
            Scanned images are processed in memory and discarded immediately after identification. API response caches are stored for 24 hours to improve performance, then automatically deleted. Your account data is retained as long as your account is active.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Your Rights
          </h2>
          <p>
            You can request deletion of your account and all associated data at any time by contacting us. We will delete your data within 30 days of your request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Contact
          </h2>
          <p>
            For privacy questions or data deletion requests, email us at privacy@brickvalue.live.
          </p>
        </section>
      </div>
    </main>
  );
}
