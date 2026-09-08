import { NextResponse } from "next/server";
import { scanRequestAccess } from "@/lib/scan-request-access";
import { getCached, setCached } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import { fetchCollectionSoldGuides } from "@/lib/bricklink";
import { collectionHistory, historyKey, historySales, parseHistoryItems, type HistoryResult, type SoldGuides } from "@/lib/collection-history";

export const maxDuration = 120;

export async function POST(request: Request) {
  const access = await scanRequestAccess(request, "history");
  if (access instanceof NextResponse) return access;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const items = parseHistoryItems(body);
  if (!items) return NextResponse.json({ error: "invalid_items", message: "Send between 1 and 20 valid collection items." }, { status: 400 });
  const results = await collectionHistory(items, async item => {
    const key = historyKey(item);
    const cached = await getCached<HistoryResult>(key);
    if (cached) return cached;
    const rawKey = item.item_type === "set" ? `bricklink:${item.identifier}` : item.item_type === "minifig" ? `bricklink-minifig:${item.identifier}` : `bricklink-part:${item.identifier}:${item.color_id}`;
    const now = new Date();
    const { data: raw } = await supabase.from("api_cache").select("data,expires_at").eq("cache_key", rawKey).gt("expires_at", now.toISOString()).maybeSingle();
    let guides = raw?.data as SoldGuides | undefined;
    let fetchedAt = raw ? new Date(new Date(raw.expires_at).getTime() - 86400000).toISOString() : now.toISOString();
    if (!guides?.sold_new || !guides?.sold_used) {
      const fetched = await fetchCollectionSoldGuides(item.item_type, item.identifier, item.color_id);
      guides = { sold_new: fetched.sold_new ?? guides?.sold_new ?? null, sold_used: fetched.sold_used ?? guides?.sold_used ?? null };
      // Keep the older timestamp when a cached condition participates in the result.
      if (!raw) fetchedAt = now.toISOString();
    }
    const result: HistoryResult = { ...item, new_sales: historySales(guides.sold_new, now), used_sales: historySales(guides.sold_used, now), fetched_at: fetchedAt,
      new_error: guides.sold_new?.currency_code === "USD" ? null : "upstream_unavailable",
      used_error: guides.sold_used?.currency_code === "USD" ? null : "upstream_unavailable" };
    if (!result.new_error && !result.used_error) await setCached(key, result, Math.max(0.01, (new Date(fetchedAt).getTime() + 86400000 - now.getTime()) / 3600000));
    return result;
  });
  return NextResponse.json({ items: results });
}
