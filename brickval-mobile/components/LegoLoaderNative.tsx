import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

/**
 * RN port of src/components/LegoLoader.tsx — a tower of LEGO bricks that
 * stack themselves into place, hold, then loop. Pure Reanimated, no SVG
 * (uses plain Views with backgrounds for the brick bodies + studs).
 */

const LAYERS = [
  { color: "#f5c518", width: 80, x: 0 },
  { color: "#e74c3c", width: 64, x: -8 },
  { color: "#3498db", width: 64, x: 8 },
  { color: "#2ecc71", width: 48, x: -16 },
  { color: "#f39c12", width: 48, x: 0 },
];

const BRICK_HEIGHT = 18;
const STUD_HEIGHT = 5;
const LAYER_OFFSET = BRICK_HEIGHT;
const STAGGER = 180; // ms
const DROP = 450;
const HOLD = 800;
const TOWER_H = LAYERS.length * LAYER_OFFSET + STUD_HEIGHT;
const TOTAL_BUILD = LAYERS.length * STAGGER + DROP;
const CYCLE = TOTAL_BUILD + HOLD;

function StackedBrick({ color, width, x, layerIndex }: { color: string; width: number; x: number; layerIndex: number }) {
  const finalY = -(layerIndex * LAYER_OFFSET);
  const studCount = Math.max(1, Math.round(width / 16));
  const dropDelay = layerIndex * STAGGER;

  const y = useSharedValue(-160);
  const op = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withSequence(
        withDelay(dropDelay, withTiming(finalY, { duration: DROP, easing: Easing.in(Easing.cubic) })),
        withTiming(finalY, { duration: HOLD }),
        withTiming(-160, { duration: 0 }),
        withTiming(-160, { duration: Math.max(0, CYCLE - dropDelay - DROP - HOLD) })
      ),
      -1
    );
    op.value = withRepeat(
      withSequence(
        withDelay(dropDelay, withTiming(1, { duration: DROP / 2 })),
        withTiming(1, { duration: HOLD + DROP / 2 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: Math.max(0, CYCLE - dropDelay - DROP - HOLD) })
      ),
      -1
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left: "50%",
          marginLeft: x - width / 2,
          width,
          height: BRICK_HEIGHT + STUD_HEIGHT,
        },
        animStyle,
      ]}
    >
      {/* Studs row */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", height: STUD_HEIGHT }}>
        {Array.from({ length: studCount }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: STUD_HEIGHT,
              borderRadius: 1.5,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
      {/* Brick body */}
      <View
        style={{
          width,
          height: BRICK_HEIGHT,
          borderRadius: 2,
          backgroundColor: color,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.3)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.18)",
        }}
      />
    </Animated.View>
  );
}

export function LegoLoaderNative({ message = "Looking up..." }: { message?: string }) {
  return (
    <View style={styles.overlay}>
      <View style={[styles.tower, { height: TOWER_H + 20 }]}>
        {LAYERS.map((l, i) => (
          <StackedBrick key={i} color={l.color} width={l.width} x={l.x} layerIndex={i} />
        ))}
      </View>
      <Text style={styles.msg}>{message}</Text>
      <Text style={styles.sub}>Fetching real market data...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,13,15,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  tower: { width: 120, marginBottom: 32, position: "relative" },
  msg: { color: "white", fontSize: 16, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 6 },
});
