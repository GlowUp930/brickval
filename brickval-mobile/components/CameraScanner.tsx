import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  onManualPress: () => void;
}

export function CameraScanner({ enabled, mode, onModeChange, onCapture, onManualPress }: Props) {
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
        <Text style={styles.permBody}>BrickVal needs the camera to scan LEGO sets and minifigures.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Allow camera access" style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow camera</Text>
        </Pressable>
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

        <View style={styles.captureStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === "minifig" ? "Scan minifigure" : "Scan LEGO set"}
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
  permBtn: { backgroundColor: SET_ACCENT, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 8, marginTop: 12 },
  permBtnText: { color: "#101012", fontWeight: "800", fontSize: 15 },
  bottomBar: {
    position: "absolute",
    bottom: 42,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
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
});
