import { createHash } from "node:crypto";

import { getMonetizationPolicy, type MonetizationPolicy } from "./monetization-policy";
import { consumeReferralBulkCredit, hasReferralBulkCredit } from "./referrals";
import { fetchRevenueCatProEntitlement } from "./revenuecat-entitlement";
import { supabase } from "./supabase";

export type MeteredFeature = "single_scan" | "bulk_scan";

export interface UsageCounter {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string | null;
}

export interface UsageSnapshot {
  isPro: boolean;
  singleScan: UsageCounter;
  bulkScan: UsageCounter;
}

export interface MonetizationStatus {
  policy: MonetizationPolicy;
  usage: UsageSnapshot;
}

export interface UsageGateResult {
  allowed: boolean;
  usage: UsageSnapshot;
}

export type ProEntitlementVerifier = (userId: string) => Promise<boolean | null>;
export type ProStatusPersister = (userId: string, isPro: boolean) => Promise<void>;

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcDay(now: Date): string {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  )).toISOString();
}

function emptyUsage(policy: MonetizationPolicy, isPro = false, now = new Date()): UsageSnapshot {
  return {
    isPro,
    singleScan: {
      used: 0,
      limit: policy.limits.singleScansPerDay,
      remaining: policy.limits.singleScansPerDay,
      resetsAt: nextUtcDay(now),
    },
    bulkScan: {
      used: 0,
      limit: policy.limits.introductoryBulkScans,
      remaining: policy.limits.introductoryBulkScans,
      resetsAt: null,
    },
  };
}

function counter(
  used: number,
  limit: number,
  resetsAt: string | null
): UsageCounter {
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt,
  };
}

function markStatusAsPro(status: MonetizationStatus): MonetizationStatus {
  return {
    ...status,
    usage: {
      ...status.usage,
      isPro: true,
    },
  };
}

async function persistProStatus(userId: string, isPro: boolean): Promise<void> {
  const { error } = await supabase.rpc("apply_subscription_entitlement", {
    p_user_id: userId, p_provider: "revenuecat", p_active: isPro,
    p_version_ms: Date.now(), p_event_id: `reconcile:${crypto.randomUUID()}`,
  });
  if (error) throw error;
}

export async function reconcileDeniedProStatus(
  userId: string,
  status: MonetizationStatus,
  verify: ProEntitlementVerifier = fetchRevenueCatProEntitlement,
  persist: ProStatusPersister = persistProStatus
): Promise<MonetizationStatus> {
  if (status.usage.isPro || userId.startsWith("guest:")) return status;

  try {
    const isPro = await verify(userId);
    if (isPro !== true) return status;
    await persist(userId, true);
    return markStatusAsPro(status);
  } catch (error) {
    console.warn("[scan-gate] Pro entitlement reconciliation failed", error);
    return status;
  }
}

export async function refreshProEntitlement(
  userId: string,
  now = new Date()
): Promise<boolean | null> {
  const isPro = await fetchRevenueCatProEntitlement(userId, fetch, now);
  if (isPro === null) return null;
  await persistProStatus(userId, isPro);
  return isPro;
}

export async function grandfatherBulkIntroductoryCredit(
  userId: string,
  installationID: string,
): Promise<boolean> {
  const installationHash = createHash("sha256").update(installationID).digest("hex");
  const { data, error } = await supabase.rpc("claim_bulk_intro_grandfathering", {
    p_user_id: userId,
    p_installation_hash: installationHash,
  });
  if (error) throw error;
  return data === true;
}

export async function getMonetizationStatus(
  userId: string | null,
  now = new Date()
): Promise<MonetizationStatus> {
  const policy = getMonetizationPolicy();
  if (!userId) return { policy, usage: emptyUsage(policy, false, now) };

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("is_pro, bulk_intro_grandfathered")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw userError;
    const isPro = Boolean(user?.is_pro);
    const bulkLimit = user?.bulk_intro_grandfathered
      ? policy.limits.introductoryBulkScans
      : 0;
    const day = utcDay(now);
    const { data: rows, error } = await supabase
      .from("user_feature_usage")
      .select("feature, period_key, uses")
      .eq("user_id", userId)
      .in("feature", ["single_scan", "bulk_scan"]);
    if (error) throw error;

    const singleUsed = Number(rows?.find(
      (row) => row.feature === "single_scan" && row.period_key === day
    )?.uses ?? 0);
    const bulkUsed = Number(rows?.find(
      (row) => row.feature === "bulk_scan" && row.period_key === "lifetime"
    )?.uses ?? 0);

    return {
      policy,
      usage: {
        isPro,
        singleScan: counter(singleUsed, policy.limits.singleScansPerDay, nextUtcDay(now)),
        bulkScan: counter(bulkUsed, bulkLimit, null),
      },
    };
  } catch (error) {
    console.warn("[scan-gate] Usage lookup unavailable");
    throw error;
  }
}

