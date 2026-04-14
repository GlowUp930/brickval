import { supabase } from "./supabase";

export interface ScanGateResult {
  allowed: boolean;
  scansUsed: number;
  isPro: boolean;
  paywallHit: boolean;
}

const FREE_SCAN_LIMIT = 5;

/**
 * Atomically check and increment the scan counter for a user.
 * Pro users (lifetime buyers) always get allowed: true.
 * Free users get 5 scans, then paywalled.
 * Fails open if Supabase is unavailable — scans are allowed.
 */
export async function checkAndIncrementScan(
  userId: string
): Promise<ScanGateResult> {
  try {
    const { error: upsertError } = await supabase
      .from("users")
      .upsert({ id: userId }, { onConflict: "id" });

    if (upsertError) {
      console.warn("[scan-gate] Failed to create user row:", upsertError);
    }

    const { data, error } = await supabase.rpc("increment_scan", {
      p_user_id: userId,
      p_free_limit: FREE_SCAN_LIMIT,
    });

    if (error || !data) {
      console.warn("[scan-gate] RPC failed, failing open:", error);
      return { allowed: true, scansUsed: 0, isPro: false, paywallHit: false };
    }

    const allowed = Boolean(data.allowed);
    const scansUsed = Number(data.scans_used ?? 0);
    const isPro = Boolean(data.is_pro);

    return { allowed, scansUsed, isPro, paywallHit: !allowed };
  } catch {
    // Supabase unreachable — fail open so users aren't blocked
    return { allowed: true, scansUsed: 0, isPro: false, paywallHit: false };
  }
}
