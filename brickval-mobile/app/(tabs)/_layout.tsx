import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";
import { useTheme } from "../../lib/ThemeProvider";

const tabLabelColor = DynamicColorIOS({
  dark: "#F7F4EA",
  light: "#101012",
});
const tabMutedColor = DynamicColorIOS({
  dark: "rgba(247,244,234,0.58)",
  light: "rgba(16,16,18,0.56)",
});
const tabBackgroundColor = DynamicColorIOS({
  dark: "rgba(9,10,12,0.78)",
  light: "rgba(250,248,240,0.82)",
});

export default function TabLayout() {
  const { accent } = useTheme();
  const tabAccentColor = DynamicColorIOS({
    dark: accent.primary,
    light: accent.pressed,
  });
  return (
    <NativeTabs
      backgroundColor={tabBackgroundColor}
      blurEffect="systemChromeMaterialDark"
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
