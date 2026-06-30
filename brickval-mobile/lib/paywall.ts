import {
  configureRevenueCat,
  getProStatus,
  restorePurchases,
  syncPurchaseIdentity,
  onCustomerInfoChange,
} from "./revenuecat";
import {
  configureSuperwall,
  syncIdentity as syncSuperwallIdentityRaw,
  setSubscriptionStatus,
  presentUpgrade,
  isAvailable,
  type PaywallPresentationResult,
  getPaywallDiagnosticMessage,
} from "./superwall";
import { SubscriptionStatus } from "expo-superwall/compat";

let didInitialize = false;
let initPromise: Promise<void> | null = null;

export { type PaywallPresentationResult, getPaywallDiagnosticMessage };

export function initializeNativePaywall(): void {
  void ensureInitialized();
}

async function ensureInitialized(): Promise<void> {
  if (didInitialize) return;
  if (initPromise) return initPromise;
  if (!isAvailable()) return;

  initPromise = (async () => {
    await configureRevenueCat();
    const swConfigured = await configureSuperwall();
    if (!swConfigured) return;

    onCustomerInfoChange((isPro) => {
      void setSubscriptionStatus(
        isPro ? SubscriptionStatus.Active(["pro"]) : SubscriptionStatus.Inactive()
      );
    });

    didInitialize = true;
  })();

  return initPromise;
}

export async function syncSuperwallIdentity(userId: string | null): Promise<void> {
  await ensureInitialized();
  await syncSuperwallIdentityRaw(userId);
}

export async function syncSuperwallSubscriptionState(isPro: boolean): Promise<void> {
  await ensureInitialized();
  await setSubscriptionStatus(
    isPro ? SubscriptionStatus.Active(["pro"]) : SubscriptionStatus.Inactive()
  );
}

export { syncPurchaseIdentity };

export async function getNativeProStatus(): Promise<boolean | null> {
  await ensureInitialized();
  return getProStatus();
}

export async function restoreNativePurchases(): Promise<boolean | null> {
  await ensureInitialized();
  const restored = await restorePurchases();
  if (restored) {
    await setSubscriptionStatus(SubscriptionStatus.Active(["pro"]));
  }
  return restored;
}

export async function presentSuperwallUpgrade(): Promise<boolean> {
  await ensureInitialized();
  const result = await presentUpgrade();
  return result.status === "presented";
}

export async function presentSuperwallUpgradeWithResult(): Promise<PaywallPresentationResult> {
  await ensureInitialized();
  return presentUpgrade();
}
