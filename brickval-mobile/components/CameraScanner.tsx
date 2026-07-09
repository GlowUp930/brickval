import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { tap, warn } from "../lib/haptics";
import { useStabilityDetector } from "../lib/stability";
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
  autoCaptureEnabled = true,
  scanIntent,
  onCapture,
  onPhotoPress,
  onManualPress,
  cameraPreview,
  permissionGranted,
  autoScanPreviewState,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showMoveCloser, setShowMoveCloser] = useState(false);
  const isSingleScan = scanIntent === "single";
  const isPreview = Boolean(cameraPreview || autoScanPreviewState || permissionGranted !== undefined);
  const hasCameraPermission = permissionGranted ?? permission?.granted ?? false;

  const capturePhoto = useCallback(async (source: "manual" | "auto" = "manual") => {
    if (!enabled || scanning) return;
    if (!cameraPreview && (!cameraRef.current || !cameraReady)) return;
    if (source === "manual") tap();
    setScanning(true);
    try {
      if (cameraPreview) {
        onCapture("storybook://camera-scan.jpg");
        return;
      }
      const camera = cameraRef.current;
      if (!camera) {
        setScanning(false);
        return;
      }
      const photo = await camera.takePictureAsync({
        quality: 0.72,
        skipProcessing: false,
        shutterSound: source === "manual",
      });
      if (photo?.uri) onCapture(photo.uri);
    } catch {
      warn();
      setScanning(false);
    }
  }, [cameraPreview, cameraReady, enabled, onCapture, scanning]);

  const autoStabilityEnabled =
    enabled && autoCaptureEnabled && isSingleScan && cameraReady && !scanning && !isPreview;
  const { pulse } = useStabilityDetector(autoStabilityEnabled, () => {
    void capturePhoto("auto");
  });

  useEffect(() => {
    if (enabled) setScanning(false);
  }, [enabled]);

  useEffect(() => {
    setShowMoveCloser(false);
    if (!autoStabilityEnabled) return;

    const timer = setTimeout(() => {
      setShowMoveCloser(true);
    }, 5200);

    return () => clearTimeout(timer);
  }, [autoStabilityEnabled]);

  useEffect(() => {
    if (pulse > 0.2) setShowMoveCloser(false);
  }, [pulse]);

  const previewPulse =
    autoScanPreviewState === "holdSteady" ? 0.72 : autoScanPreviewState === "processing" ? 1 : 0;
  const autoPulse = isPreview ? previewPulse : pulse;
  const isProcessing = scanning || autoScanPreviewState === "processing";
  const statusActive = isProcessing || autoPulse > 0.2 || autoScanPreviewState === "matchFound";
  const pillText = getPillText({
    enabled,
    isSingleScan,
    cameraReady: cameraReady || isPreview,
    isProcessing,
    pulse: autoPulse,
    showMoveCloser,
    previewState: autoScanPreviewState,
  });

  if (!permission && permissionGranted === undefined) return <View style={styles.black} />;

  if (!hasCameraPermission) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>BrickVal needs the camera to scan minifigures.</Text>
        <View style={styles.permActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
            style={styles.permBtn}
            onPress={requestPermission}
          >
            <Text style={styles.permBtnText}>Allow camera</Text>
          </Pressable>
          {!isSingleScan ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter set number manually"
              style={styles.permBtnSecondary}
              onPress={onManualPress}
            >
              <Text style={styles.permBtnSecondaryText}>Enter set number</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {cameraPreview ? (
        <View style={StyleSheet.absoluteFill}>{cameraPreview}</View>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          animateShutter={false}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => {
            setCameraReady(false);
            warn();
          }}
        />
      )}

      <View pointerEvents="none" style={styles.softVignette} />

      <View
        style={[
          styles.statusPill,
          { bottom: isSingleScan ? Math.max(112, insets.bottom + 82) : Math.max(210, insets.bottom + 176) },
        ]}
      >
        <View style={[styles.statusDot, statusActive && styles.statusDotActive]} />
        <Text style={styles.statusPillText}>{pillText}</Text>
      </View>

      {enabled && !scanning && scanIntent === "bulk" ? (
        <View pointerEvents="none" style={[styles.bulkTips, { top: insets.top + 92 }]}>
          <Text style={styles.bulkTipsTitle}>Bulk scan setup</Text>
          <Text style={styles.bulkTipsText}>Space figures apart · Good lighting · Full figure visible</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={torch ? "Turn light off" : "Turn light on"}
        accessibilityState={{ selected: torch }}
        onPress={() => {
          tap();
          setTorch((current) => !current);
        }}
        style={[styles.flashButton, { top: insets.top + 22 }, torch && styles.roundToolActive]}
        hitSlop={12}
      >
        <SymbolView
          name={torch ? "bolt.fill" : "bolt.slash"}
          size={25}
          type="hierarchical"
          tintColor={torch ? "#101012" : INK}
          fallback={<Text style={[styles.flashFallback, torch && styles.flashFallbackActive]}>*</Text>}
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
            tap();
            onPhotoPress();
          }}
          disabled={!enabled}
          style={[styles.roundTool, !enabled && styles.disabled]}
          hitSlop={10}
        >
          <SymbolView
            name="photo.on.rectangle"
            size={28}
            type="hierarchical"
            tintColor={enabled ? INK : MUTED}
            fallback={<PhotoStackIcon color={enabled ? INK : MUTED} />}
          />
        </Pressable>

        {!isSingleScan ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture LEGO photo"
            onPress={() => {
              void capturePhoto("manual");
            }}
            disabled={!enabled || scanning || (!cameraPreview && !cameraReady)}
            style={[styles.captureButton, (!enabled || scanning || (!cameraPreview && !cameraReady)) && styles.disabled]}
            hitSlop={10}
          >
            <SymbolView
              name="camera.fill"
              size={36}
              type="hierarchical"
              tintColor="#101012"
              fallback={<CameraGlyph color="#101012" />}
            />
          </Pressable>
        ) : null}

        {!isSingleScan ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter LEGO set number manually"
            onPress={() => {
              if (!enabled) return;
              tap();
              onManualPress();
            }}
            disabled={!enabled}
            style={[styles.manualSetButton, !enabled && styles.disabled]}
            hitSlop={10}
          >
            <SymbolView
              name="number.square"
              size={20}
              type="hierarchical"
              tintColor="#101012"
              fallback={<Text style={styles.manualSetIcon}>#</Text>}
            />
            <Text style={styles.manualSetText}>Set #</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getPillText({
  enabled,
  isSingleScan,
  cameraReady,
  isProcessing,
  pulse,
  showMoveCloser,
  previewState,
}: {
  enabled: boolean;
  isSingleScan: boolean;
  cameraReady: boolean;
  isProcessing: boolean;
  pulse: number;
  showMoveCloser: boolean;
  previewState?: AutoScanPreviewState;
}) {
  if (!isSingleScan) return isProcessing || !enabled ? "Counting value..." : "Frame bulk minifigs, then capture";
  if (previewState === "matchFound") return "Match found";
  if (!enabled || isProcessing) return "Match found";
  if (!cameraReady) return "Starting camera...";
  if (pulse > 0.25) return "Hold steady";
  if (showMoveCloser) return "Move closer";
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
  permActions: { gap: 10, alignItems: "center", marginTop: 12 },
  permBtn: {
    minWidth: 190,
    backgroundColor: GOLD,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  permBtnText: { color: "#101012", fontWeight: "900", fontSize: 15 },
  permBtnSecondary: {
    minWidth: 190,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  permBtnSecondaryText: { color: INK, fontWeight: "800", fontSize: 15 },
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
  bulkTips: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: 330,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(242,205,55,0.32)",
    backgroundColor: "rgba(6,7,9,0.72)",
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    gap: 4,
  },
  bulkTipsTitle: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  bulkTipsText: {
    color: INK,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
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
    right: 22,
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
  manualSetButton: {
    minWidth: 86,
    height: 62,
    borderRadius: 31,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
  },
  manualSetIcon: {
    color: "#101012",
    fontSize: 18,
    fontWeight: "900",
  },
  manualSetText: {
    color: "#101012",
    fontSize: 16,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.45,
  },
  flashFallback: {
    color: INK,
    fontSize: 22,
    fontWeight: "900",
  },
  flashFallbackActive: {
    color: "#101012",
  },
});

function CameraGlyph({ color }: { color: string }) {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Rect x={6} y={11} width={24} height={17} rx={5} fill="none" stroke={color} strokeWidth={2.7} />
      <Path d="M13 11l2.2-3h5.6L23 11" fill="none" stroke={color} strokeWidth={2.7} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={18} cy={19.5} r={5.2} fill="none" stroke={color} strokeWidth={2.7} />
    </Svg>
  );
}

function PhotoStackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Rect x="2" y="3" width="14" height="14" rx="3" stroke={color} strokeWidth="1.8" opacity="0.55" />
      <Rect x="6" y="7" width="14" height="14" rx="3" fill="none" stroke={color} strokeWidth="1.8" />
      <Circle cx="11" cy="11" r="1.7" fill={color} />
      <Path
        d="M7 18L10.2 14.6L12.8 17L15.2 14.8L19 18H7Z"
        fill={color}
        opacity="0.92"
      />
    </Svg>
  );
}
