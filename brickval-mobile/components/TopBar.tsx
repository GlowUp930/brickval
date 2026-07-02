import { View, Text, Pressable, StyleSheet } from "react-native";
import { useMemo } from "react";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors as c } from "../lib/theme";
import type { ThemeColors } from "../lib/theme";

export function TopBar({ onAccountPress }: { onAccountPress: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(c), []);

  return (
    <BlurView
      intensity={28}
      tint="dark"
      style={[styles.bar, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onAccountPress}
          hitSlop={12}
          style={styles.logoRow}
        >
          <View style={styles.mark}>
            <View style={styles.markLine} />
            <View style={[styles.markLine, styles.markLineShort]} />
          </View>
          <View>
            <Text style={styles.wordmark}>BrickVal</Text>
            <Text style={styles.subtitle}>Live set valuation</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onAccountPress}
          hitSlop={12}
          style={styles.accountBtn}
        >
          <Text style={styles.accountText}>Account</Text>
        </Pressable>
      </View>
    </BlurView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    bar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 18,
      paddingBottom: 14,
      zIndex: 10,
      backgroundColor: "rgba(11,11,12,0.26)",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    mark: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.lego.yellow + "75",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: c.lego.yellow + "14",
    },
    markLine: {
      width: 14,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.lego.yellow,
    },
    markLineShort: { width: 9, alignSelf: "flex-end", marginRight: 7 },
    wordmark: { color: c.dark.text, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
    subtitle: { color: c.dark.textMuted, fontSize: 11, fontWeight: "700", marginTop: 1 },
    accountBtn: {
      minWidth: 76,
      height: 34,
      borderRadius: 8,
      backgroundColor: c.dark.border + "14",
      borderWidth: 1,
      borderColor: c.dark.border + "2E",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    accountText: { color: c.dark.text, fontWeight: "800", fontSize: 12 },
  });
}
