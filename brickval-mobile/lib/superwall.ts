import Constants from "expo-constants";
import { Platform } from "react-native";
import Superwall, {
  PresentationResult,
  PresentationResultHoldout,
  PresentationResultNoAudienceMatch,
  PresentationResultPaywall,
  PresentationResultPaywallNotAvailable,
  PresentationResultPlacementNotFound,
  PresentationResultUserIsSubscribed,
  PurchaseController,
  PurchaseResult,
  PurchaseResultCancelled,
  PurchaseResultFailed,
  PurchaseResultPurchased,
  RestorationResult,
  SubscriptionStatus,
} from "expo-superwall/compat";
import { getRevenueCatProductIds, purchasePackage } from "./revenuecat";
import { capturePaywallError } from "./sentry";

const SUPERWALL_UPGRADE_PLACEMENT = "brickval_upgrade";
const extra = Constants.expoConfig?.extra ?? {};
const SUPERWALL_ANDROID_KEY = String(extra.superwallAndroidApiKey ?? "");
const SUPERWALL_IOS_KEY = String(extra.superwallIosApiKey ?? "");
const SUPERWALL_API_KEY = Platform.OS === "ios" ? SUPERWALL_IOS_KEY : SUPERWALL_ANDROID_KEY;
const isExpoGo = Constants.appOwnership === "expo";
const shouldInitNativePaywall = Constants.expoConfig?.extra?.enableNativePaywall === true;
const CONFIG_TIMEOUT_MS = 15000;
const PRESENT_TIMEOUT_MS = 15000;

let didConfigure = false;
let configurePromise: Promise<boolean> | null = null;

class BrickValPurchaseController extends PurchaseController {
  async purchaseFromAppStore(productId: string): Promise<PurchaseResult> {
    const result = await purchasePackage(productId);
    if (result.purchased) return new PurchaseResultPurchased();
    if (result.cancelled) return new PurchaseResultCancelled();
    return new PurchaseResultFailed(result.error ?? "Purchase failed");
  }

  async purchaseFromGooglePlay(productId: string): Promise<PurchaseResult> {
    const result = await purchasePackage(productId);
    if (result.purchased) return new PurchaseResultPurchased();
    if (result.cancelled) return new PurchaseResultCancelled();
    return new PurchaseResultFailed(result.error ?? "Purchase failed");
  }

  async restorePurchases(): Promise<RestorationResult> {
    try {
      const { restorePurchases: restoreRC, getProStatus } = await import("./revenuecat");
      const restored = await restoreRC();
      const isPro = await getProStatus();
      if (restored || isPro) {
        await setSubscriptionStatus(SubscriptionStatus.Active(["pro"]));
        return RestorationResult.restored();
      }
      return RestorationResult.failed(new Error("No active purchase found"));
    } catch (error: any) {
      return RestorationResult.failed(new Error(error?.message ?? "Restore failed"));
    }
  }
}

function shouldInit(): boolean {
  return !isExpoGo && shouldInitNativePaywall && Boolean(SUPERWALL_API_KEY);
}

function presentationResultMessage(result: unknown): string {
  if (result instanceof PresentationResultPaywall) return "paywall";
  if (result instanceof PresentationResultPlacementNotFound) return "placement not found";
  if (result instanceof PresentationResultNoAudienceMatch) return "no audience match";
  if (result instanceof PresentationResultUserIsSubscribed) return "user is subscribed";
  if (result instanceof PresentationResultPaywallNotAvailable) return "paywall not available";
  if (result instanceof PresentationResultHoldout) return "holdout";
  return result?.constructor?.name ?? "unknown";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | "timeout"> {
  return Promise.race([
    promise,
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), timeoutMs);
    }),
  ]);
}

export async function configureSuperwall(): Promise<boolean> {
  if (didConfigure) return true;
  if (configurePromise) return configurePromise;
  if (!shouldInit()) return false;

  configurePromise = (async () => {
    try {
      const configured = await withTimeout(
        Superwall.configure({
          apiKey: SUPERWALL_API_KEY,
          purchaseController: new BrickValPurchaseController(),
        }),
        CONFIG_TIMEOUT_MS
      );

      if (configured === "timeout") {
        configurePromise = null;
        return false;
      }

      await Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive());
      didConfigure = true;
      return true;
    } catch (error) {
      configurePromise = null;
      console.warn("Superwall SDK init failed", error);
      return false;
    }
  })();

  return configurePromise;
}

