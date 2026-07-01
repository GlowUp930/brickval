import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/ThemeProvider";

const tabIcons = {
  index: require("../../assets/native-tab-icons/collection.png"),
  scan: require("../../assets/native-tab-icons/scanning.png"),
  settings: require("../../assets/native-tab-icons/gear.png"),
} as const;

const tabLabels: Record<string, string> = {
  index: "Collection",
  scan: "Scan",
  settings: "Settings",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BrickValTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Collection" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

function BrickValTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <BlurView
        tint="light"
        intensity={Platform.OS === "ios" ? 58 : 90}
        experimentalBlurMethod="dimezisBlurView"
        style={[
          styles.bar,
          {
            backgroundColor: c.light.surfaceGlassStrong,
            borderColor: c.light.border,
            shadowColor: "#000000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const label = tabLabels[route.name] ?? route.name;
          const icon = tabIcons[route.name as keyof typeof tabIcons];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={`${label} tab`}
              accessibilityState={selected ? { selected: true } : undefined}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!selected && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}
              hitSlop={8}
            >
              <View style={[styles.iconPlate, selected && { backgroundColor: c.lego.yellow }]}>
                <Image
                  source={icon}
                  resizeMode="contain"
                  style={[
                    styles.icon,
                    {
                      tintColor: selected ? c.light.text : c.light.textDisabled,
                      opacity: selected ? 1 : 0.78,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.label, { color: selected ? c.light.text : c.light.textMuted }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    height: 74,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 14,
  },
  item: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconPlate: {
    width: 34,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  icon: {
    width: 23,
    height: 23,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
