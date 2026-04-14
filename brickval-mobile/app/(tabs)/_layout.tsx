import { Tabs } from "expo-router";
import { View, Text } from "react-native";

const ACCENT = "#f2c94c";
const MUTED = "rgba(247,244,234,0.54)";
const SURFACE = "#111110";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: "rgba(247,244,234,0.12)",
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="H" />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="S" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabGlyph color={color} label="G" />,
        }}
      />
    </Tabs>
  );
}

function TabGlyph({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}
