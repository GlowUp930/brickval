import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";

const extra = Constants.expoConfig?.extra ?? {};
const REVENUECAT_ANDROID_KEY = String(extra.revenueCatAndroidApiKey ?? "");
const REVENUECAT_IOS_KEY = String(extra.revenueCatIosApiKey ?? "");
const REVENUECAT_API_KEY = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
const isExpoGo = Constants.appOwnership === "expo";
const shouldInitNativePaywall = Constants.expoConfig?.extra?.enableNativePaywall === true;

let didConfigure = false;

function shouldInit(): boolean {
  return !isExpoGo && shouldInitNativePaywall && Boolean(REVENUECAT_API_KEY);
}

export async function configureRevenueCat(): Promise<void> {
  if (didConfigure || !shouldInit()) return;

  const alreadyConfigured =
    typeof Purchases.isConfigured === "function" ? await Purchases.isConfigured() : false;
  if (!alreadyConfigured) {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  }
  didConfigure = true;
}

export function onCustomerInfoChange(callback: (isPro: boolean) => void): void {
  if (!shouldInit()) return;
  Purchases.addCustomerInfoUpdateListener?.((info: any) => {
    callback(!!info.entitlements.active["pro"]);
  });
}

export async function syncPurchaseIdentity(userId: string | null): Promise<void> {
  if (!Purchases?.logIn) return;

  try {
    if (userId) {
      await Purchases.logIn(userId);
      return;
    }

    if (Purchases.logOut) {
      const currentAppUserId =
        typeof Purchases.getAppUserID === "function" ? await Purchases.getAppUserID() : null;
      if (typeof currentAppUserId === "string" && currentAppUserId.startsWith("$RCAnonymousID:")) {
        return;
      }
      await Purchases.logOut();
    }
  } catch (error) {
    console.warn("Failed to sync RevenueCat identity", error);
  }
}

export async function getProStatus(): Promise<boolean | null> {
  if (!Purchases?.getCustomerInfo) return null;

  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active["pro"];
  } catch (error) {
    console.warn("Failed to read RevenueCat status", error);
    return null;
  }
}

export async function restorePurchases(): Promise<boolean | null> {
  if (!Purchases?.restorePurchases) return null;

  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active["pro"];
  } catch (error) {
    console.warn("Restore purchases failed", error);
    return null;
  }
}

export async function getRevenueCatProductIds(): Promise<{
  currentOfferingId: string | null;
  productIds: string[];
  error?: string;
}> {
  if (!Purchases?.getOfferings) {
    return { currentOfferingId: null, productIds: [], error: "RevenueCat unavailable" };
  }

  try {
    const offerings = await Purchases.getOfferings();
    return {
      currentOfferingId: offerings.current?.identifier ?? null,
      productIds: offerings.current?.availablePackages.map(
        (item: any) => item.product.identifier
      ) ?? [],
    };
  } catch (error: any) {
    return {
      currentOfferingId: null,
      productIds: [],
      error: error?.message ?? "Could not load RevenueCat offerings",
    };
  }
}

export async function purchasePackage(productId: string): Promise<{
  purchased: boolean;
  cancelled: boolean;
  error?: string;
}> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (item: any) => item.product.identifier === productId
    );
    if (!pkg) {
      const availableProductIds =
        offerings.current?.availablePackages.map((item: any) => item.product.identifier).join(", ") || "none";
      const message = `RevenueCat product not found: ${productId}. Current offering has: ${availableProductIds}`;
      console.warn(message);
      return { purchased: false, cancelled: false, error: message };
    }
    const result = await Purchases.purchasePackage(pkg);
    const isPro = !!result.customerInfo.entitlements.active["pro"];
    return { purchased: isPro, cancelled: !isPro };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { purchased: false, cancelled: true };
    }
    return { purchased: false, cancelled: false, error: error?.message ?? "Purchase failed" };
  }
}
