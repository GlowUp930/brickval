import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOLD = "#f5c518";

export function TopBar({ onAccountPress }: { onAccountPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={[styles.bar, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.row}>
        {/* Logo lockup */}
        <View style={styles.logoRow}>
          <View style={styles.brick}>
            <View style={styles.stud} />
            <View style={styles.stud} />
          </View>
          <Text style={styles.wordmark}>
            Brick<Text style={{ color: GOLD }}>value</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)" }}>.live</Text>
          </Text>
        </View>

        {/* Account button */}
        <Pressable
          onPress={onAccountPress}
          hitSlop={12}
          style={styles.accountBtn}
        >
          <Text style={styles.accountInitial}>A</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    backgroundColor: "rgba(13,13,15,0.35)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brick: {
    width: 26,
    height: 18,
    borderRadius: 3,
    backgroundColor: GOLD,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: 2,
  },
  stud: {
    width: 7,
    height: 4,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.45)",
    marginTop: -3,
  },
  wordmark: { color: "white", fontSize: 16, fontWeight: "800" },
  accountBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,197,24,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountInitial: { color: GOLD, fontWeight: "800", fontSize: 14 },
});
