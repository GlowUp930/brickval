import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { expect } from "storybook/test";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { ScanIntentPicker, type ScanIntent } from "./ScanIntentPicker";

type SingleState = "searching" | "detected" | "steady" | "checking" | "matched";

interface FlowProps {
  mode: ScanIntent;
  singleState: SingleState;
}

const FIGURE_IMAGE = "https://img.bricklink.com/ItemImage/MN/0/sh0115.png";

function HandsFreeScannerFlow({ mode: initialMode, singleState }: FlowProps) {
  const [mode, setMode] = useState<ScanIntent>(initialMode);
  const matched = mode === "single" && singleState === "matched";

  return (
    <View style={styles.phone}>
      <CameraScene mode={mode} state={singleState} />
      <View pointerEvents="none" style={styles.vignette} />

      <View style={styles.topRail}>
        <RoundControl label="Close scanner" icon="close" />
        <ScanIntentPicker value={mode} onChange={setMode} />
        <RoundControl label="Toggle flash" icon="flash_off" />
      </View>

      {mode === "bulk" ? <BulkGuidance /> : null}
      {!matched ? <ScannerStatus mode={mode} state={singleState} /> : null}

      <View style={styles.galleryButton}>
        <SymbolView
          name={{ ios: "photo.on.rectangle", android: "photo_library", web: "photo_library" }}
          size={25}
          tintColor="#F7F4EA"
          fallback={<Text style={styles.iconFallback}>+</Text>}
        />
      </View>

      {mode === "bulk" ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Capture bulk minifigure photo" style={styles.bulkCapture}>
          <SymbolView
            name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }}
            size={29}
            tintColor="#101012"
            fallback={<Text style={styles.captureFallback}>+</Text>}
          />
        </Pressable>
      ) : null}

      {matched ? <MatchResultSheet /> : null}
      <View style={styles.homeIndicator} />
    </View>
  );
}

const meta = {
  title: "Scan / Hands-free approved flow",
  component: HandsFreeScannerFlow,
  args: {
    mode: "single",
    singleState: "searching",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Storybook-first visualisation of the approved object-aware scan flow. The mode control is backed by Expo UI on native iOS and Android; Storybook renders its web-safe equivalent.",
      },
    },
  },
  render: (args) => <HandsFreeScannerFlow {...args} />,
} satisfies Meta<typeof HandsFreeScannerFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const A_Searching: Story = {
  name: "1 — Scanning",
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Scanning...")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /capture bulk/i })).toBeNull();
  },
};

export const B_MinifigureDetected: Story = {
  name: "2 — Minifigure detected",
  args: { singleState: "detected" },
};

export const C_HoldStill: Story = {
  name: "3 — Hold still",
  args: { singleState: "steady" },
};

export const D_CheckingMatch: Story = {
  name: "4 — Checking match",
  args: { singleState: "checking" },
};

export const E_MatchFound: Story = {
  name: "5 — Match found + result sheet",
  args: { singleState: "matched" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("MATCH FOUND")).toBeVisible();
    await expect(canvas.getByText("Spider-Man")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add Spider-Man as used" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add Spider-Man as new" })).toBeVisible();
  },
};

export const F_BulkGuidance: Story = {
  name: "Bulk — live count + deliberate capture",
  args: { mode: "bulk" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("3 minifigures detected")).toBeVisible();
    await expect(canvas.getByRole("button", { name: /capture bulk/i })).toBeVisible();
  },
};

function CameraScene({ mode, state }: { mode: ScanIntent; state: SingleState }) {
  const showSingleBox = mode === "single" && state !== "searching";
  return (
    <View style={styles.camera}>
      <View style={styles.wallGlow} />
      <View style={styles.desk} />
      <View style={styles.figureStage}>
        <View style={styles.figureHalo} />
        <Image source={{ uri: FIGURE_IMAGE }} style={styles.figureImage} resizeMode="contain" />
        {showSingleBox ? <View style={[styles.detectBox, state === "steady" && styles.detectBoxReady]} /> : null}
      </View>
      {mode === "bulk" ? (
        <>
          <BulkFigure left={38} top={260} scale={0.72} label="1" />
          <BulkFigure left={244} top={280} scale={0.64} label="3" />
          <View style={[styles.bulkBox, { left: 118, top: 210, width: 150, height: 280 }]}><Text style={styles.bulkBoxLabel}>2</Text></View>
        </>
      ) : null}
    </View>
  );
}

function BulkFigure({ left, top, scale, label }: { left: number; top: number; scale: number; label: string }) {
  return (
    <View style={[styles.bulkFigure, { left, top, transform: [{ scale }] }]}>
      <Image source={{ uri: FIGURE_IMAGE }} style={styles.bulkFigureImage} resizeMode="contain" />
      <View style={styles.bulkFigureBox}><Text style={styles.bulkBoxLabel}>{label}</Text></View>
    </View>
  );
}

