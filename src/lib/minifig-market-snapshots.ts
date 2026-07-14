import type { MinifigLookupPayload } from "./minifig-lookup";
import { buildMinifigLookupPayload } from "./minifig-lookup";
import { resolveMarketSnapshot, type ResolvedMarketSnapshot } from "./market-snapshot-store";
import { supabase } from "./supabase";

const ITEM_TYPE = "minifig";
const REFRESH_LOCK_MS = 2 * 60 * 1000;

export async function resolveMinifigMarketSnapshot(
  figNumber: string,
  schedule: (task: () => Promise<void>) => void
): Promise<ResolvedMarketSnapshot<MinifigLookupPayload>> {
  return resolveMarketSnapshot(figNumber, {
    now: () => new Date(),
    read: async (itemId) => {
      const { data, error } = await supabase
        .from("market_snapshots")
        .select("payload, updated_at")
        .eq("item_type", ITEM_TYPE)
        .eq("item_id", itemId)
        .maybeSingle();
      if (error || !data) return null;
      return {
        payload: data.payload as MinifigLookupPayload,
        updatedAt: String(data.updated_at),
      };
    },
    fetchLive: async (itemId) => {
      const payload = await buildMinifigLookupPayload(itemId);
      if (!payload) throw new Error("Minifigure market data not found");
      return payload;
    },
    write: async (itemId, snapshot) => {
      const { error } = await supabase.from("market_snapshots").upsert({
        item_type: ITEM_TYPE,
        item_id: itemId,
        payload: snapshot.payload,
        updated_at: snapshot.updatedAt,
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
}
