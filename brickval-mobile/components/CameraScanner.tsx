import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { ViewfinderOverlay } from "./ViewfinderOverlay";
import { tap, success, warn } from "../lib/haptics";
import type { ScanMode } from "../lib/api";

const SET_ACCENT = "#f2c94c";
const MINIFIG_ACCENT = "#8ed1ff";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.68)";

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
  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>BrickVal needs the camera to scan LEGO sets, minifigures, and parts.</Text>
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

      <View style={styles.bottomBar}>
        <View style={styles.leftStack}>
          {mode === "set" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Got a set number? Enter it manually"
              onPress={onManualPress}
              style={styles.toolBtn}
              hitSlop={12}
            >
              <Text style={styles.toolLabel}>Have set number?</Text>
              <Text style={styles.toolHint}>Type it here</Text>
            </Pressable>
          ) : (
            <View style={styles.toolSpacer} />
          )}

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
            accessibilityLabel={mode === "minifig" ? "Scan minifigures and parts" : "Scan LEGO set"}
            onPress={handleCapturePress}
            style={styles.captureWrap}
            hitSlop={12}
          >
            <Animated.View
              style={[
                styles.pulse,
                {
                  borderColor: activeAccent,
                  backgroundColor: mode === "minifig" ? "rgba(142,209,255,0.12)" : "rgba(242,201,76,0.12)",
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
    bottom: 42,
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
