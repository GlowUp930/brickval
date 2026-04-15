import Constants from "expo-constants";

const SUPERWALL_UPGRADE_PLACEMENT = "brickval_upgrade";
const REVENUECAT_GOOGLE_KEY = "goog_NUvLtaesNxERCcRAffebyZByADU";
const SUPERWALL_ANDROID_KEY = "pk_Op2uaWA1p5uPdvwtEWtWr";
const isExpoGo = Constants.appOwnership === "expo";
const shouldInitNativePaywall = Constants.expoConfig?.extra?.enableNativePaywall === true;
let didInitializeNativePaywall = false;

function loadSuperwallSdk() {
  if (isExpoGo || !shouldInitNativePaywall) return null;

  try {
    const sdk = require("@superwall/react-native-superwall");
    return {
      Superwall: sdk.default,
      PaywallPresentationHandler: sdk.PaywallPresentationHandler,
    };
  } catch (error) {
    console.warn("Superwall SDK unavailable", error);
    return null;
  }
}

function loadPurchasesSdk() {
  if (isExpoGo || !shouldInitNativePaywall) return null;

  try {
    return require("react-native-purchases").default;
  } catch (error) {
    console.warn("RevenueCat SDK unavailable", error);
    return null;
  }
}

export function initializeNativePaywall(): void {
  if (didInitializeNativePaywall) return;

  const Purchases = loadPurchasesSdk();
  const sdk = loadSuperwallSdk();
  if (!Purchases?.configure || !sdk?.Superwall?.configure) return;

  try {
    Purchases.configure({ apiKey: REVENUECAT_GOOGLE_KEY });

    sdk.Superwall.configure({
      apiKey: SUPERWALL_ANDROID_KEY,
      purchaseController: {
        async purchaseFromAppStore() {
          return { type: "cancelled" };
        },
        async purchaseFromGooglePlay(productId: string) {
          try {
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(
              (item: any) => item.product.identifier === productId
            );
            if (!pkg) return { type: "cancelled" };
            const result = await Purchases.purchasePackage(pkg);
            const isPro = !!result.customerInfo.entitlements.active["pro"];
            await syncSuperwallSubscriptionState(isPro);
            return isPro ? { type: "purchased" } : { type: "cancelled" };
          } catch (error: any) {
            if (error?.userCancelled) return { type: "cancelled" };
            return { type: "failed", message: error?.message ?? "Purchase failed" };
          }
        },
        async restorePurchases() {
          try {
            const info = await Purchases.restorePurchases();
            const isPro = !!info.entitlements.active["pro"];
            await syncSuperwallSubscriptionState(isPro);
            return isPro
              ? { type: "restored" }
              : { type: "failed", message: "No active purchase found" };
          } catch (error: any) {
            return { type: "failed", message: error?.message ?? "Restore failed" };
          }
        },
      },
    });

    Purchases.addCustomerInfoUpdateListener?.((info: any) => {
      const isPro = !!info.entitlements.active["pro"];
      void syncSuperwallSubscriptionState(isPro);
    });

    didInitializeNativePaywall = true;
  } catch (error) {
    console.warn("Paywall SDK init skipped", error);
  }
}

export async function syncSuperwallIdentity(userId: string | null): Promise<void> {
  initializeNativePaywall();
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.identify) return;

  try {
    if (userId) {
      await sdk.Superwall.identify({ userId });
      return;
    }

    if (sdk.Superwall.reset) {
      await sdk.Superwall.reset();
    }
  } catch (error) {
    console.warn("Failed to sync Superwall identity", error);
  }
}

export async function syncSuperwallSubscriptionState(isPro: boolean): Promise<void> {
  initializeNativePaywall();
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.setUserAttributes) return;

  try {
    await sdk.Superwall.setUserAttributes({ is_pro: isPro });
  } catch (error) {
    console.warn("Failed to sync Superwall user attributes", error);
  }
}

export async function syncPurchaseIdentity(userId: string | null): Promise<void> {
  initializeNativePaywall();
  const Purchases = loadPurchasesSdk();
  if (!Purchases?.logIn) return;

  try {
    if (userId) {
      await Purchases.logIn(userId);
      return;
    }

    if (Purchases.logOut) {
      await Purchases.logOut();
    }
  } catch (error) {
    console.warn("Failed to sync RevenueCat identity", error);
  }
}

export async function getNativeProStatus(): Promise<boolean | null> {
  initializeNativePaywall();
  const Purchases = loadPurchasesSdk();
  if (!Purchases?.getCustomerInfo) return null;

  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active["pro"];
  } catch (error) {
    console.warn("Failed to read RevenueCat status", error);
    return null;
  }
}

export async function restoreNativePurchases(): Promise<boolean | null> {
  initializeNativePaywall();
  const Purchases = loadPurchasesSdk();
  if (!Purchases?.restorePurchases) return null;

  try {
    const info = await Purchases.restorePurchases();
    const isPro = !!info.entitlements.active["pro"];
    await syncSuperwallSubscriptionState(isPro);
    return isPro;
  } catch (error) {
    console.warn("Restore purchases failed", error);
    return null;
  }
}

export async function presentSuperwallUpgrade(): Promise<boolean> {
  initializeNativePaywall();
  const sdk = loadSuperwallSdk();
  if (!sdk?.Superwall?.register || !sdk?.PaywallPresentationHandler) return false;

  const handler = new sdk.PaywallPresentationHandler();
  handler.onSkip((reason: { name?: string }) => {
    console.warn("Superwall skipped", reason?.name ?? "unknown");
  });
  handler.onError((error: unknown) => {
    console.warn("Superwall error", error);
  });

  try {
    await sdk.Superwall.register({
      placement: SUPERWALL_UPGRADE_PLACEMENT,
      handler,
    });
    return true;
  } catch (error) {
    console.warn("Superwall register failed", error);
    return false;
  }
}
