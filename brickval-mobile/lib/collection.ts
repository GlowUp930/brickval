import * as SecureStore from "expo-secure-store";
import {
  CollectionCondition,
  CollectionItem,
  CollectionItemIdentifier,
  normalizeCollectionItem,
  normalizeCondition,
  normalizeQuantity,
  removeCollectionItem,
  upsertCollectionItem,
} from "./collection-core";
import { normalizeImageUrl } from "./image-url";
import {
  getConditionMarketHistory,
  getConditionMarketValueUsd,
  type LookupDetailResult,
} from "./api";

const COLLECTION_KEY = "brickval_collection";
let fallbackCollection: CollectionItem[] = [];

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
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(COLLECTION_KEY);
  } catch (error) {
    console.warn("Collection storage unavailable; using session collection.", error);
    return fallbackCollection;
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    fallbackCollection = Array.isArray(parsed) ? parsed.map(normalizeCollectionItem) : [];
    return fallbackCollection;
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
  const next = upsertCollectionItem(existing, item);
  fallbackCollection = next;
  try {
    await SecureStore.setItemAsync(COLLECTION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Collection storage could not be saved; keeping session collection.", error);
  }
  return next;
}

export async function removeFromCollection(target: CollectionItemIdentifier): Promise<CollectionItem[]> {
  const existing = await getCollection();
  const next = removeCollectionItem(existing, target);
  fallbackCollection = next;
  if (next.length === 0) {
    try {
      await SecureStore.deleteItemAsync(COLLECTION_KEY);
    } catch (error) {
      console.warn("Collection storage could not be cleared; keeping session collection.", error);
    }
    return next;
  }
  try {
    await SecureStore.setItemAsync(COLLECTION_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Collection storage could not be saved; keeping session collection.", error);
  }
  return next;
}

export async function clearCollection(): Promise<void> {
  fallbackCollection = [];
  try {
    await SecureStore.deleteItemAsync(COLLECTION_KEY);
  } catch (error) {
    console.warn("Collection storage could not be cleared; keeping session collection.", error);
  }
}

export function getCollectionValue(items: CollectionItem[]): number {
  return items.reduce((total, item) => total + (item.market_value_usd ?? 0) * (item.quantity ?? 1), 0);
}

export function getItemTotalValue(item: CollectionItem): number {
  return (item.market_value_usd ?? 0) * (item.quantity ?? 1);
}
