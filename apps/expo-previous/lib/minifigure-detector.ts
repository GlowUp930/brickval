import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";
import { type HybridObject, NitroModules } from "react-native-nitro-modules";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  type CameraFrameOutput,
  type Frame,
  useFrameOutput,
} from "react-native-vision-camera";
import type { MinifigureObservation } from "./auto-scan";

interface NativeMinifigureObservation {
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fullyVisible: boolean;
  regionId: string;
}

/** Native Nitro contract implemented by the bundled LiteRT detector module. */
interface MinifigureDetector extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  readonly isReady: boolean;
  detect(frame: Frame): NativeMinifigureObservation[];
}

export interface MinifigureDetectorFeed {
  ready: boolean;
  observations: MinifigureObservation[];
  frameOutput: CameraFrameOutput;
}

export function useMinifigureDetector(): MinifigureDetectorFeed {
  const detector = useMemo(() => {
    if (!NitroModules.hasHybridObject("MinifigureDetector")) return null;
    return NitroModules.createHybridObject<MinifigureDetector>("MinifigureDetector");
  }, []);
  const [observations, setObservations] = useState<MinifigureObservation[]>([]);
  const lastProcessedTimestamp = useSharedValue(0);
  const receiveObservations = useCallback((items: NativeMinifigureObservation[], timestamp: number) => {
    setObservations(items.map((item) => ({
      confidence: item.confidence,
      boundingBox: { x: item.x, y: item.y, width: item.width, height: item.height },
      timestamp,
      fullyVisible: item.fullyVisible,
      regionId: item.regionId,
    })));
  }, []);
  const frameOutput = useFrameOutput({
    targetResolution: { width: 640, height: 480 },
    pixelFormat: "rgb",
    dropFramesWhileBusy: true,
    onFrame(frame) {
      "worklet";
      try {
        if (!detector?.isReady) return;
        const minimumInterval = Platform.OS === "android" ? 125_000_000 : 0.125;
        if (frame.timestamp - lastProcessedTimestamp.value < minimumInterval) return;
        lastProcessedTimestamp.value = frame.timestamp;
        const result = detector.detect(frame);
        scheduleOnRN(receiveObservations, result, frame.timestamp);
      } finally {
        frame.dispose();
      }
    },
  });

  return { ready: detector?.isReady === true, observations, frameOutput };
}