export async function syncIdentity(userId: string | null): Promise<void> {
  if (!didConfigure) return;

  try {
    if (userId) {
      await Superwall.shared.identify({ userId });
      return;
    }
    await Superwall.shared.reset();
  } catch (error) {
    console.warn("Failed to sync Superwall identity", error);
  }
}

export async function setSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
  if (!didConfigure) return;
  try {
    await Superwall.shared.setUserAttributes({ is_pro: status.status === "ACTIVE" });
    await Superwall.shared.setSubscriptionStatus(status);
  } catch (error) {
    console.warn("Failed to sync Superwall subscription status", error);
  }
}

export type PaywallPresentationResult =
  | { status: "presented" }
  | { status: "skipped"; reason: string }
  | { status: "timeout"; reason: string }
  | { status: "unavailable"; reason: string }
  | { status: "error"; reason: string };

export function getPaywallDiagnosticMessage(result: PaywallPresentationResult): string {
  switch (result.status) {
    case "presented":
      return "Paywall opened.";
    case "skipped":
      return `Paywall unavailable: ${result.reason}. Check that the Superwall campaign for ${SUPERWALL_UPGRADE_PLACEMENT} includes this free user and has a live paywall assigned.`;
    case "timeout":
      return `Superwall did not respond in time: ${result.reason}.`;
    case "unavailable":
      return `Native paywall unavailable: ${result.reason}.`;
    case "error":
      return `Superwall error: ${result.reason}.`;
  }
}

export async function presentUpgrade(): Promise<PaywallPresentationResult> {
  if (!didConfigure) {
    return { status: "unavailable", reason: "Superwall not configured" };
  }

  const revenueCatProducts = await getRevenueCatProductIds();
  if (revenueCatProducts.error || revenueCatProducts.productIds.length === 0) {
    const reason = revenueCatProducts.error
      ? `RevenueCat products unavailable: ${revenueCatProducts.error}`
      : `RevenueCat current offering has no products`;
    capturePaywallError("revenuecat_products_unavailable", new Error(reason), revenueCatProducts);
    return { status: "unavailable", reason };
  }

  const rawResult = await withTimeout(
    Superwall.shared.getPresentationResult({ placement: SUPERWALL_UPGRADE_PLACEMENT }),
    CONFIG_TIMEOUT_MS
  );
  if (rawResult === "timeout") {
    capturePaywallError("presentation_result_timeout", new Error("Presentation check timed out"));
    return { status: "timeout", reason: "presentation check timeout" };
  }

  let presentationResult: PresentationResult;
  try {
    // The compat bridge returns raw JSON from the native module, not a deserialized
    // PresentationResult instance. Convert it so instanceof checks work correctly.
    presentationResult = PresentationResult.fromJson(rawResult);
  } catch (error: any) {
    console.warn("Failed to deserialize Superwall presentation result", error?.message, rawResult);
    capturePaywallError("presentation_result_deserialize", error, {
      placement: SUPERWALL_UPGRADE_PLACEMENT,
      rawResult,
    });
    return { status: "error", reason: error?.message ?? "Failed to parse presentation result" };
  }

  if (!(presentationResult instanceof PresentationResultPaywall)) {
    const reason = presentationResultMessage(presentationResult);
    capturePaywallError("presentation_result_skipped", new Error(reason), {
      placement: SUPERWALL_UPGRADE_PLACEMENT,
      revenueCatProducts,
    });
    return { status: "skipped", reason };
  }

  try {
    const registerResult = await withTimeout(
      Superwall.shared.register({
        placement: SUPERWALL_UPGRADE_PLACEMENT,
      }),
      PRESENT_TIMEOUT_MS
    );
    if (registerResult === "timeout") {
      capturePaywallError("register_timeout", new Error("Paywall registration timed out"));
      return { status: "timeout", reason: "register timeout" };
    }
    return { status: "presented" };
  } catch (error) {
    console.warn("Superwall register failed", error);
    capturePaywallError("register_exception", error);
    return { status: "error", reason: error instanceof Error ? error.message : String(error) };
  }
}

export function isAvailable(): boolean {
  return shouldInit();
}

export async function dismissPaywall(): Promise<void> {
  if (!didConfigure) return;
  try {
    await Superwall.shared.dismiss();
  } catch (error) {
    console.warn("Failed to dismiss Superwall paywall", error);
  }
}

export { SUPERWALL_UPGRADE_PLACEMENT };
