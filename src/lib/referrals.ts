import { createHash, randomBytes } from "node:crypto";

import { supabase } from "@/lib/supabase";

export const REFERRAL_GOAL = 3;
export const REFERRAL_BONUS_BULK_SCANS = 3;

export interface ReferralStatus {
  code: string;
  qualifiedCount: number;
  goal: number;
  bonusBulkScans: number;
  bulkCreditsRemaining: number;
  rewardGranted: boolean;
}

export interface ReferralClaimResult {
  claimed: boolean;
  status:
    | "claimed"
    | "qualified"
    | "invalid"
    | "self_referral"
    | "rejected"
    | "already_claimed"
    | "installation_already_used";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

async function ensureUser(userId: string): Promise<void> {
  const { data: deleting, error: deletionError } = await supabase.from("account_deletion_requests")
    .select("user_hash").eq("user_hash", createHash("sha256").update(userId!).digest("hex"))
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (deletionError) throw deletionError;
  if (deleting) throw new Error("Account deletion is pending");
  const { error } = await supabase
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  await ensureUser(userId);

  const { data: existing, error: readError } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("referrer_user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const { error } = await supabase.from("referral_codes").insert({
      referrer_user_id: userId,
      code,
    });
    if (!error) return code;
    if (error.code !== "23505") throw error;
    const { data: winner, error: winnerError } = await supabase.from("referral_codes")
      .select("code").eq("referrer_user_id", userId).eq("active", true).maybeSingle();
    if (winnerError) throw winnerError;
    if (winner?.code) return winner.code;
  }

  throw new Error("Unable to create a referral code.");
}

export async function getReferralStatus(userId: string): Promise<ReferralStatus> {
  const code = await getOrCreateReferralCode(userId);

  const { data: attributions, error: attributionError } = await supabase
    .from("referral_attributions")
    .select("status")
    .eq("referrer_user_id", userId);
  if (attributionError) throw attributionError;

  const { data: credits, error: creditError } = await supabase
    .from("referral_credit_ledger")
    .select("amount")
    .eq("user_id", userId);
  if (creditError) throw creditError;

  const { data: rewards, error: rewardError } = await supabase.from("referral_rewards")
    .select("id").eq("referrer_user_id", userId).eq("milestone", "3_qualified");
  if (rewardError) throw rewardError;

  const qualifiedCount = attributions?.filter((row) => row.status === "qualified").length ?? 0;
  const bulkCreditsRemaining = Math.max(
    0,
    credits?.reduce((total, row) => total + Number(row.amount ?? 0), 0) ?? 0,
  );

  return {
    code,
    qualifiedCount,
    goal: REFERRAL_GOAL,
    bonusBulkScans: REFERRAL_BONUS_BULK_SCANS,
    bulkCreditsRemaining,
    rewardGranted: (rewards?.length ?? 0) > 0,
  };
}

export async function claimReferralCode(
  referredUserId: string,
  code: string,
  installationID?: string,
): Promise<ReferralClaimResult> {
  await ensureUser(referredUserId);
  const { data, error } = await supabase.rpc("claim_referral_code", {
    p_referred_user_id: referredUserId,
    p_code: code.trim().toUpperCase(),
    p_installation_hash: installationID ? hashInstallationID(installationID) : null,
  });
  if (error) throw error;

  const result = (data ?? {}) as Partial<ReferralClaimResult>;
  const statuses: ReferralClaimResult["status"][] = [
    "claimed",
    "qualified",
    "invalid",
    "self_referral",
    "rejected",
    "already_claimed",
    "installation_already_used",
  ];
  const status = statuses.includes(result.status as ReferralClaimResult["status"])
    ? result.status as ReferralClaimResult["status"]
    : "rejected";
  return {
    claimed: result.claimed === true,
    status,
  };
}

export async function qualifyReferral(
  referredUserId: string,
  reason: "onboarding_completed",
): Promise<{ qualified: boolean; rewardGranted: boolean }> {
  const { data, error } = await supabase.rpc("qualify_referral", {
    p_referred_user_id: referredUserId,
    p_reason: reason,
    p_goal: REFERRAL_GOAL,
    p_bonus_quantity: REFERRAL_BONUS_BULK_SCANS,
  });
  if (error) throw error;

  const result = (data ?? {}) as { qualified?: boolean; reward_granted?: boolean };
  return {
    qualified: result.qualified === true,
    rewardGranted: result.reward_granted === true,
  };
}

export async function completeReferralOnboarding(
  referredUserId: string,
): Promise<{ qualified: boolean; rewardGranted: boolean }> {
  return qualifyReferral(referredUserId, "onboarding_completed");
}

export async function hasReferralBulkCredit(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("referral_credit_ledger")
      .select("amount")
      .eq("user_id", userId);
    if (error) throw error;
    return (data?.reduce((total, row) => total + Number(row.amount ?? 0), 0) ?? 0) > 0;
  } catch (error) {
    console.warn("[referrals] Credit lookup failed", error);
    return false;
  }
}

export async function consumeReferralBulkCredit(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_referral_bulk_credit", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data === true;
}

function hashInstallationID(installationID: string): string {
  return createHash("sha256").update(installationID).digest("hex");
}
