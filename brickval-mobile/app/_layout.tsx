import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured } from "../lib/clerk";
import {
  initializeNativePaywall,
  syncPurchaseIdentity,
  syncSuperwallIdentity,
  syncSuperwallSubscriptionState,
  getNativeProStatus,
} from "../lib/paywall";

WebBrowser.maybeCompleteAuthSession();

function PlainStack() {
  useEffect(() => {
    initializeNativePaywall();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

function AuthenticatedAppStack() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    initializeNativePaywall();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    void syncPurchaseIdentity(userId ?? null);
    void syncSuperwallIdentity(userId ?? null);
    void (async () => {
      const isPro = await getNativeProStatus();
      await syncSuperwallSubscriptionState(Boolean(userId && isPro));
    })();
  }, [isLoaded, userId]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  if (!isClerkConfigured) {
    return <PlainStack />;
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthenticatedAppStack />
    </ClerkProvider>
  );
}
