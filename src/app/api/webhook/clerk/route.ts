import { createHash } from "node:crypto";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** Covers deletion through Clerk's built-in profile, as well as our own endpoint. */
export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  let event;
  try { event = await verifyWebhook(request); } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  if (event.type !== "user.deleted" || !event.data.id) return NextResponse.json({ received: true });
  const userId = event.data.id;
  const { error } = await supabase.rpc("stage_account_deletion", { p_user_id: userId });
  if (error) return NextResponse.json({ error: "deletion_unavailable" }, { status: 503 });
  const { error: completionError } = await supabase.from("account_deletion_requests")
    .update({ completed: true }).eq("user_hash", createHash("sha256").update(userId).digest("hex"));
  return completionError ? NextResponse.json({ error: "deletion_unavailable" }, { status: 503 }) : NextResponse.json({ received: true });
}
