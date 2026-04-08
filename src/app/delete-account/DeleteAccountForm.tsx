"use client";

import { useState } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";

export function DeleteAccountForm() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    return <p className="text-sm">Loading...</p>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--foreground)" }}>
          Sign in first to delete your account.
        </p>
        <SignInButton mode="modal">
          <button
            className="px-5 py-3 rounded-full font-bold text-sm self-start"
            style={{ background: "var(--brick-gold)", color: "#0d0d0f" }}
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--foreground)" }}>
          Your account has been deleted. You have been signed out.
        </p>
      </div>
    );
  }

  const canSubmit = confirm.trim().toUpperCase() === "DELETE" && status !== "loading";

  const onDelete = async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setStatus("done");
      // Clerk session is now invalid server-side; force a client sign-out next render.
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "var(--foreground)" }}>
        Signed in as{" "}
        <strong>{user?.primaryEmailAddress?.emailAddress ?? user?.id}</strong>
      </p>

      <label className="text-xs flex flex-col gap-2">
        Type <strong style={{ color: "var(--foreground)" }}>DELETE</strong> to confirm:
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="px-4 py-3 rounded-lg border text-sm"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.12)",
            color: "var(--foreground)",
          }}
        />
      </label>

      <button
        onClick={onDelete}
        disabled={!canSubmit}
        className="px-5 py-3 rounded-full font-bold text-sm self-start disabled:opacity-40"
        style={{ background: "#ff4444", color: "white" }}
      >
        {status === "loading" ? "Deleting..." : "Permanently delete my account"}
      </button>

      {error && (
        <p className="text-xs" style={{ color: "#ff7676" }}>
          {error}
        </p>
      )}

      <div className="mt-2">
        <SignOutButton>
          <button className="text-xs underline" style={{ color: "var(--muted)" }}>
            Or sign out without deleting
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
