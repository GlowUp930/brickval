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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { error: dbError } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to delete account data" },
      { status: 500 }
    );
  }

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  return NextResponse.json({ ok: true });
}
