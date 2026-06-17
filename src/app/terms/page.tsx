import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms — Brickvalue.live",
  description:
    "Read the BrickVal terms for LEGO set identification, USD market value estimates, purchases, subscriptions, account deletion, and LEGO trademark disclaimers.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
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
        Terms of Use
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Last updated: June 5, 2026
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            What BrickVal Does
          </h2>
          <p>
            BrickVal helps identify LEGO sets, minifigures, and parts from photos and shows estimated USD market values from third-party marketplace data. Prices are estimates, not guaranteed sale prices or formal appraisals.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Purchases and Subscriptions
          </h2>
          <p>
            BrickVal Pro unlocks paid app features such as increased scan access. Purchases made in the iOS app are processed by Apple through the App Store. You can manage or cancel Apple subscriptions in your Apple ID account settings.
          </p>
          <p className="mt-3">
            Apple&apos;s standard end user license agreement applies to the iOS app unless Apple requires different terms. You can read it at{" "}
            <a className="underline" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" style={{ color: "var(--foreground)" }}>
              Apple&apos;s Standard EULA
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Accounts and Deletion
          </h2>
          <p>
            You can delete your BrickVal account from the app or from the{" "}
            <Link href="/delete-account" className="underline" style={{ color: "var(--foreground)" }}>
              Delete Account
            </Link>{" "}
            page. Deleting your account does not automatically cancel an active App Store subscription; manage that separately through Apple.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            LEGO Disclaimer
          </h2>
          <p>
            BrickVal is an independent app and is not sponsored, authorized, or endorsed by the LEGO Group. LEGO and related marks belong to their respective owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Contact
          </h2>
          <p>
            For support or terms questions, email privacy@brickvalue.live.
          </p>
        </section>
      </div>
    </main>
  );
}
