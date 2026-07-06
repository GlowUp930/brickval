import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { tap, warn } from "../lib/haptics";
import type { ScanIntent } from "./ScanIntentPicker";

const GOLD = "#F2CD37";
const GREEN = "#02C400";
const INK = "#F7F4EA";
const MUTED = "rgba(247,244,234,0.66)";

interface Props {
  enabled: boolean;
  scanIntent: ScanIntent;
  onCapture: (photoUri: string) => void;
  onPhotoPress: () => void;
  onManualPress: () => void;
}

export function CameraScanner({
  enabled,
  scanIntent,
  onCapture,
  onPhotoPress,
  onManualPress,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);

  const capturePhoto = async () => {
    if (!enabled || !cameraRef.current || scanning) return;
    tap();
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.72,
        skipProcessing: true,
      });
      if (photo?.uri) onCapture(photo.uri);
    } catch {
      warn();
      setScanning(false);
    }
  };

  useEffect(() => {
    if (enabled) setScanning(false);
  }, [enabled]);

  const pillText =
    !enabled || scanning
      ? "Counting value..."
      : scanIntent === "bulk"
        ? "Frame bulk minifigs, then capture"
        : "Frame a minifig, then capture";

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter set number manually"
            style={styles.permBtnSecondary}
            onPress={onManualPress}
          >
            <Text style={styles.permBtnSecondaryText}>Enter set number</Text>
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

      <View pointerEvents="none" style={styles.softVignette} />

      <View style={[styles.statusPill, { bottom: Math.max(210, insets.bottom + 176) }]}>
        <View style={[styles.statusDot, scanning && styles.statusDotActive]} />
        <Text style={styles.statusPillText}>{pillText}</Text>
      </View>

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

      <View style={[styles.bottomBar, { bottom: Math.max(112, insets.bottom + 82) }]}>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture LEGO photo"
          onPress={() => {
            void capturePhoto();
          }}
          disabled={!enabled || scanning}
          style={[styles.captureButton, (!enabled || scanning) && styles.disabled]}
          hitSlop={10}
        >
          <SymbolView
            name="camera.fill"
            size={36}
            type="hierarchical"
            tintColor={INK}
            fallback={<CameraGlyph color={INK} />}
          />
        </Pressable>

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
      </View>
    </View>
  );
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
    backgroundColor: GREEN,
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
    backgroundColor: GREEN,
    borderColor: "rgba(2,196,0,0.78)",
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
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
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
