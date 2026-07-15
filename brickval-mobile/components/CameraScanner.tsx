import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  type CameraRef,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";
import { SymbolView } from "expo-symbols";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { tap, warn } from "../lib/haptics";
import { useStabilityDetector } from "../lib/stability";
import { getScannerPillText, type AutoScanPreviewState } from "../lib/scanner-status";
import {
  createAutoScanSession,
  observeAutoScanFrame,
  type MinifigureObservation,
} from "../lib/auto-scan";
import type { ScanIntent } from "./ScanIntentPicker";
import { useTheme } from "../lib/ThemeProvider";
import { prepareMinifigureCapture } from "../lib/scan-capture";
import { useMinifigureDetector } from "../lib/minifigure-detector";
import { detectHostedMinifigures } from "../lib/api";
import { prepareHostedDetectionSample } from "../lib/hosted-detection-sample";
import { mapDetectionSampleBoundingBox } from "../lib/scan-image";
import {
  completeHostedDetection,
  createHostedDetectionSchedule,
  shouldSampleHostedDetection,
  startHostedDetection,
} from "../lib/hosted-detection-scheduler";

const INK = "#F7F4EA";
const MUTED = "rgba(247,244,234,0.66)";

interface Props {
  enabled: boolean;
  autoCaptureEnabled?: boolean;
  scanIntent: ScanIntent;
  onCapture: (photoUri: string, context?: CameraCaptureContext) => void;
  onPhotoPress: () => void;
  cameraPreview?: ReactNode;
  permissionGranted?: boolean;
  autoScanPreviewState?: AutoScanPreviewState;
  detectorReady?: boolean;
  minifigureObservations?: MinifigureObservation[];
}

export interface CameraCaptureContext {
  observations: MinifigureObservation[];
  autoCaptured?: boolean;
  detectorModelVersion?: string;
  detectMs?: number;
}

