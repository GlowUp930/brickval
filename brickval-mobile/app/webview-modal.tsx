import { useEffect, useRef } from "react";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { AppState, View, Pressable, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { API_BASE, clearAuthToken, setAuthToken } from "../lib/api";
import { syncSuperwallIdentity } from "../lib/paywall";

/**
 * Generic WebView modal — opens any path on brickvalue.live in a fullscreen
 * sheet over the native camera screen. Used for /account, /upgrade,
 * /result/[setNumber] (full breakdown), /onboarding, /privacy, etc.
 */

export default function WebViewModal() {
  const { path } = useLocalSearchParams<{ path?: string }>();
  const url = `${API_BASE}${path ?? "/"}`;
  const authReturnUrl = `${API_BASE}/account`;
  const SUPERWALL_USER_ID_KEY = "superwall_user_id";
  const webViewRef = useRef<WebView>(null);
  // Tracks whether a Google OAuth session is in progress so we know to reload
  // when the app returns to foreground (needed on Android where Chrome Custom
  // Tabs do not auto-close and openAuthSessionAsync may not resolve cleanly).
  const authInProgress = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && authInProgress.current) {
        authInProgress.current = false;
        webViewRef.current?.reload();
      }
    });
    return () => sub.remove();
  }, []);

  const openExternalAuth = async (authUrl: string) => {
    authInProgress.current = true;
    try {
      await WebBrowser.openAuthSessionAsync(authUrl, authReturnUrl);
    } catch {
      // ignore browser errors
    }
    // Reload the WebView so AccountClient re-runs with the new Clerk session.
    // On iOS sharedCookiesEnabled means the session cookie is already present.
    authInProgress.current = false;
    webViewRef.current?.reload();
  };

  const isExternalAuthUrl = (targetUrl: string) => {
    return (
      targetUrl.startsWith("https://accounts.google.com") ||
      targetUrl.includes("oauth_google") ||
      targetUrl.includes("clerk.") ||
      targetUrl.includes("/oauth") ||
      targetUrl.includes("/sso-callback")
    );
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        token?: string | null;
        userId?: string | null;
      };

      if (payload.type !== "auth_token") return;

      if (payload.token) {
        setAuthToken(payload.token).catch(() => {});
        if (payload.userId) {
          SecureStore.setItemAsync(SUPERWALL_USER_ID_KEY, payload.userId).catch(() => {});
          void syncSuperwallIdentity(payload.userId);
        }
        return;
      }

      clearAuthToken().catch(() => {});
      SecureStore.deleteItemAsync(SUPERWALL_USER_ID_KEY).catch(() => {});
      void syncSuperwallIdentity(null);
    } catch {
      // Ignore malformed messages from hosted pages we don't control.
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ presentation: "modal", headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={`
          window.__BRICKVAL_NATIVE__ = { platform: 'android' };
          true;
        `}
      // Google blocks OAuth from embedded WebViews ("disallowed_useragent").
      // Intercept any navigation to accounts.google.com and hand it off to
      // the system browser (Chrome Custom Tabs / SFAuthenticationSession),
      // which Google does allow.
      onShouldStartLoadWithRequest={(req) => {
          if (isExternalAuthUrl(req.url)) {
            openExternalAuth(req.url);
            return false;
          }
          return true;
        }}
        onOpenWindow={(event) => {
          const targetUrl = event.nativeEvent.targetUrl;
          if (isExternalAuthUrl(targetUrl)) {
            openExternalAuth(targetUrl);
          }
        }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows
        javaScriptCanOpenWindowsAutomatically
        cacheEnabled
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        overScrollMode="never"
        onMessage={handleMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0d0f" },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#0d0d0f",
  },
  close: { color: "white", fontSize: 22, fontWeight: "700" },
  webview: { flex: 1, backgroundColor: "#0d0d0f" },
});
