import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { LookupResult } from "../lib/api";

/**
 * Fullscreen modal that slides up from the bottom over the camera.
 * Uses RN's built-in Modal + Animated — zero gesture deps so it works
 * in Expo Go without the gesture-handler TurboModule mismatch.
 */

const GOLD = "#f5c518";
const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = Math.round(SCREEN_H * 0.65);

interface Props {
  result: LookupResult | null;
  onDismiss: () => void;
  onViewDetails: (setNumber: string) => void;
}

export function ResultCard({ result, onDismiss, onViewDetails }: Props) {
  const slide = useRef(new Animated.Value(SHEET_H)).current;
  const price = useRef(new Animated.Value(0)).current;
  const priceTextRef = useRef<Text>(null);

  useEffect(() => {
    if (result) {
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();

      // Count-up animation — write directly to the Text ref to avoid
      // re-rendering the whole card 60 times a second.
      price.setValue(0);
      const target = result.pricing.hero_new_avg_usd ?? 0;
      const listener = price.addListener(({ value }) => {
        priceTextRef.current?.setNativeProps({
          text: `$${Math.round(value).toLocaleString()}`,
        });
      });
      Animated.timing(price, {
        toValue: target,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      return () => price.removeListener(listener);
    } else {
      Animated.timing(slide, {
        toValue: SHEET_H,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [result]);

  if (!result) return null;

  const { pricing } = result;
  const gain = pricing.gain_pct;

  return (
    <Modal
      transparent
      visible={!!result}
      animationType="none"
      onRequestClose={onDismiss}
    >
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slide }] },
        ]}
      >
        <View style={styles.handle} />

        {/* Hero row */}
        <View style={styles.heroRow}>
          {result.image_url ? (
            <Image source={{ uri: result.image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: "#222" }]} />
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name} numberOfLines={2}>
              {result.name}
            </Text>
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
          <Text ref={priceTextRef} style={styles.price}>
            $0
          </Text>
          {gain !== null && gain !== undefined && (
            <View
              style={[styles.gainPill, gain >= 0 ? styles.gainPos : styles.gainNeg]}
            >
              <Text
                style={[
                  styles.gainText,
                  gain >= 0 ? { color: GOLD } : { color: "#ff7676" },
                ]}
              >
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
          <Pressable
            style={styles.primary}
            onPress={() => onViewDetails(result.set_number)}
          >
            <Text style={styles.primaryText}>View Details</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onDismiss}>
            <Text style={styles.secondaryText}>Scan another</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_H,
    backgroundColor: "#15151a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    alignSelf: "center",
    marginBottom: 6,
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  name: { color: "white", fontWeight: "800", fontSize: 17 },
  meta: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 },
  setNo: { color: GOLD, fontSize: 12, fontWeight: "700", marginTop: 4 },
  priceBlock: { alignItems: "flex-start", marginTop: 4 },
  priceLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  price: {
    color: "white",
    fontSize: 52,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 4,
  },
  gainPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
  },
  gainPos: {
    backgroundColor: "rgba(245,197,24,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,197,24,0.4)",
  },
  gainNeg: {
    backgroundColor: "rgba(255,118,118,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,118,118,0.4)",
  },
  gainText: { fontWeight: "800", fontSize: 12 },
  source: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  actions: { gap: 10, marginTop: 4 },
  primary: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { color: "#0d0d0f", fontWeight: "800", fontSize: 15 },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "white", fontWeight: "700", fontSize: 14 },
});
