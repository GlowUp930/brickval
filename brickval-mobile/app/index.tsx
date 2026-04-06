import { useRef, useCallback } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
// import Superwall from "@superwall/react-native-superwall";
import Purchases from "react-native-purchases";

/**
 * Main screen — WebView loading the live BrickVal web app.
 *
 * Bridge protocol:
 *   Web → Native:  window.ReactNativeWebView.postMessage(JSON.stringify({ action, ... }))
 *   Native → Web:  webviewRef.injectJavaScript(`window.__BRICKVAL_NATIVE__ = { ... }`)
 *
 * Actions:
 *   "show_paywall"       — trigger Superwall paywall presentation
 *   "check_subscription" — query RevenueCat entitlements, inject result back
 *   "restore_purchases"  — restore previous purchases via RevenueCat
 */

const APP_URL = "https://brickval.com";

export default function MainScreen() {
  const webviewRef = useRef<WebView>(null);

  const injectState = useCallback(
    (data: Record<string, unknown>) => {
      webviewRef.current?.injectJavaScript(
        `window.__BRICKVAL_NATIVE__ = ${JSON.stringify(data)}; true;`
      );
    },
    []
  );

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let msg: { action?: string };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (msg.action) {
        case "show_paywall": {
          // Superwall.shared.register("tap_upgrade");
          // TODO: Uncomment once Superwall is configured
          break;
        }

        case "check_subscription": {
          try {
            const info = await Purchases.getCustomerInfo();
            const isPro =
              info.entitlements.active["pro"] !== undefined;
            injectState({ isPro, platform: "android" });
          } catch {
            injectState({ isPro: false, platform: "android" });
          }
          break;
        }

        case "restore_purchases": {
          try {
            const info = await Purchases.restorePurchases();
            const isPro =
              info.entitlements.active["pro"] !== undefined;
            injectState({ isPro, platform: "android", restored: true });
          } catch {
            injectState({ isPro: false, platform: "android", restored: false });
          }
          break;
        }
      }
    },
    [injectState]
  );

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        // Inject native detection flag on page load
        injectedJavaScriptBeforeContentLoaded={`
          window.__BRICKVAL_NATIVE__ = { platform: 'android' };
          true;
        `}
        // Camera & file upload support
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Performance
        cacheEnabled
        javaScriptEnabled
        domStorageEnabled
        // UI
        overScrollMode="never"
        startInLoadingState
        renderLoading={() => null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
});
