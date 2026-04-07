import { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LookupResult } from "../lib/api";

const GOLD = "#f5c518";

interface Props {
  result: LookupResult | null;
  onDismiss: () => void;
  onViewDetails: (setNumber: string) => void;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export function ResultCard({ result, onDismiss, onViewDetails }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["62%", "92%"], []);

  const price = useSharedValue(0);

  useEffect(() => {
    if (result) {
      sheetRef.current?.snapToIndex(0);
      const target = result.pricing.hero_new_avg_usd ?? 0;
      price.value = 0;
      price.value = withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
    } else {
      sheetRef.current?.close();
    }
  }, [result]);

  const animatedProps = useAnimatedProps(() => ({
    text: `$${Math.round(price.value).toLocaleString()}`,
  }) as any);

  if (!result) return null;

  const { pricing } = result;
  const gain = pricing.gain_pct;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.body}>
        {/* Hero row */}
        <View style={styles.heroRow}>
          {result.image_url ? (
            <Image source={{ uri: result.image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: "#222" }]} />
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name} numberOfLines={2}>{result.name}</Text>
            <Text style={styles.meta}>
              {result.theme}
              {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
            </Text>
            <Text style={styles.setNo}>#{result.set_number}</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Market price</Text>
          <AnimatedText
            style={styles.price}
            // @ts-ignore — Reanimated text prop
            animatedProps={animatedProps}
          />
          {gain !== null && gain !== undefined && (
            <View style={[styles.gainPill, gain >= 0 ? styles.gainPos : styles.gainNeg]}>
              <Text style={[styles.gainText, gain >= 0 ? { color: GOLD } : { color: "#ff7676" }]}>
                {gain >= 0 ? "+" : ""}
                {gain.toFixed(0)}% vs retail
              </Text>
            </View>
          )}
        </View>

        {/* Source */}
        <Text style={styles.source}>
          {pricing.data_source === "sold"
            ? `Based on ${pricing.bricklink_new_qty ?? 0} BrickLink sales`
            : "Based on active listings"}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={() => onViewDetails(result.set_number)}>
            <Text style={styles.primaryText}>View Details</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onDismiss}>
            <Text style={styles.secondaryText}>Scan another</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: "#15151a" },
  handle: { backgroundColor: GOLD, width: 40 },
  body: { flex: 1, padding: 20, gap: 18 },
  heroRow: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  name: { color: "white", fontWeight: "800", fontSize: 17 },
  meta: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 },
  setNo: { color: GOLD, fontSize: 12, fontWeight: "700", marginTop: 4 },
  priceBlock: { alignItems: "flex-start", marginTop: 4 },
  priceLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  price: { color: "white", fontSize: 52, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  gainPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  gainPos: { backgroundColor: "rgba(245,197,24,0.15)", borderWidth: 1, borderColor: "rgba(245,197,24,0.4)" },
  gainNeg: { backgroundColor: "rgba(255,118,118,0.15)", borderWidth: 1, borderColor: "rgba(255,118,118,0.4)" },
  gainText: { fontWeight: "800", fontSize: 12 },
  source: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  actions: { gap: 10, marginTop: 4 },
  primary: { backgroundColor: GOLD, borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  primaryText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  secondaryText: { color: "white", fontWeight: "700", fontSize: 14 },
});
