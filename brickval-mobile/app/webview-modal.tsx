import { useLocalSearchParams, router, Stack } from "expo-router";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { API_BASE } from "../lib/api";

/**
 * Generic WebView modal — opens any path on brickvalue.live in a fullscreen
 * sheet over the native camera screen. Used for /account, /upgrade,
 * /result/[setNumber] (full breakdown), /onboarding, /privacy, etc.
 */

export default function WebViewModal() {
  const { path } = useLocalSearchParams<{ path?: string }>();
  const url = `${API_BASE}${path ?? "/"}`;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ presentation: "modal", headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={`
          window.__BRICKVAL_NATIVE__ = { platform: 'android' };
          true;
        `}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        cacheEnabled
        javaScriptEnabled
        domStorageEnabled
        overScrollMode="never"
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
