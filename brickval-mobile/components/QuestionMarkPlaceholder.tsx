import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type ThemeColors } from "../lib/ThemeProvider";

export function QuestionMarkPlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors: c } = useTheme();
  const s = useMemo(() => getStyles(c), [c]);
  return (
    <View style={[s.root, style]} accessible accessibilityLabel="Image unavailable">
      <Text style={s.mark}>?</Text>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.dark.border,
      backgroundColor: c.dark.background,
    },
    mark: {
      color: c.lego.yellow,
      fontSize: 30,
      lineHeight: 32,
      fontWeight: "800",
    },
  });
}
