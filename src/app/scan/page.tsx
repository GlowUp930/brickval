"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/scan/ImageUploader";
import { ManualEntry } from "@/components/scan/ManualEntry";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export default function ScanPage() {
  const [showManual, setShowManual] = useState(false);
  const [mode, setMode] = useState<"set" | "minifig">("set");
  const [ready, setReady] = useState(false);
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const router = useRouter();

  // Redirect to onboarding if user hasn't completed it yet
  useEffect(() => {
    if (!localStorage.getItem("onboarded")) {
      router.replace("/onboarding");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Header — minimal, Cal.ai style */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl"
        style={{ borderColor: "var(--border)", background: "rgba(13,13,15,0.85)" }}
      >
        <Link href="/">
          <Logo size="sm" />
        </Link>
        {authEnabled ? (
          <UserButton />
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
            Preview
          </span>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-sm mx-auto w-full gap-8">
        {!authEnabled ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-3xl p-6 flex flex-col gap-4 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
              Preview build
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Sign-in keys are not configured in this environment yet, so scanning is disabled here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full px-5 py-3 font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Back to home
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-3xl font-black mb-2" style={{ color: "var(--foreground)" }}>
                {mode === "set" ? "Scan a Set" : "Scan a Minifig"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {mode === "set"
                  ? "Take a photo of the box or enter the set number."
                  : "Take a photo of your LEGO minifigure."}
              </p>
            </motion.div>

            {/* Mode toggle — pill style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex w-full rounded-full p-1 gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setMode("set")}
                className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
                style={mode === "set"
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { color: "var(--muted)" }}
              >
                Set
              </button>
              <button
                onClick={() => setMode("minifig")}
                className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
                style={mode === "minifig"
                  ? { background: "var(--accent)", color: "var(--accent-fg)" }
                  : { color: "var(--muted)" }}
              >
                Minifigure
              </button>
            </motion.div>

            {/* Upload card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full rounded-3xl p-6 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <ImageUploader mode={mode} onManualEntry={() => setShowManual(true)} />
            </motion.div>

            {/* Divider + Manual entry — set mode only */}
            {mode === "set" && (
              <>
                <div className="flex items-center gap-4 w-full">
                  <hr className="flex-1" style={{ borderColor: "var(--border)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>or enter manually</span>
                  <hr className="flex-1" style={{ borderColor: "var(--border)" }} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <ManualEntry />
                </motion.div>

                {showManual && (
                  <p className="text-xs text-center -mt-4" style={{ color: "var(--muted)" }}>
                    Can&apos;t find a number in the photo? Type it above.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
