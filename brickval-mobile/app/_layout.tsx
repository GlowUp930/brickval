import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";

const REVENUECAT_GOOGLE_KEY = "goog_NUvLtaesNxERCcRAffebyZByADU";
const SUPERWALL_ANDROID_KEY = "pk_Op2uaWA1p5uPdvwtEWtWr";

// Expo Go ships only standard Expo modules. RevenueCat + Superwall are
// custom native modules and will throw "doesn't seem to be linked" if we
// import them under Expo Go. Detect Expo Go and skip paywall init entirely
// — production EAS dev/preview/release builds still get the full flow.
const isExpoGo = Constants.appOwnership === "expo";

export default function RootLayout() {
  useEffect(() => {
    if (isExpoGo) return;

    // Dynamic require so the JS bundler doesn't try to resolve the native
    // bridge at module load time inside Expo Go.
    const Purchases = require("react-native-purchases").default;
    const Superwall = require("@superwall/react-native-superwall").default;

    Purchases.configure({ apiKey: REVENUECAT_GOOGLE_KEY });

    Superwall.configure({
      apiKey: SUPERWALL_ANDROID_KEY,
      purchaseController: {
        async purchaseFromAppStore() {
          return { type: "cancelled" };
        },
        async purchaseFromGooglePlay(productId: string) {
          try {
            const offerings = await Purchases.getOfferings();
            const pkg = offerings.current?.availablePackages.find(
              (p: any) => p.product.identifier === productId
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

    Purchases.addCustomerInfoUpdateListener((info: any) => {
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
