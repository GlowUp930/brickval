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
import { LookupDetailResult } from "../lib/api";
import type { CollectionCondition } from "../lib/collection";
import { buildMarketSnapshot } from "../lib/market-snapshot";
import { QuestionMarkPlaceholder } from "./QuestionMarkPlaceholder";

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
  result: LookupDetailResult | null;
  onDismiss: () => void;
  onAddToCollection: (result: LookupDetailResult, options: { quantity: number; condition: CollectionCondition }) => void;
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
  const priceValue = useRef(0);
  const savePulse = useRef(new Animated.Value(1)).current;
  const [displayPrice, setDisplayPrice] = useState("$0");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<CollectionCondition>("new_sealed");

  useEffect(() => {
    const listener = price.addListener(({ value }) => {
      priceValue.current = value;
      setDisplayPrice(`$${Math.round(value).toLocaleString()}`);
    });
    return () => {
      price.removeListener(listener);
    };
  }, [price]);

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

      // Reset the price animation for this result.
      price.stopAnimation();
      priceValue.current = 0;
      price.setValue(0);
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
    if (!result) return;

    const target = buildMarketSnapshot(result, condition).price_usd;
    if (target === null || target === undefined) {
      price.stopAnimation();
      setDisplayPrice("Unavailable");
      return;
    }

    const duration = priceValue.current <= 0 ? 900 : 420;
    Animated.timing(price, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [condition, price, result]);

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
  const itemLabel = result.item_type === "part" ? "Part" : result.item_type === "minifig" ? "Minifig" : "Set";
  const gain = pricing.gain_pct;
  const partColor = result.item_type === "part" ? result.part_info.color_name ?? "Color required" : null;
  const snapshot = buildMarketSnapshot(result, condition);
  const selectedUnitValue = snapshot.price_usd;
  const confidenceText =
    snapshot.confidence === "high"
      ? "High confidence"
      : snapshot.confidence === "limited"
        ? "Limited data"
        : snapshot.confidence === "guide"
          ? "Guide only"
          : "Unavailable";
  const confidenceDetail =
    snapshot.confidence === "high"
      ? "Enough recent sold comps"
      : snapshot.confidence === "limited"
        ? "Thin sold history"
        : snapshot.confidence === "guide"
          ? "Listing price, not sold"
          : "No market price";
  const confidencePillStyle =
    snapshot.confidence === "high"
      ? styles.confidencePillHigh
      : snapshot.confidence === "limited"
        ? styles.confidencePillLimited
        : snapshot.confidence === "guide"
          ? styles.confidencePillGuide
          : styles.confidencePillUnavailable;
  const snapshotTypeText =
    snapshot.source_type === "sold" ? "Sold comps" : snapshot.source_type === "listing" ? "Listings" : "No comps";
  const snapshotCountText =
    snapshot.count === null
      ? "Count unknown"
      : `${snapshot.count.toLocaleString()} ${snapshot.source_type === "listing" ? "listings" : "sales"}`;
  const deltaText =
    gain !== null && gain !== undefined
      ? `${gain >= 0 ? "+" : ""}${gain.toFixed(0)}%`
      : "Not enough data";
  const rrpText =
    result.item_type === "part"
      ? "Retail estimate not used for parts"
      : pricing.rrp_usd !== null && pricing.rrp_usd !== undefined
      ? `Retail estimate: ~${Math.round(pricing.rrp_usd).toLocaleString()}`
      : result.item_type === "minifig"
        ? "Retail estimate not used for minifigures"
        : "Retail estimate unavailable";
  const collectionValue =
    selectedUnitValue === null ? "Unavailable" : `$${Math.round(selectedUnitValue * quantity).toLocaleString()}`;
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
                <View style={[styles.confidencePill, confidencePillStyle]}>
                  <Text style={styles.confidenceText}>{confidenceText}</Text>
                </View>
              </View>
              <Text style={styles.price}>{displayPrice}</Text>
              <Text style={styles.rrp}>{rrpText}</Text>

              <View style={styles.snapshotStrip}>
                <View style={styles.snapshotCell}>
                  <Text style={styles.snapshotLabel}>Source</Text>
                  <Text style={styles.snapshotValue} numberOfLines={1}>{snapshot.source_name}</Text>
                </View>
                <View style={[styles.snapshotCell, styles.snapshotCellDivider]}>
                  <Text style={styles.snapshotLabel}>Basis</Text>
                  <Text style={styles.snapshotValue} numberOfLines={1}>{snapshotTypeText}</Text>
                </View>
                <View style={styles.snapshotCell}>
                  <Text style={styles.snapshotLabel}>Count</Text>
                  <Text style={styles.snapshotValue} numberOfLines={1}>{snapshotCountText}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroRow}>
              {result.image_url ? (
                <Image source={{ uri: result.image_url }} style={styles.thumb} />
              ) : (
                <QuestionMarkPlaceholder style={styles.thumb} />
              )}
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={2}>
                  {result.name}
                </Text>
                <Text style={styles.meta}>
                  {result.theme}
                  {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
                </Text>
                <Text style={styles.setNo}>
                  {itemLabel} #{result.set_number}
                  {partColor ? ` · ${partColor}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.signalGrid}>
              <View style={[styles.signalItem, styles.signalDivider]}>
                <Text style={styles.signalLabel}>Signal</Text>
                <Text style={styles.signalValue} numberOfLines={2}>{confidenceDetail}</Text>
              </View>
              <View style={styles.signalItem}>
                <Text style={styles.signalLabel}>{result.item_type === "part" ? "Color" : "Retail comparison"}</Text>
                {result.item_type === "part" ? (
                  <Text style={styles.signalValue} numberOfLines={2}>
                    {partColor ?? "Color unknown"}
                  </Text>
                ) : (
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
                )}
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
    gap: 8,
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
  confidencePillHigh: {
    borderColor: "rgba(76,217,120,0.45)",
    backgroundColor: "rgba(76,217,120,0.1)",
  },
  confidencePillLimited: {
    borderColor: "rgba(242,201,76,0.45)",
    backgroundColor: "rgba(242,201,76,0.1)",
  },
  confidencePillGuide: {
    borderColor: "rgba(247,244,234,0.22)",
    backgroundColor: "rgba(247,244,234,0.06)",
  },
  confidencePillUnavailable: {
    borderColor: "rgba(255,143,143,0.42)",
    backgroundColor: "rgba(255,143,143,0.08)",
  },
  confidenceText: { color: ACCENT, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  snapshotStrip: {
    width: "100%",
    minHeight: 58,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.12)",
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "rgba(21,21,20,0.36)",
  },
  snapshotCell: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  snapshotCellDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(247,244,234,0.1)",
  },
  snapshotLabel: { color: MUTED, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  snapshotValue: { color: INK, fontSize: 12, lineHeight: 16, fontWeight: "900" },
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
