import { Tabs } from "expo-router";
import { Archive, ScanLine, Settings as SettingsIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../lib/ThemeProvider";

const tabConfig = {
  index: { label: "Collection", Icon: Archive },
  scan: { label: "Scan", Icon: ScanLine },
  settings: { label: "Settings", Icon: SettingsIcon },
};

type TabName = keyof typeof tabConfig;
type BrickValTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarLabel?: unknown;
        tabBarAccessibilityLabel?: string;
      };
    }
  >;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => {
      defaultPrevented?: boolean;
    };
    navigate: (name: string, params?: object) => void;
  };
};

function isTabName(value: string): value is TabName {
  return value in tabConfig;
}

export default function TabLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: c.background },
      }}
      tabBar={(props) => <BrickValTabBar {...(props as unknown as BrickValTabBarProps)} />}
    >
      <Tabs.Screen name="index" options={{ title: "Collection" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

function BrickValTabBar({ state, descriptors, navigation }: BrickValTabBarProps) {
  const { colors, c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, { backgroundColor: c.backgroundElevated, borderColor: c.border }]}>
        {state.routes.map((route, index) => {
          if (!isTabName(route.name)) return null;
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? String(options.tabBarLabel)
              : options.title !== undefined
                ? options.title
                : tabConfig[route.name].label;
          const Icon = tabConfig[route.name].Icon;
          const color = focused ? colors.lego.yellow : c.textMuted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              }}
              style={styles.tab}
            >
              <View
                style={[
                  styles.iconPlate,
                  focused && {
                    backgroundColor: "rgba(242,205,55,0.16)",
                    borderColor: "rgba(242,205,55,0.52)",
                  },
                ]}
              >
                <Icon size={focused ? 27 : 25} strokeWidth={focused ? 3.2 : 2.8} color={color} />
              </View>
              <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(6,7,9,0.98)",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    minHeight: 82,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  iconPlate: {
    width: 48,
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },
  labelFocused: {
    fontWeight: "900",
  },
});
