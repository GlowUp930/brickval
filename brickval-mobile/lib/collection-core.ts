import type { MarketHistoryPoint, LookupItemType, ScanMode } from "./api";
import { normalizeImageUrl } from "./image-url";

export type CollectionItemType = LookupItemType;
export type CollectionCondition = "new_sealed" | "used";

export interface CollectionItem {
  set_number: string;
  item_type: CollectionItemType;
  name: string;
  theme: string;
  pieces: number | null;
  year_released?: number | null;
  is_obsolete?: boolean | null;
  image_url: string | null;
  market_value_usd: number | null;
  rrp_usd: number | null;
  gain_pct: number | null;
  data_source: "sold" | "listing" | null;
  quantity: number;
  condition: CollectionCondition;
  color_id?: number | null;
  color_name?: string | null;
  market_history: MarketHistoryPoint[];
  added_at: string;
}

export interface CollectionItemIdentifier {
  set_number: string;
  item_type: CollectionItemType;
  condition: CollectionCondition;
  color_id?: number | null;
}

export function inferItemType(identifier: string): CollectionItemType {
  return /^\d+$/.test(identifier) ? "set" : "minifig";
}

export function normalizeQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.max(1, Math.round(parsed));
}

export function normalizeCondition(value: unknown): CollectionCondition {
  return value === "used" ? "used" : "new_sealed";
}

export function normalizeCollectionItem(item: CollectionItem): CollectionItem {
  return {
    ...item,
    item_type: item.item_type ?? inferItemType(item.set_number),
    quantity: normalizeQuantity((item as Partial<CollectionItem>).quantity),
    condition: normalizeCondition((item as Partial<CollectionItem>).condition),
    image_url: normalizeImageUrl(item.image_url),
    year_released:
      typeof item.year_released === "number" && Number.isFinite(item.year_released) ? item.year_released : null,
    is_obsolete: typeof item.is_obsolete === "boolean" ? item.is_obsolete : null,
    color_id: typeof item.color_id === "number" && Number.isFinite(item.color_id) ? item.color_id : null,
    color_name: typeof item.color_name === "string" && item.color_name.trim() ? item.color_name.trim() : null,
    market_history: (item.market_history ?? [])
      .map((point) => ({
        ...point,
        date: normalizeHistoryDate(point.date) ?? "",
      }))
      .filter((point) => point.date && Number.isFinite(point.price_usd) && point.price_usd > 0),
  };
}

export function removeCollectionItem(
  items: CollectionItem[],
  target: CollectionItemIdentifier
): CollectionItem[] {
  return items.filter(
    (entry) =>
      entry.set_number !== target.set_number ||
      entry.item_type !== target.item_type ||
      entry.condition !== target.condition ||
      (entry.item_type === "part" && (entry.color_id ?? null) !== (target.color_id ?? null))
  );
}

export function normalizeHistoryDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
