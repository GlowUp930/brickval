import { getMonetizationPolicy, type MonetizationPolicy } from "./monetization-policy";
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
  const { error } = await supabase
    .from("users")
    .upsert({ id: userId, is_pro: isPro }, { onConflict: "id" });
  if (error) throw error;
}

export async function reconcileDeniedProStatus(
  userId: string,
  status: MonetizationStatus,
  verify: ProEntitlementVerifier = fetchRevenueCatProEntitlement,
  persist: ProStatusPersister = persistProStatus
): Promise<MonetizationStatus> {
  if (status.usage.isPro) return status;

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

export async function getMonetizationStatus(
  userId: string | null,
  now = new Date()
): Promise<MonetizationStatus> {
  const policy = getMonetizationPolicy();
  if (!userId) return { policy, usage: emptyUsage(policy, false, now) };

  try {
    const { data: user } = await supabase
      .from("users")
      .select("is_pro")
      .eq("id", userId)
      .maybeSingle();
    const isPro = Boolean(user?.is_pro);
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
        bulkScan: counter(bulkUsed, policy.limits.introductoryBulkScans, null),
      },
    };
  } catch (error) {
    console.warn("[scan-gate] Usage lookup failed; failing open.", error);
    return { policy, usage: emptyUsage(policy, false, now) };
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
  let allowed = !enabled || status.usage.isPro || usage.remaining > 0;
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

    const repairedStatus = await reconcileDeniedProStatus(userId, status);
    return {
      allowed: repairedStatus.usage.isPro,
      usage: repairedStatus.usage,
    };
  } catch (error) {
    console.warn("[scan-gate] Usage consume failed; failing open.", error);
    const status = await getMonetizationStatus(userId, now);
    return { allowed: true, usage: status.usage };
  }
}
