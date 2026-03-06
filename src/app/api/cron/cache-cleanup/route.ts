import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Vercel Cron job — runs every hour to delete expired cache rows.
 * Configured in vercel.json: { "crons": [{ "path": "/api/cron/cache-cleanup", "schedule": "0 * * * *" }] }
 *
 * Protected by CRON_SECRET — Vercel sets the Authorization header automatically
 * for cron invocations. Manual calls without the secret are rejected.
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (not a random caller)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("api_cache")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("cache_key");

  if (error) {
    console.error("[cron/cache-cleanup] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deletedCount = data?.length ?? 0;
  console.log(`[cron/cache-cleanup] Deleted ${deletedCount} expired rows`);

  return NextResponse.json({ ok: true, deleted: deletedCount });
}
