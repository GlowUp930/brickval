import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { hasCompletedOnboarding } from "../lib/onboarding";

export default function AppEntry() {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveEntry() {
      const complete = await hasCompletedOnboarding();
      if (cancelled) return;
      setResolved(true);
      router.replace(complete ? "/scan" : "/onboarding");
    }

    resolveEntry().catch(() => {
      if (cancelled) return;
      setResolved(true);
      router.replace("/onboarding");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {!resolved ? <ActivityIndicator size="small" color="#111111" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f2eb",
  },
});
