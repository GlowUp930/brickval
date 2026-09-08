import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BrickVal",
  description:
    "Privacy policy for BrickVal, including data collection, camera use, payments, analytics, and account deletion.",
};

const lastUpdated = "September 5, 2026";

const sections = [
  {
    title: "What BrickVal Does",
    body: [
      "BrickVal helps you estimate the current USD market value of LEGO sets and minifigures. You can upload a photo, use your camera, or manually enter a set number. BrickVal is not affiliated with, sponsored by, or endorsed by the LEGO Group.",
    ],
  },
  {
    title: "Information We Collect",
    body: [
      "Account information: if you sign in, BrickVal receives basic account identifiers such as your user ID and email address when provided by the sign-in method.",
      "Scan information: when you scan or enter a LEGO set or minifigure, we process the image or number you provide so we can identify the item and return market pricing.",
      "Usage information: we store scan counts, Pro access status, and cached API responses needed to operate the app and reduce repeated calls to external services.",
      "Payment information: payments are handled by a secure payment processor. BrickVal does not store full card numbers. We store purchase or subscription status needed to unlock paid access.",
      "Analytics information: we may collect privacy-conscious usage data such as page views, browser type, device type, and country-level location.",
    ],
  },
  {
    title: "Camera And Photo Access",
    body: [
      "BrickVal only asks for camera or photo access when you choose to scan or upload an image. Images are used to identify the LEGO item and are sent to server-side services for that purpose. BrickVal does not access your camera in the background.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use your information to identify LEGO items, calculate market estimates, manage scan limits and paid access, prevent abuse, improve reliability, respond to support requests, and comply with legal obligations.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "BrickVal uses service providers for authentication, payment processing, hosting, database storage, analytics, image recognition, market pricing data, set metadata, and currency conversion.",
      "These providers process information under their own privacy policies. We only send information needed for the app feature being used.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We do not sell your personal information. We share information only with service providers that help operate BrickVal, when required by law, to protect the app from abuse, or as part of a business transfer such as a merger or acquisition.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "After account deletion, we retain hashed account and referral-installation security receipts for about 90 days to prevent repeated reward claims and process deletion retries. These receipts do not contain your name, email, photos, or collection. Guest scan limits use a server-hashed network address; people sharing a network may share the guest allowance.",
      "We keep account and payment status information while your account is active or as needed for legal, tax, security, and support reasons. Cached market data is designed to expire, usually within 24 hours for active pricing sources. Some logs may be kept for a limited time by our infrastructure providers.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can choose not to upload photos and instead enter set numbers manually where available. You can manage authentication through the sign-in provider and payment details through secure checkout or billing flows when enabled.",
      "You can request access, correction, export, or deletion of your personal information by contacting us. Deleting your account may remove access to paid features tied to that account.",
    ],
  },
  {
    title: "Children",
    body: [
      "BrickVal is not directed to children under 13. If you believe a child has provided personal information, contact us and we will take appropriate action.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational measures to protect information, including server-side API handling and restricted service credentials. No online service can guarantee absolute security.",
    ],
  },
  {
    title: "Changes To This Policy",
    body: [
      "We may update this policy as BrickVal changes. When we make material changes, we will update the date on this page and, where appropriate, provide additional notice.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh" style={{ background: "var(--background)" }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <header className="flex flex-col gap-10">
          <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl px-1 text-sm font-bold transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
              style={{ color: "var(--accent)" }}
            >
              BrickVal
            </Link>
            <Link
              href="/scan"
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition-transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Scan a set
            </Link>
          </nav>

          <div className="grid gap-5 md:grid-cols-[1fr_12rem] md:items-end">
            <div className="flex max-w-3xl flex-col gap-4">
              <p
                className="text-xs font-extrabold uppercase tracking-[0.18em]"
                style={{ color: "var(--muted-strong)" }}
              >
                Privacy Policy
              </p>
              <h1
                className="font-display text-4xl font-extrabold leading-[1.02] tracking-normal sm:text-5xl"
                style={{ color: "var(--foreground)" }}
              >
                How BrickVal handles your data
              </h1>
              <p className="max-w-2xl text-base leading-7 sm:text-lg" style={{ color: "var(--muted-strong)" }}>
                This page explains what BrickVal collects, why it is needed, who helps process it, and how to ask for deletion or support.
              </p>
            </div>
            <div
              className="rounded-2xl px-4 py-3 text-sm font-bold md:text-right"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              Updated<br className="hidden md:block" /> {lastUpdated}
            </div>
          </div>
        </header>

        <section
          aria-label="Privacy policy summary"
          className="grid gap-3 sm:grid-cols-3"
        >
          {["No sale of personal data", "Camera only when you scan", "Deletion available by request"].map((item) => (
            <div
              key={item}
              className="rounded-2xl px-4 py-4 text-sm font-bold leading-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              {item}
            </div>
          ))}
        </section>

        <article className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title} className="grid gap-3 md:grid-cols-[13rem_1fr] md:gap-8">
              <h2 className="text-lg font-extrabold leading-7" style={{ color: "var(--foreground)" }}>
                {section.title}
              </h2>
              <div className="flex max-w-2xl flex-col gap-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-7" style={{ color: "var(--muted-strong)" }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <footer
          className="flex flex-col gap-4 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-extrabold" style={{ color: "var(--foreground)" }}>
              Contact
            </h2>
            <p className="text-sm leading-6" style={{ color: "var(--muted-strong)" }}>
              For privacy questions or deletion requests, email us.
            </p>
          </div>
          <a
            href="mailto:HelloBrickval@outlook.com"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition-transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            HelloBrickval@outlook.com
          </a>
        </footer>
      </div>
    </main>
  );
}
