import { type ReactNode, useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScanIntent } from "./ScanIntentPicker";

const GOLD = "#F2CD37";
const INK = "#F7F4EA";
const MUTED = "rgba(247,244,234,0.66)";
type AutoScanPreviewState = "scanning" | "holdSteady" | "processing" | "matchFound";

interface Props {
  enabled: boolean;
  autoCaptureEnabled?: boolean;
  scanIntent: ScanIntent;
  onCapture: (photoUri: string) => void;
  onPhotoPress: () => void;
  onManualPress: () => void;
  cameraPreview?: ReactNode;
  permissionGranted?: boolean;
  autoScanPreviewState?: AutoScanPreviewState;
}

export function CameraScanner({
  enabled,
  scanIntent,
  onCapture,
  onPhotoPress,
  cameraPreview,
  permissionGranted = true,
  autoScanPreviewState,
}: Props) {
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState(false);
  const isSingleScan = scanIntent === "single";
  const isProcessing = autoScanPreviewState === "processing";
  const pillText = getPillText({
    enabled,
    isSingleScan,
    isProcessing,
    previewState: autoScanPreviewState,
  });

  useEffect(() => {
    if (enabled) setTorch(false);
  }, [enabled]);

  if (!permissionGranted) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
          <Text style={styles.permBody}>BrickVal needs the camera to scan minifigures.</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={StyleSheet.absoluteFill}>{cameraPreview ?? <View style={styles.black} />}</View>
      <View pointerEvents="none" style={styles.softVignette} />

      <View
        style={[
          styles.statusPill,
          { bottom: isSingleScan ? Math.max(112, insets.bottom + 82) : Math.max(210, insets.bottom + 176) },
        ]}
      >
        <View style={[styles.statusDot, (isProcessing || autoScanPreviewState === "holdSteady" || autoScanPreviewState === "matchFound") && styles.statusDotActive]} />
        <Text style={styles.statusPillText}>{pillText}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={torch ? "Turn light off" : "Turn light on"}
        accessibilityState={{ selected: torch }}
        onPress={() => {
          setTorch((current) => !current);
        }}
        style={[styles.flashButton, { top: Math.max(52, insets.top + 22) }, torch && styles.roundToolActive]}
        hitSlop={12}
      >
        <SymbolView
          name={{ ios: torch ? "bolt.fill" : "bolt.slash", android: torch ? "flash_on" : "flash_off", web: torch ? "flash_on" : "flash_off" }}
          size={25}
          type="hierarchical"
          tintColor={torch ? "#101012" : INK}
          fallback={<Text style={[styles.symbolFallback, torch && styles.symbolFallbackActive]}>*</Text>}
        />
      </Pressable>

      <View
        style={[
          styles.bottomBar,
          isSingleScan && styles.singleBottomBar,
          { bottom: Math.max(112, insets.bottom + 82) },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use photo from library"
          onPress={() => {
            if (!enabled) return;
            onPhotoPress();
          }}
          disabled={!enabled}
          style={[styles.roundTool, !enabled && styles.disabled]}
          hitSlop={10}
        >
          <SymbolView
            name={{ ios: "photo.on.rectangle", android: "photo_library", web: "photo_library" }}
            size={28}
            type="hierarchical"
            tintColor={enabled ? INK : MUTED}
            fallback={<Text style={styles.symbolFallback}>+</Text>}
          />
        </Pressable>

        {!isSingleScan ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture LEGO photo"
              onPress={() => {
                onCapture("storybook://camera-scan.jpg");
              }}
              disabled={!enabled}
              style={[styles.captureButton, !enabled && styles.disabled]}
              hitSlop={10}
            >
              <SymbolView
                name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }}
                size={36}
                type="hierarchical"
                tintColor="#101012"
                fallback={<Text style={styles.captureFallback}>+</Text>}
              />
            </Pressable>

            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.captureSpacer} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function getPillText({
  enabled,
  isSingleScan,
  isProcessing,
  previewState,
}: {
  enabled: boolean;
  isSingleScan: boolean;
  isProcessing: boolean;
  previewState?: AutoScanPreviewState;
}) {
  if (!isSingleScan) return isProcessing || !enabled ? "Counting value..." : "Frame bulk minifigs, then capture";
  if (previewState === "matchFound") return "Match found";
  if (!enabled || isProcessing) return "Match found";
  if (previewState === "holdSteady") return "Hold steady";
  return "Scanning...";
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#101012" },
  softVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  permWrap: {
    flex: 1,
    backgroundColor: "#101012",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permTitle: { color: INK, fontSize: 24, fontWeight: "900" },
  permBody: { color: MUTED, fontSize: 15, textAlign: "center", lineHeight: 23 },
  statusPill: {
    position: "absolute",
    alignSelf: "center",
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MUTED,
  },
  statusDotActive: {
    backgroundColor: GOLD,
  },
  statusPillText: {
    color: INK,
    fontSize: 14,
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  singleBottomBar: {
    justifyContent: "flex-start",
  },
  roundTool: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(16,16,18,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundToolActive: {
    backgroundColor: GOLD,
    borderColor: "rgba(242,205,55,0.78)",
  },
  flashButton: {
    position: "absolute",
    left: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(16,16,18,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    borderColor: "rgba(247,244,234,0.94)",
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GOLD,
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  captureSpacer: {
    width: 62,
    height: 62,
  },
  disabled: {
    opacity: 0.45,
  },
  symbolFallback: {
    color: INK,
    fontSize: 24,
    fontWeight: "900",
  },
  symbolFallbackActive: {
    color: "#101012",
  },
  captureFallback: {
    color: "#101012",
    fontSize: 30,
    fontWeight: "900",
  },
});
