import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export function QuestionMarkPlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.root, style]} accessible accessibilityLabel="Image unavailable">
      <Text style={styles.mark}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.12)",
    backgroundColor: "#111312",
  },
  mark: {
    color: "#f2c94c",
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "800",
  },
});
