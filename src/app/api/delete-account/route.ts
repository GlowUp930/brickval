import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Self-service account deletion endpoint — required for Google Play Store
 * compliance. Deletes the user's Supabase row and then their Clerk account.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "authentication_required", message: "Sign in to delete your account." }, { status: 401 });
  }

  const supabase = getSupabase();
  try {
    // The database deletion and security receipt are one durable transaction.
    // If Clerk fails, the still-authenticated user can retry this same endpoint.
    const { error } = await supabase.rpc("stage_account_deletion", { p_user_id: userId });
    if (error) throw error;
    const client = await clerkClient();
    try { await client.users.deleteUser(userId); } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }
    const { error: completionError } = await supabase.from("account_deletion_requests")
      .update({ completed: true }).eq("user_hash", createHash("sha256").update(userId).digest("hex"));
    // Identity and user data are already deleted. A receipt bookkeeping failure
    // must not report that the account still exists; the signed webhook retries it.
    if (completionError) console.warn("[delete-account] Completion receipt update deferred to webhook");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "account_deletion_failed",
      message: "Account deletion could not be completed. Please retry from Manage Account." }, { status: 503 });
  }
}
