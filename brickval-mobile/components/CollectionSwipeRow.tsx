import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { success, tap, warn } from "../lib/haptics";
import {
  type CollectionItem,
  type CollectionItemIdentifier,
} from "../lib/collection-core";
import { QuestionMarkPlaceholder } from "./QuestionMarkPlaceholder";

const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.62)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#121715";
const LINE = "rgba(153,231,189,0.14)";
const DANGER = "#ff8f8f";

const DELETE_WIDTH = 92;

function formatCondition(value: CollectionItem["condition"]) {
  return value === "used" ? "Used" : "New / sealed";
}

function formatConditionTag(value: CollectionItem["condition"]) {
  return value === "used" ? "USED" : "NEW";
}

function formatRetailComparison(value: number | null) {
  if (value === null) return "No retail comparison";
  if (value >= 0) return `${Math.round(value)}% higher than retail`;
  return `${Math.round(Math.abs(value))}% below retail`;
}

function clamp(value: number, lower: number, upper: number) {
  return Math.max(lower, Math.min(upper, value));
}

interface Props {
  item: CollectionItem;
  index: number;
  onPress: () => void;
  onDelete: (target: CollectionItemIdentifier) => Promise<void>;
}

export function CollectionSwipeRow({ item, index, onPress, onDelete }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const startX = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeRow = () => {
    currentX.current = 0;
    setIsOpen(false);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const openRow = () => {
    currentX.current = -DELETE_WIDTH;
    setIsOpen(true);
    Animated.timing(translateX, {
      toValue: -DELETE_WIDTH,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const performDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    warn();
    Animated.timing(translateX, {
      toValue: -(DELETE_WIDTH + 28),
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (!finished) {
        setIsDeleting(false);
        return;
      }
      try {
        await onDelete({
          set_number: item.set_number,
          item_type: item.item_type,
          condition: item.condition,
          color_id: item.item_type === "part" ? item.color_id ?? null : undefined,
        });
        success();
      } catch {
        Alert.alert("Couldn’t delete item", "Please try again.");
        setIsDeleting(false);
        closeRow();
      }
    });
  };

  const confirmDelete = () => {
    Alert.alert("Delete item?", "This removes it from your saved collection.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: performDelete },
    ]);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isDeleting &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) &&
          (gesture.dx < 0 || isOpen),
        onPanResponderGrant: () => {
          startX.current = currentX.current;
        },
        onPanResponderMove: (_, gesture) => {
          if (isDeleting) return;
          const next = clamp(startX.current + gesture.dx, -DELETE_WIDTH, 0);
          currentX.current = next;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          if (isDeleting) return;
          const finalX = clamp(startX.current + gesture.dx, -DELETE_WIDTH, 0);
          if (finalX < -DELETE_WIDTH * 0.45) {
            openRow();
          } else {
            closeRow();
          }
        },
        onPanResponderTerminate: () => {
          if (!isDeleting) closeRow();
        },
      }),
    [isDeleting, isOpen, translateX]
  );

  const onRowPress = () => {
    tap();
    if (isOpen) {
      closeRow();
      return;
    }
    onPress();
  };

  const itemLabel = item.item_type === "part" ? "Part" : item.item_type === "minifig" ? "Minifig" : "Set";
  const totalValue = item.market_value_usd === null ? null : Math.round(item.market_value_usd * (item.quantity ?? 1));
  const primaryMarketRow = item.market_rows?.[0] ?? null;
  const primaryMarketPrice =
    primaryMarketRow === null
      ? null
      : `$${primaryMarketRow.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const actionOpacity = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const actionScale = translateX.interpolate({
    inputRange: [-DELETE_WIDTH, 0],
    outputRange: [1, 0.92],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.shell}>
      <View style={styles.actionRail}>
        <Animated.View
          style={[
            styles.deleteAction,
            {
              opacity: actionOpacity,
              transform: [{ scale: actionScale }],
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            style={styles.deleteButton}
            onPress={confirmDelete}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${item.name}. ${formatCondition(item.condition)}.`}
          onPress={onRowPress}
          style={styles.item}
          disabled={isDeleting}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.itemConditionBadge,
                item.condition === "used" ? styles.itemConditionBadgeUsed : styles.itemConditionBadgeNew,
              ]}
            >
              <Text
                style={[
                  styles.itemConditionText,
                  item.condition === "used" ? styles.itemConditionTextUsed : styles.itemConditionTextNew,
                ]}
              >
                {formatConditionTag(item.condition)}
              </Text>
            </View>
            <Text style={styles.rankLabel}>#{index + 1}</Text>
          </View>

          <View style={styles.imageStage}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="contain" />
            ) : (
              <QuestionMarkPlaceholder style={styles.thumb} />
            )}
          </View>

          <View style={styles.itemCopy}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemMeta} numberOfLines={1}>
              {itemLabel} {item.set_number} · {item.theme}
            </Text>
            <Text style={styles.itemSubMeta} numberOfLines={1}>
              Qty {item.quantity} · {formatCondition(item.condition)}
              {item.item_type === "part" && item.color_name ? ` · ${item.color_name}` : ""}
            </Text>
          </View>

          <View style={styles.valuePanel}>
            <View style={styles.itemPriceBlock}>
              <Text style={styles.itemValue}>{totalValue === null ? "N/A" : `$${totalValue.toLocaleString()}`}</Text>
              <Text style={styles.itemSource}>Saved value</Text>
            </View>
            <Text
              style={[
                styles.itemDelta,
                item.gain_pct === null
                  ? styles.muted
                  : item.gain_pct < 0
                    ? styles.negative
                    : styles.positive,
              ]}
            >
              {formatRetailComparison(item.gain_pct)}
            </Text>
          </View>

          {primaryMarketRow ? (
            <View style={styles.marketStrip}>
              <Text style={styles.marketStripLabel} numberOfLines={1}>
                {primaryMarketRow.label}
              </Text>
              <Text style={styles.marketStripValue} numberOfLines={1}>
                {primaryMarketPrice} · {primaryMarketRow.meta}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
  },
  actionRail: {
    ...StyleSheet.absoluteFill,
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "#22100f",
  },
  deleteAction: {
    width: DELETE_WIDTH,
    height: "100%",
    alignItems: "stretch",
    justifyContent: "center",
    paddingRight: 0,
  },
  deleteButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#562220",
  },
  deleteText: {
    color: "#ffd6d6",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  item: {
    padding: 14,
    gap: 12,
    backgroundColor: SURFACE,
  },
  cardTop: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rankLabel: {
    color: SOFT,
    fontSize: 12,
    fontWeight: "900",
  },
  imageStage: {
    minHeight: 148,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,244,234,0.07)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.1)",
  },
  thumb: { width: 136, height: 136, borderRadius: 18, backgroundColor: "rgba(247,244,234,0.08)" },
  itemCopy: { gap: 4, minWidth: 0 },
  itemName: { color: INK, fontSize: 17, fontWeight: "900", lineHeight: 22 },
  itemConditionBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemConditionBadgeNew: { backgroundColor: "rgba(98,199,154,0.1)" },
  itemConditionBadgeUsed: { backgroundColor: "rgba(242,201,76,0.12)" },
  itemConditionText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  itemConditionTextNew: { color: "#8ed1b0" },
  itemConditionTextUsed: { color: "#f5d36a" },
  itemMeta: { color: MUTED, fontSize: 12, fontWeight: "800" },
  itemSubMeta: { color: SOFT, fontSize: 11, fontWeight: "700" },
  itemDelta: { fontSize: 12, fontWeight: "900", textAlign: "right", flexShrink: 1 },
  muted: { color: MUTED },
  positive: { color: "#62c79a" },
  negative: { color: DANGER },
  valuePanel: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "rgba(247,244,234,0.06)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemPriceBlock: { gap: 3 },
  itemValue: { color: INK, fontSize: 22, fontWeight: "900", letterSpacing: -0.2 },
  itemSource: { color: SOFT, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  marketStrip: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(98,199,154,0.08)",
    borderWidth: 1,
    borderColor: "rgba(98,199,154,0.16)",
    gap: 3,
  },
  marketStripLabel: {
    color: "#8ed1b0",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  marketStripValue: {
    color: INK,
    fontSize: 12,
    fontWeight: "800",
  },
});
