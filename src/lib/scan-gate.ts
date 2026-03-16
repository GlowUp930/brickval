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
    const { data, error } = await supabase.rpc("increment_scan", {
      p_user_id: userId,
      p_free_limit: FREE_SCAN_LIMIT,
    });

    if (error || !data) {
      console.warn("[scan-gate] RPC failed, failing open:", error);
      return { allowed: true, scansUsed: 0, isPro: false, paywallHit: false };
    }

    const allowed: boolean = data.allowed ?? false;
    const scansUsed: number = data.scans_used ?? 0;
    const isPro: boolean = data.is_pro ?? false;

    return { allowed, scansUsed, isPro, paywallHit: !allowed };
  } catch {
    // Supabase unreachable — fail open so users aren't blocked
    return { allowed: true, scansUsed: 0, isPro: false, paywallHit: false };
  }
}
