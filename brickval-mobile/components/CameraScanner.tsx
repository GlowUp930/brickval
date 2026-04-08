import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text, Animated } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ViewfinderOverlay } from "./ViewfinderOverlay";
import { useStabilityDetector } from "../lib/stability";
import { tap, success, warn } from "../lib/haptics";

const GOLD = "#f5c518";

interface Props {
  enabled: boolean; // false while a result card is up
  onCapture: (photoUri: string) => void;
  onManualPress: () => void;
}

export function CameraScanner({ enabled, onCapture, onManualPress }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleStable = async () => {
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

  const { reset, pulse } = useStabilityDetector(enabled && !scanning, handleStable);

  // Drive the pulse circle with RN's built-in Animated API
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pulseAnim, {
      toValue: pulse,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [pulse]);

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
      reset();
    }
  }, [enabled]);

  if (!permission) return <View style={styles.black} />;
  if (!permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>Brickvalue uses your camera to scan LEGO sets and look up their market prices.</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
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
      <ViewfinderOverlay pulse={pulse} scanning={scanning} />

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Pressable onPress={onManualPress} style={styles.iconBtn} hitSlop={12}>
          <Text style={styles.icon}>⌨</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
          pointerEvents="none"
        />

        <Pressable onPress={() => setTorch((t) => !t)} style={styles.iconBtn} hitSlop={12}>
          <Text style={styles.icon}>{torch ? "⚡" : "⚡︎"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#0d0d0f" },
  permWrap: { flex: 1, backgroundColor: "#0d0d0f", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permTitle: { color: "white", fontSize: 24, fontWeight: "900" },
  permBody: { color: "rgba(255,255,255,0.6)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  permBtn: { backgroundColor: GOLD, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, marginTop: 12 },
  permBtnText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
  bottomBar: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { color: "white", fontSize: 20 },
  pulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: "rgba(245,197,24,0.12)",
  },
});
