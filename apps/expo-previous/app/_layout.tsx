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
import { initSentry, Sentry } from "../lib/sentry";
import { ThemeProvider, useTheme } from "../lib/ThemeProvider";

initSentry();
WebBrowser.maybeCompleteAuthSession();

function PlainStack() {
  const { mode } = useTheme();

  useEffect(() => {
    initializeNativePaywall();
  }, []);

  return (
    <>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

function AuthenticatedAppStack() {
  const { getToken, isLoaded, userId } = useAuth({ treatPendingAsSignedOut: false });
  const { mode } = useTheme();

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
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

function RootLayout() {
  const app = !isClerkConfigured ? (
    <PlainStack />
  ) : (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={safeTokenCache}>
      <AuthenticatedAppStack />
    </ClerkProvider>
  );

  return <ThemeProvider initial="light">{app}</ThemeProvider>;
}

export default Sentry.wrap(RootLayout);
