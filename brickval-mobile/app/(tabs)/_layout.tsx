import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "../../lib/ThemeProvider";

export default function TabLayout() {
  const { accent, mode } = useTheme();
  const isDark = mode === "dark";
  const tabLabelColor = isDark ? "#F7F4EA" : "#101012";
  const tabMutedColor = isDark ? "rgba(247,244,234,0.58)" : "rgba(16,16,18,0.56)";
  const tabBackgroundColor = isDark ? "rgba(9,10,12,0.78)" : "rgba(255,255,255,0.9)";
  const tabAccentColor = isDark ? accent.primary : accent.pressed;

  return (
    <NativeTabs
      backgroundColor={tabBackgroundColor}
      blurEffect={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
      disableTransparentOnScrollEdge
      iconColor={{ default: tabMutedColor, selected: tabAccentColor }}
      labelStyle={{
        default: { color: tabMutedColor, fontWeight: "800" },
        selected: { color: tabLabelColor, fontWeight: "900" },
      }}
      minimizeBehavior="automatic"
      tintColor={tabAccentColor}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "archivebox", selected: "archivebox.fill" }}
          md="inventory_2"
        />
        <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan">
        <NativeTabs.Trigger.Icon
          sf={{ default: "viewfinder", selected: "viewfinder.circle.fill" }}
          md="document_scanner"
        />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
