import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#f2c94c";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.62)";

export function TopBar({ onAccountPress }: { onAccountPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={28}
      tint="dark"
      style={[styles.bar, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.row}>
        <View style={styles.logoRow}>
          <View style={styles.mark}>
            <View style={styles.markLine} />
            <View style={[styles.markLine, styles.markLineShort]} />
          </View>
          <View>
            <Text style={styles.wordmark}>BrickVal</Text>
            <Text style={styles.subtitle}>Live set valuation</Text>
          </View>
        </View>

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

const styles = StyleSheet.create({
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
    borderColor: "rgba(242,201,76,0.46)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(242,201,76,0.08)",
  },
  markLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
  },
  markLineShort: { width: 9, alignSelf: "flex-end", marginRight: 7 },
  wordmark: { color: INK, fontSize: 17, fontWeight: "900", letterSpacing: 0 },
  subtitle: { color: MUTED, fontSize: 11, fontWeight: "700", marginTop: 1 },
  accountBtn: {
    minWidth: 76,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(247,244,234,0.08)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  accountText: { color: INK, fontWeight: "800", fontSize: 12 },
});
