"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignIn, SignOutButton, useAuth, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

type SyncState = "idle" | "syncing" | "done" | "error";

function postNativeAuthToken(token: string | null, userId: string | null = null) {
  if (typeof window === "undefined") return;
  const nativeWindow = window as Window & {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  };
  nativeWindow.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: "auth_token", token, userId })
  );
}

function postNativeCloseModal() {
  if (typeof window === "undefined") return;
  const nativeWindow = window as Window & {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  };
  nativeWindow.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: "close_modal" })
  );
}

function detectNativeWebView(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView;
}

export function AccountClient() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(detectNativeWebView());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncToken() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        postNativeAuthToken(null);
        setSyncState("idle");
        return;
      }

      setSyncState("syncing");

      try {
        const token = await getToken();
        if (cancelled) return;
        postNativeAuthToken(token ?? null, user?.id ?? null);
        setSyncState(token ? "done" : "error");
      } catch {
        if (cancelled) return;
        postNativeAuthToken(null);
        setSyncState("error");
      }
    }

    syncToken();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, user?.id]);

  // When signed in via the native WebView and the token sync completes,
  // auto-close the modal so the user is returned to the native scanner
  // instead of being left on the hosted /account page.
  useEffect(() => {
    if (!isNative) return;
    if (syncState !== "done") return;
    const t = setTimeout(() => {
      postNativeCloseModal();
    }, 600);
    return () => clearTimeout(t);
  }, [isNative, syncState]);

  if (!isLoaded) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--background)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Loading account...
        </p>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--background)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 48px -12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex justify-center">
            <Logo size="md" showText={false} />
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-black mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Sign in to keep scanning
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Guest mode covers your first 3 lookups. Sign in after that to keep
              using BrickVal on mobile.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
            {/* Force redirect back to /account so AccountClient stays mounted
                and can sync the Clerk token to the native app (overrides
                the ClerkProvider-level signInForceRedirectUrl="/scan"). */}
            <SignIn
              forceRedirectUrl="/account"
              signUpForceRedirectUrl="/account"
            />
          </div>
          {isNative ? (
            <button
              type="button"
              onClick={postNativeCloseModal}
              className="text-center text-sm font-medium bg-transparent border-0 cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              Back to scanner
            </button>
          ) : (
            <Link
              href="/"
              className="text-center text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              Back to home
            </Link>
          )}
        </motion.div>
      </main>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? user?.id;
  const syncMessage =
    syncState === "syncing"
      ? "Syncing your mobile session..."
      : syncState === "done"
        ? isNative
          ? "Mobile access is ready. Returning to scanner..."
          : "Mobile access is ready. You can close this page."
        : syncState === "error"
          ? "We signed you in, but mobile token sync failed. Refresh this page once."
          : "Signed in.";

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--background)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 48px -12px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex justify-center">
          <Logo size="md" showText={false} />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black mb-2" style={{ color: "var(--foreground)" }}>
            Account connected
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Signed in as <strong style={{ color: "var(--foreground)" }}>{email}</strong>
          </p>
        </div>

        <div
          className="rounded-2xl p-4 text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: syncState === "error" ? "#ff8f8f" : "var(--foreground)" }}>
            {syncMessage}
          </p>
        </div>

        <SignOutButton redirectUrl="/account">
          <button
            type="button"
            className="w-full font-bold py-3 px-5 rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--foreground)" }}
          >
            Sign out
          </button>
        </SignOutButton>

        {isNative ? (
          <button
            type="button"
            onClick={postNativeCloseModal}
            className="text-center text-sm font-medium bg-transparent border-0 cursor-pointer"
            style={{ color: "var(--muted)" }}
          >
            Back to scanner
          </button>
        ) : (
          <Link
            href="/scan"
            className="text-center text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            Back to scanner
          </Link>
        )}
      </motion.div>
    </main>
  );
}
