import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { CLERK_PUBLISHABLE_KEY, isClerkConfigured, safeTokenCache, setClerkAuthTokenGetter } from "../lib/clerk";
import {
  initializeNativePaywall,
  syncPurchaseIdentity,
  syncSuperwallIdentity,
  syncSuperwallSubscriptionState,
  getNativeProStatus,
} from "../lib/paywall";
import { initSentry } from "../lib/sentry";

initSentry();
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
  const { getToken, isLoaded, userId } = useAuth({ treatPendingAsSignedOut: false });

  useEffect(() => {
    initializeNativePaywall();
  }, []);

  useEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

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
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={safeTokenCache}>
      <AuthenticatedAppStack />
    </ClerkProvider>
  );
}
