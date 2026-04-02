import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { error, count } = await supabase
    .from("api_cache")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());

  if (error) {
    console.error("[cron/cleanup] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/cleanup] Deleted ${count ?? 0} expired cache rows`);
  return NextResponse.json({ deleted: count ?? 0, ok: true });
}