export function CameraScanner({
  enabled,
  autoCaptureEnabled = true,
  scanIntent,
  onCapture,
  onPhotoPress,
  cameraPreview,
  permissionGranted,
  autoScanPreviewState,
  detectorReady,
  minifigureObservations,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const { accent } = useTheme();
  const insets = useSafeAreaInsets();
  const permission = useCameraPermission();
  const photoOutput = usePhotoOutput({ quality: 0.72, qualityPrioritization: "speed" });
  const detectorFeed = useMinifigureDetector();
  const hostedFeatureEnabled = Constants.expoConfig?.extra?.hostedSmartScanEnabled !== false;
  const [hostedAvailable, setHostedAvailable] = useState(hostedFeatureEnabled);
  const [hostedObservations, setHostedObservations] = useState<MinifigureObservation[]>([]);
  const [hostedModelVersion, setHostedModelVersion] = useState<string>();
  const [hostedDetectMs, setHostedDetectMs] = useState<number>();
  const hostedScheduleRef = useRef(createHostedDetectionSchedule());
  const hostedFailureCountRef = useRef(0);
  const captureInProgressRef = useRef(false);
  const hostedSamplingEnabled =
    hostedFeatureEnabled &&
    detectorReady === undefined &&
    minifigureObservations === undefined &&
    !detectorFeed.ready;
  const effectiveDetectorReady = detectorReady ?? (detectorFeed.ready || hostedAvailable);
  const observations = minifigureObservations ?? (detectorFeed.ready ? detectorFeed.observations : hostedObservations);
  const cameraOutputs = useMemo(
    () => detectorFeed.ready ? [photoOutput, detectorFeed.frameOutput] : [photoOutput],
    [detectorFeed.frameOutput, detectorFeed.ready, photoOutput]
  );
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showMoveCloser, setShowMoveCloser] = useState(false);
  const autoScanSessionRef = useRef(createAutoScanSession());
  const [autoScanSession, setAutoScanSession] = useState(autoScanSessionRef.current);
  const isSingleScan = scanIntent === "single";
  const isPreview = Boolean(cameraPreview || autoScanPreviewState || permissionGranted !== undefined);
  const hasCameraPermission = permissionGranted ?? permission.hasPermission;

  const { isStable: cameraIsStable } = useStabilityDetector(
    enabled && cameraReady && hostedSamplingEnabled && !scanning && !isPreview,
    () => undefined
  );

  useEffect(() => {
    if (cameraIsStable) return;
    hostedScheduleRef.current = createHostedDetectionSchedule();
    setHostedObservations([]);
  }, [cameraIsStable]);

  useEffect(() => {
    if (
      !hostedSamplingEnabled ||
      !hostedAvailable ||
      !enabled ||
      !cameraReady ||
      scanning ||
      !isSingleScan ||
      isPreview
    ) return;

    const sample = async () => {
      const now = Date.now();
      if (!shouldSampleHostedDetection(hostedScheduleRef.current, { now, cameraStable: cameraIsStable })) return;
      if (captureInProgressRef.current) return;
      hostedScheduleRef.current = startHostedDetection(hostedScheduleRef.current, now);
      try {
        const photo = await photoOutput.capturePhotoToFile(
          { flashMode: "off", enableShutterSound: false },
          {}
        );
        if (!photo.filePath) return;
        const sample = await prepareHostedDetectionSample(`file://${photo.filePath}`, "single");
        const result = await detectHostedMinifigures(sample.uri);
        if (result.status === "cap-reached") {
          setHostedAvailable(false);
          setHostedObservations([]);
          return;
        }
        setHostedObservations(result.observations.map((observation) => ({
          ...observation,
          detectionFrameCoverage:
            observation.boundingBox.width * observation.boundingBox.height,
          boundingBox: mapDetectionSampleBoundingBox(observation.boundingBox, sample.plan),
        })));
        setHostedModelVersion(result.detectorModelVersion);
        setHostedDetectMs(result.detectMs);
        hostedFailureCountRef.current = 0;
      } catch {
        hostedFailureCountRef.current += 1;
        if (hostedFailureCountRef.current >= 3) setHostedAvailable(false);
        setHostedObservations([]);
      } finally {
        hostedScheduleRef.current = completeHostedDetection(hostedScheduleRef.current);
      }
    };

    const timer = setInterval(() => void sample(), 160);
    void sample();
    return () => clearInterval(timer);
  }, [cameraIsStable, cameraReady, enabled, hostedAvailable, hostedSamplingEnabled, isPreview, isSingleScan, photoOutput, scanning]);

  useEffect(() => {
    void photoOutput.prepareSettings([
      { flashMode: "off", enableShutterSound: false },
      { flashMode: "off", enableShutterSound: true },
    ]);
  }, [photoOutput]);

  useEffect(() => {
    if (!enabled || !autoCaptureEnabled || !isSingleScan || !effectiveDetectorReady) {
      autoScanSessionRef.current = createAutoScanSession();
      setAutoScanSession(autoScanSessionRef.current);
      return;
    }
    autoScanSessionRef.current = observeAutoScanFrame(
      autoScanSessionRef.current,
      observations
    );
    setAutoScanSession(autoScanSessionRef.current);
  }, [autoCaptureEnabled, effectiveDetectorReady, enabled, isSingleScan, observations]);

  const capturePhoto = useCallback(async (source: "manual" | "auto" = "manual") => {
    if (!enabled || scanning || captureInProgressRef.current) return;
    if (!cameraPreview && (!cameraRef.current || !cameraReady)) return;
    if (source === "manual") tap();
    captureInProgressRef.current = true;
    setScanning(true);
    try {
      if (cameraPreview) {
        onCapture("storybook://camera-scan.jpg", { observations });
        return;
      }
      const photo = await photoOutput.capturePhotoToFile(
        { flashMode: "off", enableShutterSound: source === "manual" },
        {}
      );
      if (photo.filePath) {
        const photoUri = `file://${photo.filePath}`;
        let captureObservations = observations;
        if (source === "manual" && scanIntent === "bulk" && hostedSamplingEnabled && hostedAvailable) {
          try {
            const sample = await prepareHostedDetectionSample(photoUri, "bulk");
            const detected = await detectHostedMinifigures(sample.uri);
            if (detected.status === "available") captureObservations = detected.observations;
            else setHostedAvailable(false);
          } catch {
            captureObservations = [];
          }
        }
        const observation = source === "auto" ? captureObservations[0] : null;
        const preparedUri = observation
          ? await prepareMinifigureCapture(photoUri, observation.boundingBox)
          : photoUri;
        onCapture(preparedUri, {
          observations: captureObservations,
          autoCaptured: source === "auto",
          detectorModelVersion: detectorFeed.ready ? "native-litert-v1" : hostedModelVersion,
          detectMs: hostedDetectMs,
        });
      }
    } catch {
      captureInProgressRef.current = false;
      warn();
      setScanning(false);
    }
  }, [cameraPreview, cameraReady, detectorFeed.ready, enabled, hostedAvailable, hostedDetectMs, hostedModelVersion, hostedSamplingEnabled, observations, onCapture, photoOutput, scanIntent, scanning]);

  const autoStabilityEnabled =
    enabled &&
    autoCaptureEnabled &&
    isSingleScan &&
    effectiveDetectorReady &&
    autoScanSession.phase === "detected" &&
    cameraReady &&
    !scanning &&
    !isPreview;
  const { pulse } = useStabilityDetector(autoStabilityEnabled, () => {
    void capturePhoto("auto");
  });

  useEffect(() => {
    if (enabled) {
      captureInProgressRef.current = false;
      setScanning(false);
    }
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
  const statusActive =
    isProcessing ||
    autoPulse > 0.2 ||
    autoScanPreviewState === "matchFound" ||
    (!isSingleScan && effectiveDetectorReady && observations.length > 0);
  const pillText = getScannerPillText({
    enabled,
    isSingleScan,
    cameraReady: cameraReady || isPreview,
    isProcessing,
    pulse: autoPulse,
    showMoveCloser,
    previewState: autoScanPreviewState,
  });

  const livePillText = !isPreview && isSingleScan
    ? autoScanSession.blockReason === "multiple"
      ? "One minifigure at a time"
      : autoScanSession.blockReason === "partial"
        ? "Show the complete minifigure"
        : !effectiveDetectorReady && autoCaptureEnabled
          ? "Smart scan unavailable"
          : observations.length === 1 && autoScanSession.phase === "searching"
            ? "Minifigure detected"
          : autoScanSession.phase === "detected" && autoPulse <= 0.25
            ? "Minifigure detected"
            : pillText
    : !isPreview && !isSingleScan && effectiveDetectorReady && observations.length > 0
      ? observations.length > 40
        ? `40 ready · ${observations.length - 40} for next scan`
        : `${observations.length} minifigure${observations.length === 1 ? "" : "s"} detected`
      : pillText;

  if (!hasCameraPermission) {
    return (
      <View style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>BrickVal needs the camera to scan minifigures.</Text>
        <View style={styles.permActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Allow camera access"
          style={[styles.permBtn, { backgroundColor: accent.primary }]}
            onPress={() => void permission.requestPermission()}
          >
            <Text style={styles.permBtnText}>Allow camera</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {cameraPreview ? (
        <View style={StyleSheet.absoluteFill}>{cameraPreview}</View>
      ) : (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device="back"
          isActive={enabled}
          outputs={cameraOutputs}
          torchMode={torch ? "on" : "off"}
          enableNativeTapToFocusGesture
          onStarted={() => setCameraReady(true)}
          onStopped={() => setCameraReady(false)}
          onError={() => {
            setCameraReady(false);
            warn();
          }}
        />
      )}

      <View pointerEvents="none" style={styles.softVignette} />

      {isSingleScan && observations.length === 1 ? (
        <DetectionBox observation={observations[0]} ready={autoScanSession.phase === "detected"} />
      ) : null}
      {!isSingleScan ? observations.map((observation, index) => (
        <DetectionBox
          key={observation.regionId}
          observation={observation}
          ready={index < 40}
          overflow={index >= 40}
          label={index >= 40 ? "Next scan" : `${index + 1}`}
        />
      )) : null}

      <View
        style={[
          styles.statusPill,
          { bottom: isSingleScan ? Math.max(112, insets.bottom + 82) : Math.max(210, insets.bottom + 176) },
        ]}
      >
        <View style={[styles.statusDot, statusActive && { backgroundColor: accent.primary }]} />
        <Text style={styles.statusPillText}>{livePillText}</Text>
      </View>

      {enabled && !scanning && scanIntent === "bulk" ? (
        <View pointerEvents="none" style={[styles.bulkTips, { top: insets.top + 92 }]}>
          <Text style={[styles.bulkTipsTitle, { color: accent.primary }]}>Bulk scan setup</Text>
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
        style={[styles.flashButton, { top: insets.top + 22 }, torch && { backgroundColor: accent.primary, borderColor: accent.pressed }]}
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
            style={[
              styles.captureButton,
              { backgroundColor: accent.primary, shadowColor: accent.primary },
              (!enabled || scanning || (!cameraPreview && !cameraReady)) && styles.disabled,
            ]}
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

      </View>
    </View>
  );
}

function DetectionBox({
  observation,
  ready,
  overflow = false,
  label,
}: {
  observation: MinifigureObservation;
  ready: boolean;
  overflow?: boolean;
  label?: string;
}) {
  const box = observation.boundingBox;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.detectBox,
        ready && styles.detectBoxReady,
        overflow && styles.detectBoxOverflow,
        {
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
        },
      ]}
    >
      <Text style={[styles.detectBoxLabel, overflow && styles.detectBoxLabelOverflow]}>
        {label ?? (ready ? "Minifigure detected" : "Checking")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#101012" },
  detectBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(242,205,55,0.72)",
    borderRadius: 18,
  },
  detectBoxReady: {
    borderColor: "#F2CD37",
    borderWidth: 3,
  },
  detectBoxOverflow: {
    borderColor: "#F97316",
    borderStyle: "dashed",
  },
  detectBoxLabel: {
    position: "absolute",
    top: -29,
    left: -2,
    borderRadius: 10,
    backgroundColor: "rgba(16,16,18,0.82)",
    color: INK,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  detectBoxLabelOverflow: {
    color: "#F97316",
  },
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
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  singleBottomBar: {
    justifyContent: "flex-start",
  },
  roundTool: {
    position: "absolute",
    left: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(16,16,18,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  flashButton: {
    position: "absolute",
    left: 22,
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
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
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