function ScannerStatus({ mode, state }: { mode: ScanIntent; state: SingleState }) {
  const content = mode === "bulk"
    ? { title: "3 minifigures detected", detail: "Keep each figure separate", tone: "ready" as const }
    : state === "detected"
      ? { title: "Minifigure detected", detail: "Bring the full figure into view", tone: "detected" as const }
      : state === "steady"
        ? { title: "Hold still", detail: "Capturing automatically", tone: "ready" as const }
        : state === "checking"
          ? { title: "Checking match...", detail: "Identifying and pricing", tone: "working" as const }
          : { title: "Scanning...", detail: "Point at one complete minifigure", tone: "idle" as const };

  return (
    <View accessible accessibilityLiveRegion="polite" style={styles.statusWrap}>
      <View style={[styles.statusIcon, content.tone !== "idle" && styles.statusIconActive]}>
        <SymbolView
          name={{ ios: content.tone === "working" ? "sparkles" : "viewfinder", android: "center_focus_strong", web: "center_focus_strong" }}
          size={19}
          tintColor={content.tone === "idle" ? "rgba(247,244,234,0.7)" : "#101012"}
          fallback={<Text style={styles.statusIconFallback}>•</Text>}
        />
      </View>
      <View>
        <Text style={styles.statusTitle}>{content.title}</Text>
        <Text style={styles.statusDetail}>{content.detail}</Text>
      </View>
    </View>
  );
}

function BulkGuidance() {
  return (
    <View style={styles.bulkGuidance}>
      <Text style={styles.bulkGuidanceEyebrow}>BULK MINIFIGURES</Text>
      <Text style={styles.bulkGuidanceTitle}>All 3 are clear</Text>
      <Text style={styles.bulkGuidanceBody}>Space figures apart · Keep them fully visible</Text>
    </View>
  );
}

function MatchResultSheet() {
  return (
    <View style={styles.resultLayer}>
      <View accessible accessibilityLiveRegion="polite" style={styles.matchToast}>
        <View style={styles.matchDot} />
        <Text style={styles.matchToastText}>Match found</Text>
      </View>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.identityRow}>
          <View style={styles.catalogFrame}>
            <Image source={{ uri: FIGURE_IMAGE }} style={styles.catalogImage} resizeMode="contain" />
          </View>
          <View style={styles.identityCopy}>
            <View style={styles.matchLabel}><Text style={styles.matchLabelText}>MATCH FOUND</Text></View>
            <Text style={styles.name}>Spider-Man</Text>
            <Text style={styles.meta}>Juniors · sh0115</Text>
            <Text style={styles.detail}>2014 · Appears in 2 sets</Text>
          </View>
          <RoundControl label="Close result" icon="close" compact />
        </View>

        <View style={styles.pricePanel}>
          <View style={styles.priceColumn}>
            <Text style={styles.usedLabel}>USED</Text>
            <Text style={styles.price}>$4.92</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceColumn}>
            <Text style={styles.newLabel}>NEW</Text>
            <Text style={styles.price}>$7.57</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Review similar minifigure matches" style={styles.correctionRow}>
          <View>
            <Text style={styles.correctionTitle}>Wrong minifigure?</Text>
            <Text style={styles.correctionMeta}>Compare 3 similar matches</Text>
          </View>
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            size={20}
            tintColor="#F7F4EA"
            fallback={<Text style={styles.iconFallback}>›</Text>}
          />
        </Pressable>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add Spider-Man as used" style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Add as Used</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Add Spider-Man as new" style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Add as New</Text>
          </Pressable>
        </View>
        <Text style={styles.priceSignal}>BrickLink sold average · updated today</Text>
      </View>
    </View>
  );
}

