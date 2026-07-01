import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { ViewfinderOverlay } from "./ViewfinderOverlay";
import { tap, success, warn } from "../lib/haptics";
import type { ScanMode } from "../lib/api";

const SET_ACCENT = "#F2CD37";
const MINIFIG_ACCENT = "#F2CD37";
const INK = "#F5F5F7";
const MUTED = "rgba(245,245,247,0.68)";

interface Props {
  enabled: boolean; // false while a result card is up
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  onCapture: (photoUri: string) => void;
  onPhotoPress: () => void;
  onManualPress: () => void;
}

export function CameraScanner({ enabled, mode, onModeChange, onCapture, onPhotoPress, onManualPress }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);
  const activeAccent = mode === "minifig" ? MINIFIG_ACCENT : SET_ACCENT;

  const handleCapturePress = async () => {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    tap();
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      success();
      if (photo?.uri) onCapture(photo.uri);
    } catch (e) {
      warn();
    } finally {
      // CameraScanner stays "scanning" until parent disables `enabled`,
      // which resets via the effect below.
    }
  };

  // Drive the pulse circle with RN's built-in Animated API
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pulseAnim, {
      toValue: scanning ? 1 : 0,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [scanning]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.2],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // When parent re-enables (after dismissing result), reset detector
  useEffect(() => {
    if (enabled) {
      setScanning(false);
    }
  }, [enabled]);

  if (!permission) return <View style={styles.black} />;
  if (mode === "set") {
    return (
      <View style={styles.setRoot}>
        <View style={styles.setModeSwitch}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "set" }}
            accessibilityLabel="Set number entry"
            style={[styles.setModePill, styles.setModePillActive]}
          >
            <Text style={[styles.setModeText, styles.setModeTextActive]}>Set</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            accessibilityLabel="Switch to minifigures and parts"
            style={styles.setModePill}
            onPress={() => onModeChange("minifig")}
          >
          <Text style={styles.setModeText}>Minifigs & Parts</Text>
          </Pressable>
        </View>
        <View style={styles.setPanel}>
          <Text style={styles.setTitle}>Set mode is manual only</Text>
          <Text style={styles.setBody}>
            Enter the LEGO set number to look it up. Camera scanning is disabled here.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter set number"
            onPress={onManualPress}
            style={styles.setButton}
            hitSlop={12}
          >
            <Text style={styles.setButtonText}>Enter set number</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>BrickVal needs the camera to scan minifigures and parts.</Text>
        <View style={styles.permActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Allow camera access" style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use photo from library"
            style={styles.permBtnSecondary}
            onPress={onPhotoPress}
          >
            <Text style={styles.permBtnSecondaryText}>Use photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
      />
      <ViewfinderOverlay
        pulse={0}
        scanning={scanning}
        mode={mode}
        onModeChange={onModeChange}
        showModeSwitch={enabled}
      />

      <View style={[styles.bottomBar, { bottom: Math.max(96, insets.bottom + 70) }]}>
        <View style={styles.leftStack}>
          <View style={styles.toolSpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use photo from library"
            onPress={() => {
              if (!enabled) return;
              tap();
              onPhotoPress();
            }}
            disabled={!enabled}
            style={[styles.photoBtn, !enabled && styles.photoBtnDisabled]}
            hitSlop={10}
          >
            <View style={styles.photoIconWrap}>
              <PhotoStackIcon color={enabled ? INK : MUTED} />
            </View>
            <View style={styles.photoCopy}>
              <Text style={[styles.photoText, !enabled && styles.photoTextDisabled]}>Use photo</Text>
              <Text style={[styles.photoHint, !enabled && styles.photoTextDisabled]}>From library</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.captureStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan minifigures and parts"
            onPress={handleCapturePress}
            style={styles.captureWrap}
            hitSlop={12}
          >
            <Animated.View
              style={[
                styles.pulse,
                {
                  borderColor: activeAccent,
                  backgroundColor: "rgba(242,205,55,0.12)",
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.captureCore}>
              <View style={styles.captureDot} />
            </View>
          </Pressable>
          <Text style={styles.captureLabel}>Tap to scan</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? "Turn light off" : "Turn light on"}
          accessibilityState={{ selected: torch }}
          onPress={() => setTorch((t) => !t)}
          style={styles.toolBtn}
          hitSlop={12}
        >
          <Text style={styles.toolLabel}>Light</Text>
          <Text style={[styles.toolHint, torch && { color: activeAccent }]}>
            {torch ? "on" : "off"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#101012" },
  setRoot: { flex: 1, backgroundColor: "#101012", alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 18 },
  setModeSwitch: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.34)",
    backgroundColor: "rgba(16,16,18,0.76)",
    padding: 4,
  },
  setModePill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  setModePillActive: { backgroundColor: SET_ACCENT },
  setModeText: {
    color: "rgba(247,244,234,0.68)",
    fontSize: 9,
    fontWeight: "900",
  },
  setModeTextActive: { color: "#101012" },
  permWrap: { flex: 1, backgroundColor: "#101012", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permTitle: { color: INK, fontSize: 24, fontWeight: "900" },
  permBody: { color: MUTED, fontSize: 15, textAlign: "center", lineHeight: 23 },
  permActions: { gap: 10, alignItems: "center", marginTop: 12 },
  permBtn: { minWidth: 180, backgroundColor: SET_ACCENT, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8 },
  permBtnText: { color: "#101012", fontWeight: "800", fontSize: 15 },
  permBtnSecondary: {
    minWidth: 180,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  permBtnSecondaryText: { color: INK, fontWeight: "800", fontSize: 15 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  leftStack: {
    width: 126,
    gap: 10,
  },
  toolBtn: {
    width: 126,
    height: 52,
    borderRadius: 8,
    backgroundColor: "rgba(16,16,18,0.72)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  toolSpacer: {
    width: 126,
    height: 52,
  },
  modeStatus: {
    backgroundColor: "rgba(142,209,255,0.1)",
    borderColor: "rgba(142,209,255,0.34)",
  },
  toolLabel: { color: INK, fontSize: 12, fontWeight: "900", textAlign: "center" },
  toolHint: { color: MUTED, fontSize: 10, fontWeight: "700" },
  captureStack: { alignItems: "center", gap: 8 },
  captureWrap: { width: 78, height: 78, alignItems: "center", justifyContent: "center" },
  pulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  captureCore: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(247,244,234,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#101012",
    opacity: 0.72,
  },
  captureLabel: { color: INK, fontSize: 12, fontWeight: "900" },
  photoBtn: {
    height: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    backgroundColor: "rgba(247,244,234,0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  photoBtnDisabled: { opacity: 0.45 },
  photoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,244,234,0.08)",
  },
  photoCopy: { flex: 1, minWidth: 0 },
  photoText: { color: INK, fontSize: 14, fontWeight: "900", lineHeight: 18 },
  photoHint: { color: MUTED, fontSize: 10, fontWeight: "700", lineHeight: 12, marginTop: 1 },
  photoTextDisabled: { color: MUTED },
  setPanel: {
    width: "100%",
    maxWidth: 340,
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(16,16,18,0.88)",
    padding: 16,
  },
  setTitle: {
    color: "#fff3cf",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  setBody: {
    color: INK,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  setButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: SET_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  setButtonText: {
    color: "#101012",
    fontSize: 14,
    fontWeight: "900",
  },
});

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
