import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { hasCompletedOnboarding } from "../lib/onboarding";

export default function AppEntry() {
  useEffect(() => {
    let cancelled = false;

    async function resolveEntry() {
      const complete = await hasCompletedOnboarding();
      if (cancelled) return;
      router.replace(complete ? "/scan" : "/onboarding");
    }

    resolveEntry().catch(() => {
      if (cancelled) return;
      router.replace("/onboarding");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
});
