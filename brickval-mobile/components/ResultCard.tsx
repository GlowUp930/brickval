import { useEffect, useRef, useState, useMemo } from "react";
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
import { useTheme, type ModeColors } from "../lib/ThemeProvider";
import { colors as themeColors } from "../lib/theme";

/**
 * Fullscreen modal that slides up from the bottom over the camera.
 * Uses RN's built-in Modal + Animated — zero gesture deps so it works
 * in Expo Go without the gesture-handler TurboModule mismatch.
 */

const hexToRgba = (hex: string, alpha: number) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

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
  const { colors, c, mode } = useTheme();
  const s = useMemo(() => getStyles(c), [c, mode]);
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
      ? s.confidencePillHigh
      : snapshot.confidence === "limited"
        ? s.confidencePillLimited
        : snapshot.confidence === "guide"
          ? s.confidencePillGuide
          : s.confidencePillUnavailable;
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
      <Animated.View style={[s.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          { maxHeight: sheetMaxHeight, transform: [{ translateY: slide }] },
        ]}
      >
        <View style={s.handle} />

        <ScrollView
          style={s.sheetScroll}
          contentContainerStyle={s.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              s.revealContent,
              {
                opacity: content,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <View style={s.pricePanel}>
              <View style={s.priceHeader}>
                <Text style={s.priceLabel}>Market price</Text>
                <View style={[s.confidencePill, confidencePillStyle]}>
                  <Text style={s.confidenceText}>{confidenceText}</Text>
                </View>
              </View>
              <Text style={s.price}>{displayPrice}</Text>
              <Text style={s.rrp}>{rrpText}</Text>

              <View style={s.snapshotStrip}>
                <View style={s.snapshotCell}>
                  <Text style={s.snapshotLabel}>Source</Text>
                  <Text style={s.snapshotValue} numberOfLines={1}>{snapshot.source_name}</Text>
                </View>
                <View style={[s.snapshotCell, s.snapshotCellDivider]}>
                  <Text style={s.snapshotLabel}>Basis</Text>
                  <Text style={s.snapshotValue} numberOfLines={1}>{snapshotTypeText}</Text>
                </View>
                <View style={s.snapshotCell}>
                  <Text style={s.snapshotLabel}>Count</Text>
                  <Text style={s.snapshotValue} numberOfLines={1}>{snapshotCountText}</Text>
                </View>
              </View>
            </View>

            <View style={s.heroRow}>
              {result.image_url ? (
                <Image source={{ uri: result.image_url }} style={s.thumb} />
              ) : (
                <QuestionMarkPlaceholder style={s.thumb} />
              )}
              <View style={s.identity}>
                <Text style={s.name} numberOfLines={2}>
                  {result.name}
                </Text>
                <Text style={s.meta}>
                  {result.theme}
                  {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
                </Text>
                <Text style={s.setNo}>
                  {itemLabel} #{result.set_number}
                  {partColor ? ` · ${partColor}` : ""}
                </Text>
              </View>
            </View>

            <View style={s.signalGrid}>
              <View style={[s.signalItem, s.signalDivider]}>
                <Text style={s.signalLabel}>Signal</Text>
                <Text style={s.signalValue} numberOfLines={2}>{confidenceDetail}</Text>
              </View>
              <View style={s.signalItem}>
                <Text style={s.signalLabel}>{result.item_type === "part" ? "Color" : "Retail comparison"}</Text>
                {result.item_type === "part" ? (
                  <Text style={s.signalValue} numberOfLines={2}>
                    {partColor ?? "Color unknown"}
                  </Text>
                ) : (
                  <Text
                    style={[
                      s.signalValue,
                      gain === null || gain === undefined
                        ? s.signalMuted
                        : gain >= 0
                          ? { color: themeColors.lego.yellow }
                          : { color: themeColors.semantic.danger },
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

            <View style={s.collectionPanel}>
              <View style={s.collectionHeader}>
                <Text style={s.collectionLabel}>Save details</Text>
                <Text style={s.collectionMeta}>Choose quantity and condition before saving</Text>
              </View>

              <View style={s.optionRow}>
                <Text style={s.optionLabel}>Quantity</Text>
                <View style={s.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                    style={[s.stepperBtn, quantity === 1 && s.stepperBtnDisabled]}
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity === 1}
                  >
                    <Text style={s.stepperBtnText}>−</Text>
                  </Pressable>
                  <Text style={s.stepperValue}>{quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                    style={s.stepperBtn}
                    onPress={() => setQuantity((current) => current + 1)}
                  >
                    <Text style={s.stepperBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={s.conditionRow}>
                {[
                  { key: "new_sealed" as const, label: "New / sealed" },
                  { key: "used" as const, label: "Used" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: condition === option.key }}
                    accessibilityLabel={option.label}
                    style={[s.conditionPill, condition === option.key && s.conditionPillActive]}
                    onPress={() => setCondition(option.key)}
                  >
                    <Text style={[s.conditionText, condition === option.key && s.conditionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.collectionNote}>
                Saved value: {collectionValue}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={s.actions}>
          <Animated.View style={{ transform: [{ scale: savePulse }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={addedToCollection ? "Added to collection" : "Save to collection"}
              style={[s.primary, addedToCollection && s.primarySaved]}
              onPress={() => onAddToCollection(result, { quantity, condition })}
            >
              <Text style={[s.primaryText, addedToCollection && s.primarySavedText]}>
                {addedToCollection ? "Added to collection" : "Save to collection"}
              </Text>
            </Pressable>
          </Animated.View>
          <Pressable accessibilityRole="button" accessibilityLabel="Scan another item" style={s.secondary} onPress={onDismiss}>
            <Text style={s.secondaryText}>Scan another</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View full item details"
            style={s.tertiary}
            onPress={() => onViewDetails(result.set_number)}
          >
            <Text style={s.tertiaryText}>View details</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

function getStyles(c: ModeColors) { return StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.background,
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
    backgroundColor: themeColors.lego.yellow,
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
  name: { color: c.text, fontWeight: "800", fontSize: 17, lineHeight: 22 },
  meta: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  setNo: { color: themeColors.lego.yellow, fontSize: 12, fontWeight: "800", marginTop: 2 },
  pricePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hexToRgba(themeColors.lego.yellow, 0.2),
    backgroundColor: hexToRgba(themeColors.lego.yellow, 0.06),
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
    color: c.textMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  price: {
    color: c.text,
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
    lineHeight: 66,
  },
  rrp: { color: c.textMuted, fontSize: 13, fontWeight: "700" },
  confidencePill: {
    borderWidth: 1,
    borderColor: hexToRgba(themeColors.lego.yellow, 0.34),
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.backgroundMuted,
  },
  confidencePillHigh: {
    borderColor: hexToRgba(themeColors.semantic.success, 0.45),
    backgroundColor: hexToRgba(themeColors.semantic.success, 0.1),
  },
  confidencePillLimited: {
    borderColor: hexToRgba(themeColors.lego.yellow, 0.45),
    backgroundColor: hexToRgba(themeColors.lego.yellow, 0.1),
  },
  confidencePillGuide: {
    borderColor: hexToRgba(c.text, 0.22),
    backgroundColor: hexToRgba(c.text, 0.06),
  },
  confidencePillUnavailable: {
    borderColor: hexToRgba(themeColors.semantic.danger, 0.42),
    backgroundColor: hexToRgba(themeColors.semantic.danger, 0.08),
  },
  confidenceText: { color: themeColors.lego.yellow, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  snapshotStrip: {
    width: "100%",
    minHeight: 58,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: c.surface,
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
    borderColor: c.border,
  },
  snapshotLabel: { color: c.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  snapshotValue: { color: c.text, fontSize: 12, lineHeight: 16, fontWeight: "900" },
  signalGrid: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  signalItem: { flex: 1, gap: 5, padding: 14 },
  signalDivider: { borderRightWidth: 1, borderRightColor: c.border },
  signalLabel: { color: c.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  signalValue: { color: c.text, fontSize: 14, fontWeight: "800", lineHeight: 19 },
  signalMuted: { color: c.textMuted },
  collectionPanel: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: c.backgroundElevated,
  },
  collectionHeader: { gap: 3 },
  collectionLabel: { color: c.text, fontSize: 14, fontWeight: "900" },
  collectionMeta: { color: c.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 16 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLabel: { color: c.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: c.backgroundElevated,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperBtnText: { color: c.text, fontSize: 22, fontWeight: "800", marginTop: -1 },
  stepperValue: { minWidth: 28, textAlign: "center", color: c.text, fontSize: 14, fontWeight: "900" },
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
    borderColor: c.border,
    backgroundColor: c.backgroundElevated,
  },
  conditionPillActive: {
    borderColor: hexToRgba(themeColors.lego.yellow, 0.55),
    backgroundColor: hexToRgba(themeColors.lego.yellow, 0.12),
  },
  conditionText: { color: c.textMuted, fontSize: 12, fontWeight: "800" },
  conditionTextActive: { color: c.text },
  collectionNote: { color: c.textMuted, fontSize: 12, fontWeight: "700" },
  actions: { gap: 10 },
  primary: {
    backgroundColor: themeColors.lego.yellow,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  primarySaved: {
    backgroundColor: hexToRgba(themeColors.lego.yellow, 0.26),
    borderWidth: 1,
    borderColor: hexToRgba(themeColors.lego.yellow, 0.52),
  },
  primaryText: { color: themeColors.light.text, fontWeight: "900", fontSize: 15 },
  primarySavedText: { color: c.text },
  secondary: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: c.text, fontWeight: "800", fontSize: 14 },
  tertiary: {
    paddingVertical: 8,
    alignItems: "center",
  },
  tertiaryText: { color: c.textMuted, fontWeight: "800", fontSize: 13 },
}); }
