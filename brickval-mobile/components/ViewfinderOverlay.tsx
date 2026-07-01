import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import type { ScanMode } from "../lib/api";

const SET_ACCENT = "#F2CD37";
const MINIFIG_ACCENT = "#F2CD37";
const INK = "#F5F5F7";
const { width: INITIAL_SCREEN_W } = Dimensions.get("window");
const INITIAL_FRAME_W = INITIAL_SCREEN_W * 0.78;
const INITIAL_FRAME_H = INITIAL_FRAME_W * 1.25; // 4:5 portrait - fits a LEGO box nicely
const FRAME_RADIUS = 12;

interface Props {
  pulse: number; // 0..1, how close stability is to firing
  scanning: boolean; // true once capture has fired — sweep the line
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
  showModeSwitch: boolean;
}

export function ViewfinderOverlay({ pulse, scanning, mode, onModeChange, showModeSwitch }: Props) {
  const sweep = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(1)).current;
  const activeAccent = mode === "minifig" ? MINIFIG_ACCENT : SET_ACCENT;
  const [layout, setLayout] = useState({
    width: INITIAL_SCREEN_W,
    height: INITIAL_FRAME_H / 0.52,
  });
  const frameW = layout.width * 0.78;
  const frameH = frameW * 1.25;
  const frameTop = Math.max(0, (layout.height - frameH) / 2);
  const frameSide = Math.max(0, (layout.width - frameW) / 2);

  useEffect(() => {
    if (scanning) {
      sweep.setValue(0);
      Animated.timing(sweep, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      sweep.setValue(0);
    }
  }, [scanning]);

  useEffect(() => {
    // Fade hint after 3s
    Animated.sequence([
      Animated.delay(3000),
      Animated.timing(hint, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const sweepTranslateY = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameH - 4],
  });

  // Corner brackets glow brighter as pulse increases
  const cornerOpacity = 0.55 + pulse * 0.45;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== layout.width || height !== layout.height)) {
      setLayout({ width, height });
    }
  };

  return (
    <View pointerEvents="box-none" style={styles.container} onLayout={handleLayout}>
      <Svg pointerEvents="none" width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="viewfinderCutout">
            <Rect x={0} y={0} width={layout.width} height={layout.height} fill="white" />
            <Rect
              x={frameSide}
              y={frameTop}
              width={frameW}
              height={frameH}
              rx={FRAME_RADIUS}
              ry={FRAME_RADIUS}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          fill="rgba(8,8,9,0.48)"
          mask="url(#viewfinderCutout)"
        />
      </Svg>

      <View pointerEvents="box-none" style={[styles.frame, { width: frameW, height: frameH }]}>
        {showModeSwitch ? (
          <View
            style={[
              styles.modeSwitch,
              { borderColor: "rgba(242,205,55,0.34)" },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "set" }}
              accessibilityLabel="Set number entry"
              style={[styles.modePill, mode === "set" && { backgroundColor: SET_ACCENT }]}
              onPress={() => onModeChange("set")}
            >
              <Text style={[styles.modeText, mode === "set" && styles.modeTextActive]}>Set</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "minifig" }}
              accessibilityLabel="Scan minifigures and parts"
              style={[styles.modePill, mode === "minifig" && { backgroundColor: MINIFIG_ACCENT }]}
              onPress={() => onModeChange("minifig")}
            >
              <Text style={[styles.modeText, mode === "minifig" && styles.modeTextActive]}>Minifigs & Parts</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Corner brackets */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <View
            key={c}
            pointerEvents="none"
            style={[
              styles.cornerWrap,
              { borderColor: activeAccent },
              c === "tl" && styles.cornerTl,
              c === "tr" && styles.cornerTr,
              c === "bl" && styles.cornerBl,
              c === "br" && styles.cornerBr,
              cornerStyles[c],
              { opacity: cornerOpacity },
            ]}
          >
          </View>
        ))}

        {/* Scanline */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanline,
            {
              backgroundColor: activeAccent,
              shadowColor: activeAccent,
              opacity: scanning ? 1 : 0,
              transform: [{ translateY: sweepTranslateY }],
            },
          ]}
        />
      </View>

      {/* Hint */}
      <Animated.View pointerEvents="none" style={[styles.hintWrap, { opacity: hint }]}>
        <Text style={styles.hint}>
          {mode === "minifig"
            ? "Center minifigures or parts, then tap capture."
            : "Set mode uses manual entry. Tap Enter set number below."}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {},
  modeSwitch: {
    position: "absolute",
    top: -50,
    left: 0,
    flexDirection: "row",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(16,16,18,0.76)",
    borderColor: "rgba(242,201,76,0.34)",
    padding: 4,
    zIndex: 5,
  },
  modePill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeText: {
    color: "rgba(247,244,234,0.68)",
    fontSize: 9,
    fontWeight: "900",
  },
  modeTextActive: { color: "#101012" },
  cornerWrap: {
    position: "absolute",
    width: 30,
    height: 30,
  },
  cornerTl: {
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: FRAME_RADIUS,
  },
  cornerTr: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: FRAME_RADIUS,
  },
  cornerBl: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: FRAME_RADIUS,
  },
  cornerBr: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: FRAME_RADIUS,
  },
  scanline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  hintWrap: {
    position: "absolute",
    top: "69%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(16,16,18,0.72)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
  },
  hint: { color: INK, fontSize: 13, fontWeight: "700" },
});

const cornerStyles = StyleSheet.create({
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
});