function RoundControl({ label, icon, compact = false }: { label: string; icon: "close" | "flash_off"; compact?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={[styles.roundControl, compact && styles.roundControlCompact]}>
      <SymbolView
        name={{ ios: icon === "close" ? "xmark" : "bolt.slash", android: icon, web: icon }}
        size={compact ? 18 : 23}
        tintColor="#F7F4EA"
        fallback={<Text style={styles.iconFallback}>{icon === "close" ? "×" : "*"}</Text>}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  phone: { width: 390, height: 780, alignSelf: "center", overflow: "hidden", borderRadius: 34, backgroundColor: "#101012", position: "relative" },
  camera: { ...StyleSheet.absoluteFill, backgroundColor: "#3B352E" },
  wallGlow: { position: "absolute", top: -80, left: -70, width: 520, height: 450, borderRadius: 260, backgroundColor: "rgba(247,225,184,0.18)" },
  desk: { position: "absolute", left: -60, right: -60, bottom: 0, height: 500, backgroundColor: "#786958", transform: [{ rotate: "-4deg" }] },
  figureStage: { position: "absolute", top: 185, left: 90, width: 210, height: 350, alignItems: "center", justifyContent: "center" },
  figureHalo: { position: "absolute", width: 210, height: 310, borderRadius: 120, backgroundColor: "rgba(255,240,202,0.16)" },
  figureImage: { width: 184, height: 310 },
  detectBox: { position: "absolute", top: 22, left: 21, right: 21, bottom: 17, borderWidth: 2, borderColor: "rgba(242,205,55,0.72)", borderRadius: 24 },
  detectBoxReady: { borderColor: "#F2CD37", borderWidth: 3 },
  vignette: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.12)" },
  topRail: { position: "absolute", top: 38, left: 17, right: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundControl: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(16,16,18,0.7)" },
  roundControlCompact: { width: 40, height: 40, borderRadius: 20 },
  iconFallback: { color: "#F7F4EA", fontSize: 23, fontWeight: "900" },
  statusWrap: { position: "absolute", bottom: 104, alignSelf: "center", minWidth: 242, minHeight: 60, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "rgba(16,16,18,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" },
  statusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  statusIconActive: { backgroundColor: "#F2CD37" },
  statusIconFallback: { color: "#101012", fontSize: 22, fontWeight: "900" },
  statusTitle: { color: "#F7F4EA", fontSize: 15, fontWeight: "900" },
  statusDetail: { color: "rgba(247,244,234,0.62)", fontSize: 11, marginTop: 2 },
  galleryButton: { position: "absolute", left: 24, bottom: 104, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(16,16,18,0.78)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  bulkCapture: { position: "absolute", right: 24, bottom: 95, width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", backgroundColor: "#F2CD37", borderWidth: 4, borderColor: "rgba(247,244,234,0.92)" },
  captureFallback: { color: "#101012", fontSize: 28, fontWeight: "900" },
  homeIndicator: { position: "absolute", bottom: 10, alignSelf: "center", width: 128, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.92)" },
  resultLayer: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.14)" },
  matchToast: { position: "absolute", bottom: 560, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11, backgroundColor: "rgba(16,16,18,0.84)" },
  matchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F2CD37" },
  matchToastText: { color: "#F7F4EA", fontSize: 15, fontWeight: "900" },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: "#171719", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 20, paddingTop: 9, paddingBottom: 34 },
  handle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: "rgba(247,244,234,0.25)", marginBottom: 16 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  catalogFrame: { width: 82, height: 104, borderRadius: 14, backgroundColor: "#F7F4EA", padding: 5 },
  catalogImage: { width: "100%", height: "100%" },
  identityCopy: { flex: 1 },
  matchLabel: { alignSelf: "flex-start", borderRadius: 12, backgroundColor: "rgba(242,205,55,0.14)", paddingHorizontal: 9, paddingVertical: 4, marginBottom: 5 },
  matchLabelText: { color: "#F2CD37", fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  name: { color: "#F7F4EA", fontSize: 24, fontWeight: "900" },
  meta: { color: "rgba(247,244,234,0.62)", fontSize: 13, fontWeight: "800", marginTop: 3 },
  detail: { color: "rgba(247,244,234,0.5)", fontSize: 12, marginTop: 5 },
  pricePanel: { marginTop: 16, minHeight: 86, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.025)" },
  priceColumn: { flex: 1, alignItems: "center", gap: 5 },
  priceDivider: { height: 52, width: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  usedLabel: { color: "#F97316", fontSize: 11, fontWeight: "900", letterSpacing: 0.9 },
  newLabel: { color: "#F2CD37", fontSize: 11, fontWeight: "900", letterSpacing: 0.9 },
  price: { color: "#F7F4EA", fontSize: 24, fontWeight: "900" },
  correctionRow: { marginTop: 13, minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  correctionTitle: { color: "#F7F4EA", fontSize: 14, fontWeight: "900" },
  correctionMeta: { color: "rgba(247,244,234,0.52)", fontSize: 11, marginTop: 3 },
  actions: { flexDirection: "row", gap: 10 },
  secondaryAction: { flex: 1, minHeight: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  secondaryActionText: { color: "#F7F4EA", fontSize: 14, fontWeight: "900" },
  primaryAction: { flex: 1.12, minHeight: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F2CD37" },
  primaryActionText: { color: "#101012", fontSize: 14, fontWeight: "900" },
  priceSignal: { color: "rgba(247,244,234,0.4)", fontSize: 10, textAlign: "center", marginTop: 11 },
  bulkGuidance: { position: "absolute", top: 112, alignSelf: "center", minWidth: 286, borderRadius: 20, paddingHorizontal: 17, paddingVertical: 12, backgroundColor: "rgba(16,16,18,0.76)", borderWidth: 1, borderColor: "rgba(242,205,55,0.35)" },
  bulkGuidanceEyebrow: { color: "#F2CD37", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  bulkGuidanceTitle: { color: "#F7F4EA", fontSize: 17, fontWeight: "900", marginTop: 3 },
  bulkGuidanceBody: { color: "rgba(247,244,234,0.58)", fontSize: 11, marginTop: 3 },
  bulkFigure: { position: "absolute", width: 140, height: 260 },
  bulkFigureImage: { width: 140, height: 250 },
  bulkFigureBox: { ...StyleSheet.absoluteFill, borderWidth: 3, borderColor: "#F2CD37", borderRadius: 18 },
  bulkBox: { position: "absolute", borderWidth: 3, borderColor: "#F2CD37", borderRadius: 18 },
  bulkBoxLabel: { position: "absolute", top: -13, left: -8, minWidth: 26, height: 26, borderRadius: 13, textAlign: "center", lineHeight: 26, color: "#101012", backgroundColor: "#F2CD37", fontSize: 12, fontWeight: "900" },
});
