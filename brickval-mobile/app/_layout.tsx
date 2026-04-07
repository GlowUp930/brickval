import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Purchases from "react-native-purchases";
import Superwall, { SuperwallDelegate } from "@superwall/react-native-superwall";

const REVENUECAT_GOOGLE_KEY = "goog_NUvLtaesNxERCcRAffebyZByADU";
const SUPERWALL_ANDROID_KEY = "pk_Op2uaWA1p5uPdvwtEWtWr";

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat first
    Purchases.configure({ apiKey: REVENUECAT_GOOGLE_KEY });

    // Initialize Superwall, using RevenueCat as the purchase controller
    Superwall.configure({
      apiKey: SUPERWALL_ANDROID_KEY,
      purchaseController: {
        async purchaseFromAppStore() {
          // Android only — handled via RevenueCat
          return { type: "cancelled" };
        },
        async purchaseFromGooglePlay(productId, basePlanId, offerId) {
          try {
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(
              (p) => p.product.identifier === productId
            );
            if (!pkg) return { type: "cancelled" };
            const result = await Purchases.purchasePackage(pkg);
            if (result.customerInfo.entitlements.active["pro"]) {
              return { type: "purchased" };
            }
            return { type: "cancelled" };
          } catch (e: any) {
            if (e.userCancelled) return { type: "cancelled" };
            return { type: "failed", message: e.message ?? "Purchase failed" };
          }
        },
        async restorePurchases() {
          const info = await Purchases.restorePurchases();
          return info.entitlements.active["pro"]
            ? { type: "restored" }
            : { type: "failed", message: "No active subscription found" };
        },
      },
    });

    // Keep Superwall subscription status in sync with RevenueCat
    Purchases.addCustomerInfoUpdateListener((info) => {
      const isPro = !!info.entitlements.active["pro"];
      Superwall.setUserAttributeWithKey("is_pro", isPro);
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
