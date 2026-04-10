"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WelcomeScreen } from "./WelcomeScreen";
import { HowItWorksScreen } from "./HowItWorksScreen";
import { DemoScreen } from "./DemoScreen";
import { TrustScreen } from "./TrustScreen";
import { SocialProofScreen } from "./SocialProofScreen";
import { PersonalizationScreen } from "./PersonalizationScreen";
import { GetStartedScreen } from "./GetStartedScreen";

const SCREENS = [
  WelcomeScreen,
  HowItWorksScreen,
  DemoScreen,
  TrustScreen,
  SocialProofScreen,
  PersonalizationScreen,
  GetStartedScreen,
] as const;

const TOTAL = SCREENS.length;

const screenTransition = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
};

export function OnboardingShell() {
  const [screen, setScreen] = useState(0);
  const router = useRouter();

  const next = useCallback(() => {
    if (screen < TOTAL - 1) {
      setScreen((s) => s + 1);
    } else {
      localStorage.setItem("onboarded", "true");
      router.push("/scan");
    }
  }, [screen, router]);

  const skip = useCallback(() => {
    localStorage.setItem("onboarded", "true");
    router.push("/scan");
  }, [router]);

  const CurrentScreen = SCREENS[screen];

  return (
    <main
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* ── Thin progress bar ── */}
      <div className="relative h-1 w-full" style={{ background: "var(--surface)" }}>
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: "var(--accent)" }}
          animate={{ width: `${((screen + 1) / TOTAL) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* ── Skip button ── */}
      {screen < TOTAL - 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={skip}
          className="absolute top-5 right-5 z-50"
        >
          Skip
        </Button>
      )}

      {/* ── Screen content ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            {...screenTransition}
            className="w-full max-w-sm mx-auto px-6 flex flex-col items-center"
          >
            <CurrentScreen onNext={next} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Continue button (except last screen which has its own CTA) ── */}
      {screen < TOTAL - 1 && (
        <div className="pb-10 px-6 flex flex-col items-center gap-3 w-full">
          <Button
            variant="primary"
            size="lg"
            onClick={next}
            className="w-full max-w-sm font-black text-base"
          >
            Continue
          </Button>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {screen + 1} of {TOTAL}
          </p>
        </div>
      )}
    </main>
  );
}
