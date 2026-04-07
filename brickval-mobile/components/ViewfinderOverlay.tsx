import { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

const GOLD = "#f5c518";
const { width: SCREEN_W } = Dimensions.get("window");
const FRAME_W = SCREEN_W * 0.78;
const FRAME_H = FRAME_W * 1.25; // 4:5 portrait — fits a LEGO box nicely

interface Props {
  pulse: number; // 0..1, how close stability is to firing
  scanning: boolean; // true once capture has fired — sweep the line
}

export function ViewfinderOverlay({ pulse, scanning }: Props) {
  const sweep = useSharedValue(0);
  const hint = useSharedValue(1);

  useEffect(() => {
    if (scanning) {
      sweep.value = 0;
      sweep.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) });
    } else {
      sweep.value = 0;
    }
  }, [scanning]);

  useEffect(() => {
    // Fade hint after 3s
    hint.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 2700 }),
      withTiming(0, { duration: 600 })
    );
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: scanning ? 1 : 0,
    transform: [{ translateY: sweep.value * (FRAME_H - 4) }],
  }));

  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));

  // Corner brackets glow brighter as pulse increases
  const cornerOpacity = 0.55 + pulse * 0.45;

  return (
    <View pointerEvents="none" style={styles.container}>
      {/* Dim overlay around the frame */}
      <View style={styles.dimTop} />
      <View style={styles.dimBottom} />
      <View style={styles.dimLeft} />
      <View style={styles.dimRight} />

      <View style={styles.frame}>
        {/* Corner brackets */}
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <View key={c} style={[styles.cornerWrap, cornerStyles[c], { opacity: cornerOpacity }]}>
            <View style={[styles.cornerH, c.startsWith("b") && { bottom: 0, top: undefined }, c.endsWith("r") && { right: 0, left: undefined }]} />
            <View style={[styles.cornerV, c.startsWith("b") && { bottom: 0, top: undefined }, c.endsWith("r") && { right: 0, left: undefined }]} />
          </View>
        ))}

        {/* Scanline */}
        <Animated.View style={[styles.scanline, sweepStyle]} />
      </View>

      {/* Hint */}
      <Animated.View style={[styles.hintWrap, hintStyle]}>
        <Text style={styles.hint}>Frame the LEGO box · hold still</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  dimTop: { position: "absolute", top: 0, left: 0, right: 0, height: (Dimensions.get("window").height - FRAME_H) / 2, backgroundColor: "rgba(0,0,0,0.45)" },
  dimBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: (Dimensions.get("window").height - FRAME_H) / 2, backgroundColor: "rgba(0,0,0,0.45)" },
  dimLeft: { position: "absolute", top: (Dimensions.get("window").height - FRAME_H) / 2, bottom: (Dimensions.get("window").height - FRAME_H) / 2, left: 0, width: (SCREEN_W - FRAME_W) / 2, backgroundColor: "rgba(0,0,0,0.45)" },
  dimRight: { position: "absolute", top: (Dimensions.get("window").height - FRAME_H) / 2, bottom: (Dimensions.get("window").height - FRAME_H) / 2, right: 0, width: (SCREEN_W - FRAME_W) / 2, backgroundColor: "rgba(0,0,0,0.45)" },
  frame: { width: FRAME_W, height: FRAME_H },
  cornerWrap: { position: "absolute", width: 28, height: 28 },
  cornerH: { position: "absolute", top: 0, left: 0, width: 28, height: 3, backgroundColor: GOLD, borderRadius: 2 },
  cornerV: { position: "absolute", top: 0, left: 0, width: 3, height: 28, backgroundColor: GOLD, borderRadius: 2 },
  scanline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hintWrap: { position: "absolute", top: "70%", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.55)" },
  hint: { color: "white", fontSize: 13, fontWeight: "600" },
});

const cornerStyles = StyleSheet.create({
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
});
