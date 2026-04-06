import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Purchases from "react-native-purchases";
// import Superwall from "@superwall/react-native-superwall";

/**
 * Root layout — initializes RevenueCat + Superwall SDKs.
 *
 * TODO: Replace placeholder API keys with real ones from:
 *   - RevenueCat dashboard → API Keys → Google (public)
 *   - Superwall dashboard → Settings → API Keys → Android
 */

const REVENUECAT_GOOGLE_KEY = "goog_YOUR_KEY_HERE";
// const SUPERWALL_ANDROID_KEY = "pk_YOUR_KEY_HERE";

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat
    Purchases.configure({ apiKey: REVENUECAT_GOOGLE_KEY });

    // Initialize Superwall with RevenueCat as purchase controller
    // Uncomment once Superwall SDK is configured:
    // Superwall.configure({
    //   apiKey: SUPERWALL_ANDROID_KEY,
    // });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
