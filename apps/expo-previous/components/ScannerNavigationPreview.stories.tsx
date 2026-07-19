import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fn } from "storybook/test";
import { CameraScanner } from "./CameraScanner";

// Three throwaway scan-header variants shown against the same native-tab reference.
type HeaderVariant = "floating" | "glassRail" | "twoLevel" | "collection";

function ScannerNavigationPreview({ variant }: { variant: HeaderVariant }) {
  const isCollection = variant === "collection";

  return (
    <View style={styles.phone}>
      {isCollection ? <CollectionPreview /> : <BulkScanPreview variant={variant} />}
      <NativeTabBarPreview active={isCollection ? "collection" : "scan"} />
      <View style={styles.homeIndicator} />
    </View>
  );
}

const meta = {
  title: "Scanner shell / Native tabs + top bar",
  component: ScannerNavigationPreview,
  args: {
    variant: "floating",
  },
  render: (args) => <ScannerNavigationPreview {...args} />,
} satisfies Meta<typeof ScannerNavigationPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const A_FloatingControls: Story = {
  name: "A - Floating controls",
  args: { variant: "floating" },
};

export const B_UnifiedGlassRail: Story = {
  name: "B - Unified glass rail",
  args: { variant: "glassRail" },
};

export const C_TwoLevelHeader: Story = {
  name: "C - Two-level header",
  args: { variant: "twoLevel" },
};

export const CollectionFloatingAddSet: Story = {
  name: "Collection - Floating add set",
  args: { variant: "collection" },
};

function BulkScanPreview({ variant }: { variant: Exclude<HeaderVariant, "collection"> }) {
  return (
    <View style={styles.screen}>
      <CameraScanner
        enabled
        autoCaptureEnabled={false}
        scanIntent="bulk"
        permissionGranted
        cameraPreview={<BulkCameraPreview />}
        onCapture={fn()}
        onPhotoPress={fn()}
      />
      <ScanHeaderPreview variant={variant} />
    </View>
  );
}

function ScanHeaderPreview({ variant }: { variant: Exclude<HeaderVariant, "collection"> }) {
  if (variant === "glassRail") {
    return (
      <View style={[styles.headerRail, styles.glassSurface]}>
        <View style={styles.toolSlot} />
        <ModePicker compact />
        <AccountButton compact />
      </View>
    );
  }

  if (variant === "twoLevel") {
    return (
      <>
        <View style={styles.accountTopRight}>
          <AccountButton />
        </View>
        <View style={[styles.modeLowerRow, styles.glassSurface]}>
          <Text style={styles.modePrompt}>SCAN MODE</Text>
          <ModePicker wide />
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.modeCentered}>
        <ModePicker />
      </View>
      <View style={styles.accountTopRight}>
        <AccountButton />
      </View>
    </>
  );
}

function ModePicker({ compact = false, wide = false }: { compact?: boolean; wide?: boolean }) {
  return (
    <View style={[styles.modePicker, compact && styles.modePickerCompact, wide && styles.modePickerWide]}>
      <View style={styles.modeOption}>
        <Text style={styles.modeText}>Minifig</Text>
      </View>
      <View style={[styles.modeOption, styles.modeOptionSelected]}>
        <Text style={[styles.modeText, styles.modeTextSelected]}>Bulk</Text>
      </View>
    </View>
  );
}

function AccountButton({ compact = false }: { compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open account" style={[styles.accountButton, compact && styles.accountButtonCompact]}>
      <ExpoSymbol ios="person.crop.circle.fill" web="account_circle" size={compact ? 26 : 28} color="#F7F4EA" />
    </Pressable>
  );
}

function BulkCameraPreview() {
  return (
    <View style={styles.bulkPhoto}>
      <View style={styles.bulkScrim} />
      <View style={[styles.figure, styles.figureA]} />
      <View style={[styles.figure, styles.figureB]} />
      <View style={[styles.figure, styles.figureC]} />
      <View style={[styles.figure, styles.figureD]} />
      <View style={[styles.figure, styles.figureE]} />
      <View style={[styles.figure, styles.figureF]} />
      <View style={[styles.scanBox, styles.scanBoxA]} />
      <View style={[styles.scanBox, styles.scanBoxB]} />
      <View style={[styles.scanBox, styles.scanBoxC]} />
    </View>
  );
}

function CollectionPreview() {
  return (
    <View style={styles.collectionScreen}>
      <View style={styles.collectionHero}>
        <Text style={styles.collectionEyebrow}>Collection</Text>
        <Text style={styles.collectionTotal}>$1,284</Text>
        <Text style={styles.collectionSub}>24 items tracked</Text>
      </View>
      <View style={styles.cardGrid}>
        <CollectionCard title="Millennium Falcon" value="$849" />
        <CollectionCard title="Catman" value="$8.83" />
        <CollectionCard title="Clone Trooper" value="$21" />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Enter LEGO set number" style={[styles.floatingAdd, styles.glassSurface]}>
        <ExpoSymbol ios="plus" web="add" size={30} color="#101012" />
      </Pressable>
    </View>
  );
}

function CollectionCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.collectionCard}>
      <View style={styles.collectionImage} />
      <View>
        <Text style={styles.collectionCardTitle}>{title}</Text>
        <Text style={styles.collectionCardValue}>{value}</Text>
      </View>
    </View>
  );
}

