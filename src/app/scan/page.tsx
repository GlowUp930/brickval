"use client";

import { useState } from "react";
import { ImageUploader } from "@/components/scan/ImageUploader";
import { ManualEntry } from "@/components/scan/ManualEntry";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ScanPage() {
  const [showManual, setShowManual] = useState(false);
  const [mode, setMode] = useState<"set" | "minifig">("set");

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <span className="font-bold text-xs" style={{ color: "var(--accent-fg)" }}>B</span>
          </div>
          <span className="font-bold tracking-tight" style={{ color: "var(--foreground)" }}>BrickVal</span>
        </Link>
        <UserButton />
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 max-w-sm mx-auto w-full gap-8">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            {mode === "set" ? "Scan a Set" : "Scan a Minifig"}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {mode === "set"
              ? "Take a photo of the box or enter the set number manually."
              : "Take a photo of your LEGO minifigure to get its current market value."}
          </p>
        </motion.div>

        {/* Mode toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex w-full rounded-xl p-1 gap-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setMode("set")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={mode === "set"
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { color: "var(--muted)" }}
          >
            Set
          </button>
          <button
            onClick={() => setMode("minifig")}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
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

        {/* Divider + Manual entry — only shown for set mode */}
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
      </div>
    </main>
  );
}
