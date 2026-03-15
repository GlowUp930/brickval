import { getSupabase } from "./supabase";

export interface ScanGateResult {
  allowed: boolean;
  scansUsed: number;
  isPro: boolean;
  paywallHit: boolean;
}

export async function checkAndIncrementScan(userId: string): Promise<ScanGateResult> {
  const supabase = getSupabase();

  // Ensure user row exists — increment_scan returns allowed:false if no row found
  await supabase
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  const { data, error } = await supabase.rpc("increment_scan", {
    p_user_id: userId,
    p_free_limit: 5,
  });
  if (error) throw new Error(`scan-gate rpc failed: ${error.message}`);

  const { allowed, scans_used, is_pro } = data as {
    allowed: boolean;
    scans_used: number;
    is_pro: boolean;
  };

  let paywallHit = false;
  if (!allowed) {
    const { data: user } = await supabase
      .from("users")
      .select("hit_paywall_at")
      .eq("id", userId)
      .single();
    if (!user?.hit_paywall_at) {
      await supabase
        .from("users")
        .update({ hit_paywall_at: new Date().toISOString() })
        .eq("id", userId)
        .is("hit_paywall_at", null); // guard against race
      paywallHit = true;
    }
  }

  return { allowed, scansUsed: scans_used, isPro: is_pro, paywallHit };
}