export async function checkFeatureAccess(
  userId: string,
  feature: MeteredFeature,
  now = new Date()
): Promise<UsageGateResult> {
  const status = await getMonetizationStatus(userId, now);
  const enabled = feature === "single_scan"
    ? status.policy.gates.singleDaily
    : status.policy.gates.bulkRepeat;
  const usage = feature === "single_scan" ? status.usage.singleScan : status.usage.bulkScan;
  let resolvedStatus = status;
  const hasReferralCredit = feature === "bulk_scan" && await hasReferralBulkCredit(userId);
  let allowed = !enabled || status.usage.isPro || usage.remaining > 0 || hasReferralCredit;
  if (!allowed) {
    resolvedStatus = await reconcileDeniedProStatus(userId, status);
    allowed = resolvedStatus.usage.isPro;
  }
  return { allowed, usage: resolvedStatus.usage };
}

export async function consumeFeatureUsage(
  userId: string,
  feature: MeteredFeature,
  now = new Date()
): Promise<UsageGateResult> {
  const policy = getMonetizationPolicy();
  const enabled = feature === "single_scan"
    ? policy.gates.singleDaily
    : policy.gates.bulkRepeat;
  if (!enabled) {
    const status = await getMonetizationStatus(userId, now);
    return { allowed: true, usage: status.usage };
  }

  const limit = feature === "single_scan"
    ? policy.limits.singleScansPerDay
    : policy.limits.introductoryBulkScans;
  const periodKey = feature === "single_scan" ? utcDay(now) : "lifetime";

  try {
    const { error: upsertError } = await supabase
      .from("users")
      .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
    if (upsertError) throw upsertError;

    const { data, error } = await supabase.rpc("consume_feature_usage", {
      p_user_id: userId,
      p_feature: feature,
      p_period_key: periodKey,
      p_free_limit: limit,
    });
    if (error || !data) throw error ?? new Error("Usage RPC returned no data");

    const status = await getMonetizationStatus(userId, now);
    if (Boolean(data.allowed)) return { allowed: true, usage: status.usage };

    const verified = userId.startsWith("guest:") ? false : await fetchRevenueCatProEntitlement(userId);
    if (verified === null) throw new Error("Paid access could not be verified; credits preserved");
    const repairedStatus = await reconcileDeniedProStatus(userId, status, async () => verified);
    if (repairedStatus.usage.isPro) return { allowed: true, usage: repairedStatus.usage };

    // Consume the grandfathered introductory allowance first. Referral credits
    // are the fallback once the server confirms that allowance is exhausted.
    if (feature === "bulk_scan" && await consumeReferralBulkCredit(userId)) {
      const updatedStatus = await getMonetizationStatus(userId, now);
      return { allowed: true, usage: updatedStatus.usage };
    }

    return { allowed: false, usage: repairedStatus.usage };
  } catch (error) {
    console.warn("[scan-gate] Usage authorization unavailable");
    throw error;
  }
}

/** Idempotent across region requests, retries, and lost responses. */
export async function authorizeBulkScan(
  userId: string, sessionToken: string, expiresAt: number,
): Promise<UsageGateResult> {
  const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
  const { data: decision, error: decisionError } = await supabase.from("bulk_scan_authorizations")
    .select("allowed,user_id,expires_at").eq("session_hash", sessionHash).maybeSingle();
  if (decisionError) throw decisionError;
  const status = await getMonetizationStatus(userId);
  if (decision) return {
    allowed: decision.user_id === userId && Date.parse(decision.expires_at) > Date.now() && decision.allowed === true,
    usage: status.usage,
  };
  if (!status.usage.isPro && !userId.startsWith("guest:")) {
    const verified = await fetchRevenueCatProEntitlement(userId);
    if (verified === null && await hasReferralBulkCredit(userId)) {
      throw new Error("Paid access could not be verified; credits preserved");
    }
    if (verified === true) await persistProStatus(userId, true);
  }
  const { data, error } = await supabase.rpc("authorize_bulk_scan", {
    p_user_id: userId,
    p_session_hash: sessionHash,
    p_free_limit: status.policy.gates.bulkRepeat ? status.policy.limits.introductoryBulkScans : 2147483647,
    p_expires_at: new Date(expiresAt * 1000).toISOString(),
  });
  if (error || typeof data !== "boolean") throw error ?? new Error("Invalid authorization response");
  const updated = await getMonetizationStatus(userId);
  return { allowed: data, usage: updated.usage };
}
