import { AccountClient } from "./AccountClient";

export default function AccountPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--background)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Account sign-in is not configured in this environment.
        </p>
      </main>
    );
  }

  return <AccountClient />;
}
