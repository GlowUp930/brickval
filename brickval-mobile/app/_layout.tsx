import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { syncSuperwallIdentity, syncSuperwallSubscriptionState } from "../lib/paywall";

const REVENUECAT_GOOGLE_KEY = "goog_NUvLtaesNxERCcRAffebyZByADU";
const SUPERWALL_ANDROID_KEY = "pk_Op2uaWA1p5uPdvwtEWtWr";
const SUPERWALL_USER_ID_KEY = "superwall_user_id";

// Expo Go ships only standard Expo modules. RevenueCat + Superwall are
// custom native modules and will throw "doesn't seem to be linked" if we
// import them under Expo Go. Detect Expo Go and skip paywall init entirely
// — production EAS dev/preview/release builds still get the full flow.
const isExpoGo = Constants.appOwnership === "expo";
const shouldInitNativePaywall = Constants.expoConfig?.extra?.enableNativePaywall === true;

export default function RootLayout() {
  useEffect(() => {
    if (isExpoGo || !shouldInitNativePaywall) return;

    try {
      // Dynamic require keeps Expo Go from resolving the native bridge at load time.
      const Purchases = require("react-native-purchases").default;
      const Superwall = require("@superwall/react-native-superwall").default;

      if (!Purchases?.configure || !Superwall?.configure) return;

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

      void (async () => {
        const storedUserId = await SecureStore.getItemAsync(SUPERWALL_USER_ID_KEY);
        if (storedUserId) {
          await syncSuperwallIdentity(storedUserId);
        }
      })();

      Purchases.addCustomerInfoUpdateListener((info: any) => {
        const isPro = !!info.entitlements.active["pro"];
        void syncSuperwallSubscriptionState(isPro);
      });
    } catch (error) {
      console.warn("Paywall SDK init skipped", error);
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
