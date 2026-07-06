import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Host, TabView, Text as SwiftText } from "@expo/ui/swift-ui";
import { frame, tabViewStyle, tint } from "@expo/ui/swift-ui/modifiers";

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
  if (Platform.OS === "ios") {
    return (
      <View style={styles.swiftShell}>
        <Host
          colorScheme="dark"
          seedColor="#F2CD37"
          style={styles.swiftHost}
        >
          <TabView
            selection={value}
            onSelectionChange={(next) => {
              if (next === "single" || next === "bulk") onChange(next);
            }}
            modifiers={[
              tint("#F2CD37"),
              frame({ width: 276, height: 68 }),
              tabViewStyle({ type: "automatic" }),
            ]}
          >
            <TabView.Tab value="single" label="Minifig" systemImage="person.crop.square">
              <SwiftText>Single minifigure</SwiftText>
            </TabView.Tab>
            <TabView.Tab value="bulk" label="Bulk" systemImage="square.grid.2x2.fill">
              <SwiftText>Bulk minifigures</SwiftText>
            </TabView.Tab>
          </TabView>
        </Host>
      </View>
    );
  }

  return (
    <View style={styles.segment}>
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={
              option.value === "single" ? "Scan one minifigure" : "Scan multiple minifigures"
            }
            onPress={() => onChange(option.value)}
            style={[styles.segmentButton, selected && styles.segmentButtonActive]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  swiftShell: {
    width: 276,
    height: 68,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(10,10,12,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  swiftHost: {
    width: 276,
    height: 68,
  },
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
