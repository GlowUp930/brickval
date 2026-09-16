import type { MinifigLookupPayload } from "./minifig-lookup";
import { buildMinifigLookupPayload, identityOnlyMinifigLookupPayload, minifigLookupPayloadFromMarketData } from "./minifig-lookup";
import { isBrickLinkTemporaryError, type MinifigMarketData } from "./bricklink";
import { resolveMarketSnapshot, type ResolvedMarketSnapshot } from "./market-snapshot-store";
import { supabase } from "./supabase";

const ITEM_TYPE = "minifig";
const REFRESH_LOCK_MS = 2 * 60 * 1000;
const LEGACY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function inferredLegacyUpdatedAt(expiresAt: string): string | null {
  const expiry = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiry)) return null;
  return new Date(expiry - LEGACY_CACHE_TTL_MS).toISOString();
}

export async function resolveMinifigMarketSnapshot(
  figNumber: string,
  schedule: (task: () => Promise<void>) => void
): Promise<ResolvedMarketSnapshot<MinifigLookupPayload>> {
  try {
    const snapshot = await resolveMarketSnapshot(figNumber, {
      now: () => new Date(),
      read: async (itemId) => {
        const { data, error } = await supabase
          .from("market_snapshots")
          .select("payload, updated_at")
          .eq("item_type", ITEM_TYPE)
          .eq("item_id", itemId)
          .maybeSingle();
        if (!error && data) {
          return {
            payload: data.payload as MinifigLookupPayload,
            updatedAt: String(data.updated_at),
          };
        }

        // Builds before the snapshot table was introduced saved raw BrickLink
        // responses in api_cache. Rehydrate those rows so a maintenance
        // outage can still use a known-good price for the emergency window.
        const legacyKeys = [
          `bricklink-minifig:${itemId}`,
          `lookup:v2:minifig:${itemId}`,
        ];
        for (const key of legacyKeys) {
          const { data: legacy } = await supabase
            .from("api_cache")
            .select("data, expires_at")
            .eq("cache_key", key)
            .maybeSingle();
          if (!legacy) continue;
          const updatedAt = inferredLegacyUpdatedAt(String(legacy.expires_at));
          if (!updatedAt) continue;
          const raw = legacy.data as (MinifigMarketData & Partial<MinifigLookupPayload>) | null;
          if (!raw || typeof raw !== "object") continue;
          const payload = "figInfo" in raw && "pricing" in raw
            ? raw as MinifigLookupPayload
            : minifigLookupPayloadFromMarketData(itemId, raw as MinifigMarketData);
          if (payload) {
            // Promote the legacy row while it is still available. Future
            // requests can then use the snapshot's precise update timestamp
            // even if cache TTL cleanup removes the old api_cache entry.
            await supabase.from("market_snapshots").upsert({
              item_type: ITEM_TYPE,
              item_id: itemId,
              payload,
              updated_at: updatedAt,
              refreshing_until: null,
            });
            return { payload, updatedAt };
          }
        }
        return null;
      },
      fetchLive: async (itemId) => {
        const payload = await buildMinifigLookupPayload(itemId);
        if (!payload) throw new Error("Minifigure market data not found");
        return payload;
      },
      write: async (itemId, storedSnapshot) => {
        const { error } = await supabase.from("market_snapshots").upsert({
          item_type: ITEM_TYPE,
          item_id: itemId,
          payload: storedSnapshot.payload,
          updated_at: storedSnapshot.updatedAt,
          refreshing_until: null,
        });
        if (error) throw error;
      },
      refreshInBackground: (task) => {
        schedule(async () => {
          const now = new Date();
          const refreshingUntil = new Date(now.getTime() + REFRESH_LOCK_MS).toISOString();
          const { data: claimed } = await supabase.rpc("claim_market_snapshot_refresh", {
            p_item_type: ITEM_TYPE,
            p_item_id: figNumber,
            p_now: now.toISOString(),
            p_refreshing_until: refreshingUntil,
          });
          if (claimed !== true) return;
          try {
            await task();
          } catch (error) {
            console.warn("[market-snapshot] background refresh unavailable", error instanceof Error ? error.name : "unknown");
          } finally {
            await supabase
              .from("market_snapshots")
              .update({ refreshing_until: null })
              .eq("item_type", ITEM_TYPE)
              .eq("item_id", figNumber);
          }
        });
      },
    });
    const availability = snapshot.pricingStatus === "refreshing" ? "stale" : "available";
    const resolution = snapshot.pricingStatus === "fresh"
      ? "fresh_cache"
      : snapshot.pricingStatus === "refreshing"
        ? "stale_cache"
        : "live";
    return {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        pricing_availability: availability,
        pricing_updated_at: snapshot.pricingUpdatedAt,
        pricing_resolution: resolution,
      },
    };
  } catch (error) {
    if (!isBrickLinkTemporaryError(error)) throw error;
    return {
      payload: identityOnlyMinifigLookupPayload(figNumber),
      updatedAt: new Date().toISOString(),
      pricingStatus: "unavailable",
      pricingUpdatedAt: undefined,
    };
  }
}
