import type { BrickLinkPriceGuide } from "./bricklink";

export type HistoryItem = { identifier: string; item_type: "set" | "minifig" | "part"; color_id?: number };
export type HistorySale = { date: string; price_usd: number; quantity: number };
export type HistoryResult = HistoryItem & { new_sales: HistorySale[]; used_sales: HistorySale[]; fetched_at: string; new_error: string | null; used_error: string | null };
export type SoldGuides = { sold_new: BrickLinkPriceGuide | null; sold_used: BrickLinkPriceGuide | null };

export function parseHistoryItems(body: unknown): HistoryItem[] | null {
  const input = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(input) || !input.length || input.length > 20) return null;
  const items: HistoryItem[] = [];
  for (const row of input) {
    if (!row || !["set", "minifig", "part"].includes(row.item_type) || typeof row.identifier !== "string") return null;
    let identifier = row.identifier.trim().toLowerCase();
    if (row.item_type === "set") identifier = identifier.replace(/-1$/, "");
    if (!/^[a-z0-9-]{1,30}$/.test(identifier) || (row.item_type === "set" && !/^\d{4,8}(?:-\d+)?$/.test(identifier))) return null;
    if (row.item_type === "part" && (!Number.isSafeInteger(row.color_id) || row.color_id < 0)) return null;
    const item: HistoryItem = { identifier, item_type: row.item_type, ...(row.item_type === "part" ? { color_id: row.color_id } : {}) };
    if (!items.some(existing => historyKey(existing) === historyKey(item))) items.push(item);
  }
  return items;
}

export function historyKey(item: HistoryItem) {
  return `collection-history:v1:${item.item_type}:${item.identifier}:${item.color_id ?? "none"}`;
}

export function historySales(guide: BrickLinkPriceGuide | null, now: Date): HistorySale[] {
  if (!guide || guide.currency_code !== "USD") return [];
  return (guide.price_detail ?? []).flatMap(row => {
    const date = new Date(row.date_ordered ?? "");
    const price = Number(row.unit_price);
    if (!Number.isFinite(date.getTime()) || date > now || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(row.quantity) || row.quantity <= 0) return [];
    return [{ date: date.toISOString(), price_usd: price, quantity: row.quantity }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export async function collectionHistory(items: HistoryItem[], load: (item: HistoryItem) => Promise<HistoryResult>): Promise<HistoryResult[]> {
  let next = 0;
  const rows: HistoryResult[] = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      try { rows[index] = await load(item); }
      catch { rows[index] = { ...item, new_sales: [], used_sales: [], fetched_at: new Date().toISOString(), new_error: "upstream_unavailable", used_error: "upstream_unavailable" }; }
    }
  }));
  return rows;
}
