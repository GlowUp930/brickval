import * as SecureStore from "expo-secure-store";
import {
  CollectionCondition,
  CollectionItem,
  CollectionItemIdentifier,
  normalizeCollectionItem,
  normalizeCondition,
  normalizeQuantity,
  removeCollectionItem,
} from "./collection-core";
import { normalizeImageUrl } from "./image-url";
import {
  getConditionMarketHistory,
  getConditionMarketValueUsd,
  type LookupDetailResult,
} from "./api";

const COLLECTION_KEY = "brickval_collection";

export type {
  CollectionCondition,
  CollectionItem,
  CollectionItemIdentifier,
  CollectionItemType,
} from "./collection-core";

export interface AddToCollectionOptions {
  quantity: number;
  condition: CollectionCondition;
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
    item_type: result.item_type,
    name: result.name,
    theme: result.theme,
    pieces: result.pieces,
    year_released:
      result.item_type === "set"
        ? result.set_info.year_released
        : result.item_type === "minifig"
          ? result.fig_info.year_released
          : result.part_info.year_released,
    is_obsolete: result.item_type === "set" ? result.set_info.is_obsolete : null,
    image_url: normalizeImageUrl(result.image_url),
    market_value_usd: getConditionMarketValueUsd(result, condition),
    rrp_usd: result.pricing.rrp_usd,
    gain_pct: result.pricing.gain_pct,
    data_source: result.pricing.data_source,
    quantity: normalizeQuantity(options.quantity),
    condition,
    color_id: result.item_type === "part" ? result.part_info.color_id : null,
    color_name: result.item_type === "part" ? result.part_info.color_name : null,
    market_history: getConditionMarketHistory(result, condition),
    added_at: new Date().toISOString(),
  };
  const next = [
    item,
    ...existing.filter(
      (entry) =>
        entry.set_number !== item.set_number ||
        entry.item_type !== item.item_type ||
        entry.condition !== item.condition ||
        (entry.item_type === "part" && (entry.color_id ?? null) !== (item.color_id ?? null))
    ),
  ];
  await SecureStore.setItemAsync(COLLECTION_KEY, JSON.stringify(next));
  return next;
}

export async function removeFromCollection(target: CollectionItemIdentifier): Promise<CollectionItem[]> {
  const existing = await getCollection();
  const next = removeCollectionItem(existing, target);
  if (next.length === 0) {
    await SecureStore.deleteItemAsync(COLLECTION_KEY);
    return next;
  }
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
