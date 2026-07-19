import { Pressable, StyleSheet, Text, View } from "react-native";

export type ScanIntent = "single" | "bulk";

interface Props {
  value: ScanIntent;
  onChange: (value: ScanIntent) => void;
}

const OPTIONS: Array<{ value: ScanIntent; label: string }> = [
  { value: "single", label: "Minifig" },
  { value: "bulk", label: "Bulk Minifigs" },
];

export function ScanIntentPicker({ value, onChange }: Props) {
  return (
    <View style={styles.segment}>
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.value === "single" ? "Scan one minifigure" : "Scan multiple minifigures"}
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, selected && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    width: 252,
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10,10,12,0.72)",
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  segmentButtonActive: {
    backgroundColor: "#F2CD37",
  },
  segmentText: {
    color: "rgba(247,244,234,0.7)",
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#101012",
  },
});
