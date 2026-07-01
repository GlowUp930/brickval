import { Stack } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useTheme } from "../../lib/ThemeProvider";

const tabIcons = {
  collection: require("../../assets/native-tab-icons/collection.png"),
  scan: require("../../assets/native-tab-icons/scanning.png"),
  settings: require("../../assets/native-tab-icons/gear.png"),
} as const;

export default function TabLayout() {
  const { colors: c } = useTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NativeTabs
        tintColor={c.lego.yellow}
        iconColor={{ default: c.light.textDisabled, selected: c.light.text }}
        labelStyle={{
          default: {
            color: c.light.textMuted,
            fontSize: 11,
            fontWeight: "800",
          },
          selected: {
            color: c.light.text,
            fontSize: 11,
            fontWeight: "900",
          },
        }}
        backgroundColor={c.light.surfaceGlassStrong}
        shadowColor={c.light.border}
        indicatorColor={c.lego.yellow}
        disableTransparentOnScrollEdge
        minimizeBehavior="never"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon src={tabIcons.collection} renderingMode="template" />
          <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="scan">
          <NativeTabs.Trigger.Icon src={tabIcons.scan} renderingMode="template" />
          <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon src={tabIcons.settings} renderingMode="template" />
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
