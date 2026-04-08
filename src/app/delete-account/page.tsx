import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata: Metadata = {
  title: "Delete Your Account — Brickvalue.live",
};

export default function DeleteAccountPage() {
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

      <h1 className="text-3xl font-black mb-6" style={{ color: "var(--foreground)" }}>
        Delete Your Account
      </h1>

      <div
        className="flex flex-col gap-5 text-sm leading-relaxed"
        style={{ color: "var(--muted)" }}
      >
        <p>
          Deleting your account is permanent and cannot be undone. The following will
          be removed immediately:
        </p>

        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Your Brickvalue account and sign-in credentials</li>
          <li>Your scan history counter</li>
          <li>Any subscription status linked to your account</li>
        </ul>

        <p>
          Cached market data (which is anonymous and not linked to your account) is
          automatically cleared on its normal 24-hour schedule.
        </p>

        <p>
          Active subscriptions should be cancelled separately through the store where
          you purchased them (Google Play or Stripe) before deleting your account.
        </p>

        <div className="mt-6">
          <DeleteAccountForm />
        </div>

        <p className="text-xs mt-8" style={{ color: "var(--muted)" }}>
          Questions? Email privacy@brickvalue.live — we respond within 48 hours.
        </p>
      </div>
    </main>
  );
}
