import { Tabs } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { SymbolView, type SFSymbol } from "expo-symbols";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Archive, ScanLine, Settings } from "lucide-react-native";
import { useTheme } from "../../lib/ThemeProvider";

type FallbackIcon = typeof Archive;

const tabConfig: Record<string, { label: string; symbol: SFSymbol; fallback: FallbackIcon }> = {
  index: { label: "Collection", symbol: "tray.full.fill", fallback: Archive },
  scan: { label: "Scan", symbol: "viewfinder.circle.fill", fallback: ScanLine },
  settings: { label: "Settings", symbol: "gearshape.fill", fallback: Settings },
};

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.dark.background },
      }}
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
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor="rgba(23, 24, 28, 0.82)"
        isInteractive
        style={[
          styles.bar,
          {
            backgroundColor: c.dark.surfaceGlassStrong,
            borderColor: c.dark.borderStrong,
            shadowColor: "#000000",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const config = tabConfig[route.name] ?? tabConfig.index;
          const label = config.label;
          const Fallback = config.fallback;
          const iconColor = selected ? c.dark.textInverse : c.dark.textDisabled;

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
                <SymbolView
                  name={config.symbol}
                  size={22}
                  type="hierarchical"
                  tintColor={iconColor}
                  fallback={<Fallback size={22} color={iconColor} strokeWidth={2.3} />}
                />
              </View>
              <Text style={[styles.label, { color: selected ? c.dark.text : c.dark.textMuted }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </GlassView>
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
