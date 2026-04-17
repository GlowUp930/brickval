import * as SecureStore from "expo-secure-store";
import type { LookupDetailResult, MarketHistoryPoint, ScanMode } from "./api";

const COLLECTION_KEY = "brickval_collection";

export type CollectionItemType = ScanMode;
export type CollectionCondition = "new_sealed" | "used";

export interface AddToCollectionOptions {
  quantity: number;
  condition: CollectionCondition;
}

/**
 * Pick the market value that matches the user's selected condition.
 * new_sealed keeps the existing hero waterfall (BrickLink sold → eBay sold → BrickLink stock).
 * used falls back through used-specific fields only; never returns a new-condition price.
 */
export function resolveConditionPriceUsd(
  result: LookupDetailResult,
  condition: CollectionCondition
): number | null {
  if (result.item_type === "minifig") {
    const pricing = result.pricing;
    if (condition === "used") {
      return pricing.used_sold_avg_usd ?? pricing.used_stock_avg_usd ?? null;
    }
    return pricing.new_sold_avg_usd ?? pricing.new_stock_avg_usd ?? null;
  }
  const pricing = result.pricing;
  if (condition === "used") {
    return (
      pricing.bricklink_used_avg_usd ??
      pricing.ebay_used_avg_usd ??
      pricing.bricklink_stock_used_avg_usd ??
      null
    );
  }
  return pricing.hero_new_avg_usd ?? null;
}

export interface CollectionItem {
  set_number: string;
  item_type: CollectionItemType;
  name: string;
  theme: string;
  pieces: number | null;
  image_url: string | null;
  market_value_usd: number | null;
  rrp_usd: number | null;
  gain_pct: number | null;
  data_source: "sold" | "listing" | null;
  quantity: number;
  condition: CollectionCondition;
  market_history: MarketHistoryPoint[];
  added_at: string;
}

function inferItemType(identifier: string): CollectionItemType {
  return /^\d+$/.test(identifier) ? "set" : "minifig";
}

function normalizeQuantity(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.max(1, Math.round(parsed));
}

function normalizeCondition(value: unknown): CollectionCondition {
  return value === "used" ? "used" : "new_sealed";
}

function normalizeCollectionItem(item: CollectionItem): CollectionItem {
  return {
    ...item,
    item_type: item.item_type ?? inferItemType(item.set_number),
    quantity: normalizeQuantity((item as Partial<CollectionItem>).quantity),
    condition: normalizeCondition((item as Partial<CollectionItem>).condition),
    market_history: item.market_history ?? [],
  };
}

export async function getCollection(): Promise<CollectionItem[]> {
  const raw = await SecureStore.getItemAsync(COLLECTION_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCollectionItem) : [];
  } catch {
    return [];
  }
}

export async function addToCollection(
  result: LookupDetailResult,
  options: AddToCollectionOptions
): Promise<CollectionItem[]> {
  const existing = await getCollection();
  const condition = normalizeCondition(options.condition);
  const item: CollectionItem = {
    set_number: result.set_number,
    item_type: result.item_type ?? inferItemType(result.set_number),
    name: result.name,
    theme: result.theme,
    pieces: result.pieces,
    image_url: result.image_url,
    market_value_usd: resolveConditionPriceUsd(result, condition),
    rrp_usd: result.pricing.rrp_usd,
    gain_pct: result.pricing.gain_pct,
    data_source: result.pricing.data_source,
    quantity: normalizeQuantity(options.quantity),
    condition,
    market_history: result.market_history,
    added_at: new Date().toISOString(),
  };
  const next = [item, ...existing.filter((entry) => entry.set_number !== item.set_number)];
  await SecureStore.setItemAsync(COLLECTION_KEY, JSON.stringify(next));
  return next;
}

export async function clearCollection(): Promise<void> {
  await SecureStore.deleteItemAsync(COLLECTION_KEY);
}

export function getCollectionValue(items: CollectionItem[]): number {
  return items.reduce((total, item) => total + (item.market_value_usd ?? 0) * (item.quantity ?? 1), 0);
}

export function getItemTotalValue(item: CollectionItem): number {
  return (item.market_value_usd ?? 0) * (item.quantity ?? 1);
}
