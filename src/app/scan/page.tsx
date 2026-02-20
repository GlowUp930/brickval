"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/scan/ImageUploader";
import { ManualEntry } from "@/components/scan/ManualEntry";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function ScanPage() {
  const [showManual, setShowManual] = useState(false);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🧱</span>
          <span className="font-black tracking-tight" style={{ color: "var(--foreground)" }}>BrickVal</span>
        </Link>
        <UserButton />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-sm mx-auto w-full gap-8">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--foreground)" }}>
            Scan a Set
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Take a photo of the box or enter the set number manually.
          </p>
        </div>

        {/* Upload card */}
        <div
          className="w-full rounded-3xl p-6 flex flex-col gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <ImageUploader onManualEntry={() => setShowManual(true)} />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <hr className="flex-1" style={{ borderColor: "var(--border)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>or enter manually</span>
          <hr className="flex-1" style={{ borderColor: "var(--border)" }} />
        </div>

        {/* Manual entry */}
        <ManualEntry />

        {showManual && (
          <p className="text-xs text-center -mt-4" style={{ color: "var(--muted)" }}>
            Can&apos;t find a number in the photo? Type it above.
          </p>
        )}
      </div>
    </main>
  );
}