function NativeTabBarPreview({ active }: { active: "collection" | "scan" | "settings" }) {
  return (
    <View style={styles.nativeTabDock}>
      <View pointerEvents="none" style={styles.glassHighlight} />
      <TabItem
        label="Collection"
        active={active === "collection"}
        icon={<ExpoSymbol ios={active === "collection" ? "archivebox.fill" : "archivebox"} web="inventory_2" size={24} color={active === "collection" ? "#F2CD37" : "#D3D0C9"} />}
      />
      <TabItem
        label="Scan"
        active={active === "scan"}
        icon={<ExpoSymbol ios={active === "scan" ? "viewfinder.circle.fill" : "viewfinder"} web="document_scanner" size={25} color={active === "scan" ? "#F2CD37" : "#D3D0C9"} />}
      />
      <TabItem
        label="Settings"
        active={active === "settings"}
        icon={<ExpoSymbol ios={active === "settings" ? "gearshape.fill" : "gearshape"} web="settings" size={24} color={active === "settings" ? "#F2CD37" : "#D3D0C9"} />}
      />
    </View>
  );
}

function TabItem({ label, active, icon }: { label: string; active: boolean; icon: ReactNode }) {
  return (
    <View style={[styles.tabItem, active && styles.tabItemActive]}>
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function ExpoSymbol({ ios, web, size, color }: { ios: SFSymbol; web: AndroidSymbol; size: number; color: string }) {
  return (
    <SymbolView
      name={{ ios, android: web, web }}
      size={size}
      type="hierarchical"
      tintColor={color}
      fallback={<Text style={{ color, fontSize: size * 0.8, fontWeight: "900" }}>+</Text>}
    />
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 390,
    height: 844,
    position: "relative",
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "#070708",
    alignSelf: "center",
  },
  screen: { flex: 1, backgroundColor: "#070708" },
  bulkPhoto: { flex: 1, backgroundColor: "#24231F" },
  bulkScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  glassSurface: {
    backgroundColor: "rgba(26,27,30,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  modeCentered: { position: "absolute", top: 52, left: 84, right: 84, alignItems: "center" },
  accountTopRight: { position: "absolute", top: 52, right: 18 },
  accountButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,18,20,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  accountButtonCompact: { width: 42, height: 42, borderRadius: 21 },
  headerRail: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    height: 58,
    borderRadius: 29,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolSlot: { width: 42, height: 42 },
  modeLowerRow: {
    position: "absolute",
    top: 108,
    left: 18,
    right: 18,
    minHeight: 58,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modePrompt: { color: "rgba(247,244,234,0.55)", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  modePicker: {
    width: 210,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    padding: 4,
    gap: 3,
    backgroundColor: "rgba(12,12,14,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  modePickerCompact: { width: 188, height: 42 },
  modePickerWide: { flex: 1, width: undefined },
  modeOption: { flex: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modeOptionSelected: { backgroundColor: "#F2CD37" },
  modeText: { color: "rgba(247,244,234,0.68)", fontSize: 13, fontWeight: "900" },
  modeTextSelected: { color: "#101012" },
  figure: {
    position: "absolute",
    width: 42,
    height: 92,
    borderRadius: 14,
    backgroundColor: "#F2CD37",
    borderWidth: 5,
    borderColor: "#141414",
  },
  figureA: { left: 54, top: 212, transform: [{ rotate: "-5deg" }] },
  figureB: { left: 184, top: 242, backgroundColor: "#D94A32", transform: [{ rotate: "4deg" }] },
  figureC: { right: 64, top: 205, backgroundColor: "#16181C", transform: [{ rotate: "8deg" }] },
  figureD: { left: 76, top: 386, backgroundColor: "#EDE8D5", transform: [{ rotate: "7deg" }] },
  figureE: { left: 184, top: 405, backgroundColor: "#3E7BE0", transform: [{ rotate: "-8deg" }] },
  figureF: { right: 52, top: 380, backgroundColor: "#8847C9", transform: [{ rotate: "3deg" }] },
  scanBox: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#F2CD37",
    borderRadius: 18,
    backgroundColor: "rgba(242,205,55,0.07)",
  },
  scanBoxA: { left: 28, top: 190, width: 92, height: 130 },
  scanBoxB: { left: 160, top: 228, width: 82, height: 120 },
  scanBoxC: { right: 40, top: 188, width: 88, height: 122 },
  collectionScreen: { flex: 1, backgroundColor: "#0B0B0C", paddingHorizontal: 20, paddingTop: 64 },
  collectionHero: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: "rgba(242,205,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(242,205,55,0.22)",
  },
  collectionEyebrow: { color: "#F2CD37", fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  collectionTotal: { color: "#F7F4EA", fontSize: 48, fontWeight: "900", marginTop: 10 },
  collectionSub: { color: "rgba(247,244,234,0.58)", fontSize: 16, fontWeight: "800" },
  cardGrid: { marginTop: 20, gap: 12 },
  collectionCard: {
    minHeight: 96,
    borderRadius: 26,
    backgroundColor: "#171719",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.08)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  collectionImage: { width: 68, height: 68, borderRadius: 20, backgroundColor: "#F7F4EA" },
  collectionCardTitle: { color: "#F7F4EA", fontSize: 17, fontWeight: "900" },
  collectionCardValue: { color: "#F2CD37", fontSize: 20, fontWeight: "900", marginTop: 4 },
  floatingAdd: {
    position: "absolute",
    right: 22,
    bottom: 116,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,205,55,0.90)",
  },
  nativeTabDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    height: 78,
    borderRadius: 38,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    backgroundColor: "rgba(31,32,36,0.76)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  glassHighlight: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  tabItem: { flex: 1, height: 64, borderRadius: 30, alignItems: "center", justifyContent: "center", gap: 3 },
  tabItemActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  tabLabel: { color: "#D3D0C9", fontSize: 11, fontWeight: "700" },
  tabLabelActive: { color: "#F7F4EA", fontWeight: "900" },
  homeIndicator: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
    width: 114,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,244,234,0.88)",
  },
});
