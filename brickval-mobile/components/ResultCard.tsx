import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { LookupSummaryResult } from "../lib/api";
import type { CollectionCondition } from "../lib/collection";

/**
 * Fullscreen modal that slides up from the bottom over the camera.
 * Uses RN's built-in Modal + Animated — zero gesture deps so it works
 * in Expo Go without the gesture-handler TurboModule mismatch.
 */

const ACCENT = "#f2c94c";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SURFACE = "#151514";
const LINE = "rgba(247,244,234,0.12)";

interface Props {
  result: LookupSummaryResult | null;
  onDismiss: () => void;
  onAddToCollection: (result: LookupSummaryResult, options: { quantity: number; condition: CollectionCondition }) => void;
  addedToCollection: boolean;
  onViewDetails: (setNumber: string) => void;
}

export function ResultCard({
  result,
  onDismiss,
  onAddToCollection,
  addedToCollection,
  onViewDetails,
}: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(screenHeight * 0.82);
  const slide = useRef(new Animated.Value(screenHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const price = useRef(new Animated.Value(0)).current;
  const savePulse = useRef(new Animated.Value(1)).current;
  const [displayPrice, setDisplayPrice] = useState("$0");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<CollectionCondition>("new_sealed");

  useEffect(() => {
    if (result) {
      setQuantity(1);
      setCondition("new_sealed");
      content.setValue(0);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 19,
          stiffness: 210,
        }),
        Animated.timing(content, {
          toValue: 1,
          duration: 260,
          delay: 90,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Count-up animation for the price reveal.
      const target = result.pricing.hero_new_avg_usd ?? 0;
      if (result.pricing.hero_new_avg_usd === null || result.pricing.hero_new_avg_usd === undefined) {
        setDisplayPrice("Unavailable");
        return;
      }
      setDisplayPrice("$0");
      price.setValue(0);
      const listener = price.addListener(({ value }) => {
        setDisplayPrice(`$${Math.round(value).toLocaleString()}`);
      });
      Animated.timing(price, {
        toValue: target,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      return () => {
        price.removeListener(listener);
      };
    } else {
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(slide, {
        toValue: screenHeight,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [result, screenHeight, slide, backdrop, content, price]);

  useEffect(() => {
    if (!addedToCollection) return;
    Animated.sequence([
      Animated.timing(savePulse, {
        toValue: 0.97,
        duration: 70,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(savePulse, {
        toValue: 1.025,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(savePulse, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [addedToCollection, savePulse]);

  if (!result) return null;

  const { pricing } = result;
  const itemLabel = result.item_type === "minifig" ? "Minifig" : "Set";
  const gain = pricing.gain_pct;
  const hasPrice = pricing.hero_new_avg_usd !== null && pricing.hero_new_avg_usd !== undefined;
  const sourceText =
    pricing.data_source === "sold"
      ? `Sold data${pricing.bricklink_new_qty ? ` · ${pricing.bricklink_new_qty} BrickLink sales` : ""}`
      : pricing.data_source === "listing"
        ? "Active listing data"
        : "Market source unavailable";
  const confidenceText = pricing.data_source === "sold" ? "Higher confidence" : "Use as a guide";
  const deltaText =
    gain !== null && gain !== undefined
      ? `${gain >= 0 ? "+" : ""}${gain.toFixed(0)}%`
      : "Not enough data";
  const rrpText =
    pricing.rrp_usd !== null && pricing.rrp_usd !== undefined
      ? `Retail estimate: ~${Math.round(pricing.rrp_usd).toLocaleString()}`
      : result.item_type === "minifig"
        ? "Retail estimate not used for minifigures"
        : "Retail estimate unavailable";
  const collectionValue = hasPrice ? `$${Math.round((pricing.hero_new_avg_usd ?? 0) * quantity).toLocaleString()}` : "Unavailable";
  const contentTranslateY = content.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Modal
      transparent
      visible={!!result}
      animationType="none"
      onRequestClose={onDismiss}
    >
      {/* Dim backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { maxHeight: sheetMaxHeight, transform: [{ translateY: slide }] },
        ]}
      >
        <View style={styles.handle} />

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.revealContent,
              {
                opacity: content,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <View style={styles.pricePanel}>
              <View style={styles.priceHeader}>
                <Text style={styles.priceLabel}>Market price</Text>
                <View style={styles.confidencePill}>
                  <Text style={styles.confidenceText}>{confidenceText}</Text>
                </View>
              </View>
              <Text style={styles.price}>{displayPrice}</Text>
              <Text style={styles.rrp}>{rrpText}</Text>
            </View>

            <View style={styles.heroRow}>
              {result.image_url ? (
                <Image source={{ uri: result.image_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: "#222" }]} />
              )}
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={2}>
                  {result.name}
                </Text>
                <Text style={styles.meta}>
                  {result.theme}
                  {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
                </Text>
                <Text style={styles.setNo}>{itemLabel} #{result.set_number}</Text>
              </View>
            </View>

            <View style={styles.signalGrid}>
              <View style={[styles.signalItem, styles.signalDivider]}>
                <Text style={styles.signalLabel}>Source</Text>
                <Text style={styles.signalValue} numberOfLines={2}>{sourceText}</Text>
              </View>
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>Retail comparison</Text>
                <Text
                  style={[
                    styles.signalValue,
                    gain === null || gain === undefined
                      ? styles.signalMuted
                      : gain >= 0
                        ? { color: ACCENT }
                        : { color: "#ff8f8f" },
                  ]}
                  numberOfLines={2}
                >
                  {gain === null || gain === undefined
                    ? deltaText
                    : gain >= 0
                      ? `${Math.round(gain)}% higher than retail`
                      : `${Math.round(Math.abs(gain))}% below retail`}
                </Text>
              </View>
            </View>

            <View style={styles.collectionPanel}>
              <View style={styles.collectionHeader}>
                <Text style={styles.collectionLabel}>Save details</Text>
                <Text style={styles.collectionMeta}>Choose quantity and condition before saving</Text>
              </View>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Quantity</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                    style={[styles.stepperBtn, quantity === 1 && styles.stepperBtnDisabled]}
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity === 1}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                    style={styles.stepperBtn}
                    onPress={() => setQuantity((current) => current + 1)}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.conditionRow}>
                {[
                  { key: "new_sealed" as const, label: "New / sealed" },
                  { key: "used" as const, label: "Used" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: condition === option.key }}
                    accessibilityLabel={option.label}
                    style={[styles.conditionPill, condition === option.key && styles.conditionPillActive]}
                    onPress={() => setCondition(option.key)}
                  >
                    <Text style={[styles.conditionText, condition === option.key && styles.conditionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.collectionNote}>
                Saved value: {collectionValue}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.actions}>
          <Animated.View style={{ transform: [{ scale: savePulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={addedToCollection ? "Added to collection" : "Save to collection"}
              style={[styles.primary, addedToCollection && styles.primarySaved]}
              onPress={() => onAddToCollection(result, { quantity, condition })}
            >
              <Text style={[styles.primaryText, addedToCollection && styles.primarySavedText]}>
                {addedToCollection ? "Added to collection" : "Save to collection"}
              </Text>
            </Pressable>
          </Animated.View>
          <Pressable accessibilityRole="button" accessibilityLabel="Scan another item" style={styles.secondary} onPress={onDismiss}>
            <Text style={styles.secondaryText}>Scan another</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View full item details"
            style={styles.tertiary}
            onPress={() => onViewDetails(result.set_number)}
          >
            <Text style={styles.tertiaryText}>View details</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACCENT,
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetScroll: {
    flexShrink: 1,
    marginTop: 12,
  },
  sheetContent: {
    paddingBottom: 18,
  },
  revealContent: {
    gap: 18,
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 76, height: 76, borderRadius: 8 },
  identity: { flex: 1, marginLeft: 14, gap: 4 },
  name: { color: INK, fontWeight: "800", fontSize: 17, lineHeight: 22 },
  meta: { color: MUTED, fontSize: 13, lineHeight: 18 },
  setNo: { color: ACCENT, fontSize: 12, fontWeight: "800", marginTop: 2 },
  pricePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.2)",
    backgroundColor: "rgba(242,201,76,0.06)",
    padding: 16,
    alignItems: "flex-start",
  },
  priceHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  price: {
    color: INK,
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
    lineHeight: 66,
  },
  rrp: { color: MUTED, fontSize: 13, fontWeight: "700" },
  confidencePill: {
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.34)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(21,21,20,0.54)",
  },
  confidenceText: { color: ACCENT, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  signalGrid: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  signalItem: { flex: 1, gap: 5, padding: 14 },
  signalDivider: { borderRightWidth: 1, borderRightColor: LINE },
  signalLabel: { color: MUTED, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  signalValue: { color: INK, fontSize: 14, fontWeight: "800", lineHeight: 19 },
  signalMuted: { color: MUTED },
  collectionPanel: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  collectionHeader: { gap: 3 },
  collectionLabel: { color: INK, fontSize: 14, fontWeight: "900" },
  collectionMeta: { color: MUTED, fontSize: 12, fontWeight: "700", lineHeight: 16 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperBtnText: { color: INK, fontSize: 22, fontWeight: "800", marginTop: -1 },
  stepperValue: { minWidth: 28, textAlign: "center", color: INK, fontSize: 14, fontWeight: "900" },
  conditionRow: {
    flexDirection: "row",
    gap: 10,
  },
  conditionPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  conditionPillActive: {
    borderColor: "rgba(242,201,76,0.55)",
    backgroundColor: "rgba(242,201,76,0.12)",
  },
  conditionText: { color: MUTED, fontSize: 12, fontWeight: "800" },
  conditionTextActive: { color: INK },
  collectionNote: { color: MUTED, fontSize: 12, fontWeight: "700" },
  actions: { gap: 10 },
  primary: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  primarySaved: {
    backgroundColor: "rgba(245,197,24,0.26)",
    borderWidth: 1,
    borderColor: "rgba(245,197,24,0.52)",
  },
  primaryText: { color: "#11110f", fontWeight: "900", fontSize: 15 },
  primarySavedText: { color: INK },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.18)",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: INK, fontWeight: "800", fontSize: 14 },
  tertiary: {
    paddingVertical: 8,
    alignItems: "center",
  },
  tertiaryText: { color: MUTED, fontWeight: "800", fontSize: 13 },
});
