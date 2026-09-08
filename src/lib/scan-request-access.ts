import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "./supabase";

/** One server boundary for every provider-backed scan path, including legacy clients. */
export async function scanRequestAccess(request: Request): Promise<{ userId: string } | NextResponse> {
  try {
    const session = await auth();
    if (!session.userId && request.headers.has("authorization")) {
      return NextResponse.json({ error: "unauthorized", message: "Your session expired. Please sign in again." }, { status: 401 });
    }
    let userId = session.userId;
    const guest = !userId;
    if (guest) {
      // Vercel overwrites this header. Never trust client forwarding headers on
      // arbitrary production hosts. Local development shares one test identity.
      const address = process.env.VERCEL === "1"
        ? request.headers.get("x-forwarded-for")?.trim()
        : process.env.NODE_ENV !== "production" ? "127.0.0.1" : null;
      const secret = process.env.BRICKVALUE_RECOVERY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!address || !isIP(address) || !secret) throw new Error("Trusted guest identity unavailable");
      userId = `guest:${createHmac("sha256", secret).update(address).digest("hex")}`;
    }
    const { data: deleting, error: deletionError } = await supabase.from("account_deletion_requests")
      .select("user_hash").eq("user_hash", createHash("sha256").update(userId!).digest("hex"))
      .gt("expires_at", new Date().toISOString()).maybeSingle();
    if (deletionError) throw deletionError;
    if (deleting) throw new Error("Account deletion is pending");
    const { data: account, error: accountError } = await supabase.from("users")
      .select("is_pro").eq("id", userId!).maybeSingle();
    if (accountError) throw accountError;
    const limited = !account?.is_pro;
    const region = /\/(identify-region|recover)$/.test(new URL(request.url).pathname);
    const { data, error } = await supabase.rpc("consume_service_rate_limit", {
      p_key: `scan-requests:${region ? "regions" : "primary"}:${userId}`,
      p_limit: limited ? (region ? 180 : 12) : (region ? 600 : 120),
      p_now: new Date().toISOString(), p_window_seconds: limited ? 86400 : 60,
    });
    if (error) throw error;
    if (data !== true) return NextResponse.json({ error: "rate_limited", message: "Your scan allowance is temporarily exhausted. Please try again later." }, { status: 429 });
    const { error: userError } = await supabase.from("users").upsert({
      id: userId!, ...(guest ? { bulk_intro_grandfathered: true } : {}),
    }, { onConflict: "id", ignoreDuplicates: true });
    if (userError) throw userError;
    return { userId: userId! };
  } catch {
    return NextResponse.json({ error: "access_unavailable", message: "Your scan access could not be checked. Please try again shortly." }, { status: 503 });
  }
}
