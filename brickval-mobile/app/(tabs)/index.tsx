import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router, useFocusEffect } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  CollectionItem,
  getCollection,
  getCollectionValue,
  getItemTotalValue,
} from "../../lib/collection";
import { QuestionMarkPlaceholder } from "../../components/QuestionMarkPlaceholder";

const ACCENT = "#62c79a";
const LEGO_YELLOW = "#f2c94c";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.62)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#121715";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const DANGER = "#ff8f8f";
const HISTORY_TIP_KEY = "brickval_home_history_tip_seen";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Horizon = "1M" | "3M" | "6M";

const HORIZON_DAYS: Record<Horizon, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
};

function formatSignedPercent(value: number | null) {
  if (value === null) return "No delta";
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
}

function formatRetailComparison(value: number | null) {
  if (value === null) return "No retail comparison";
  if (value >= 0) return `${Math.round(value)}% higher than retail`;
  return `${Math.round(Math.abs(value))}% below retail`;
}

function formatCondition(value: CollectionItem["condition"]) {
  return value === "used" ? "Used" : "New / sealed";
}

function formatConditionTag(value: CollectionItem["condition"]) {
  return value === "used" ? "USED" : "NEW";
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatTimelineLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const smoothing = 0.18;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const next = points[index + 1] ?? point;
    const previousControl = points[index - 2] ?? previous;
    const cp1x = previous.x + (point.x - previousControl.x) * smoothing;
    const cp1y = previous.y + (point.y - previousControl.y) * smoothing;
    const cp2x = point.x - (next.x - previous.x) * smoothing;
    const cp2y = point.y - (next.y - previous.y) * smoothing;
    return `${path} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");
}

function getHistoricalCollectionSeries(items: CollectionItem[], horizon: Horizon) {
  const today = new Date();
  const days = HORIZON_DAYS[horizon];
  const start = addDays(today, -days);
  const bucketCount = 8;
  const bucketStep = days / (bucketCount - 1);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = addDays(start, Math.round(index * bucketStep));
    return { date, label: isoDate(date), total_value_usd: 0 };
  });

  return buckets.map((bucket) => {
    const total = items.reduce((sum, item) => {
      const history = (item.market_history ?? [])
        .filter((point) => point.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      const multiplier = item.quantity ?? 1;
      if (history.length === 0) return sum + (item.market_value_usd ?? 0) * multiplier;
      const bucketKey = isoDate(bucket.date);
      const latestBeforeBucket = [...history].reverse().find((point) => point.date.slice(0, 10) <= bucketKey);
      const fallback = history.find((point) => point.date.slice(0, 10) >= isoDate(start)) ?? history[0];
      return sum + (latestBeforeBucket?.price_usd ?? fallback?.price_usd ?? item.market_value_usd ?? 0) * multiplier;
    }, 0);
    return { date: bucket.label, total_value_usd: Math.round(total) };
  });
}

export default function HomeDashboard() {
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("6M");
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [showHistoryTip, setShowHistoryTip] = useState(false);
  const popupProgress = useRef(new Animated.Value(0)).current;
  const historyTipProgress = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCollection() {
        const collection = await getCollection();
        if (!active) return;
        setItems(collection);
      }
      loadCollection();
      return () => {
        active = false;
      };
    }, [])
  );

  const totalValue = getCollectionValue(items);
  const setCount = items.reduce((total, item) => total + (item.item_type === "set" ? item.quantity ?? 1 : 0), 0);
  const minifigureCount = items.reduce((total, item) => total + (item.item_type === "minifig" ? item.quantity ?? 1 : 0), 0);
  const topItems = [...items].sort((a, b) => getItemTotalValue(b) - getItemTotalValue(a));
  const displayHistory = getHistoricalCollectionSeries(items, horizon);
  const historyValues = displayHistory.map((point) => point.total_value_usd);
  const minHistoryValue = historyValues.length ? Math.min(...historyValues) : 0;
  const maxHistoryValue = historyValues.length ? Math.max(...historyValues) : 0;
  const historyRange = Math.max(maxHistoryValue - minHistoryValue, 1);
  const hasHistoryMovement = historyValues.some((value) => value !== minHistoryValue);
  const firstHistoryValue = displayHistory[0]?.total_value_usd ?? 0;
  const historyDelta = firstHistoryValue > 0 ? ((totalValue - firstHistoryValue) / firstHistoryValue) * 100 : null;
  const topSet = topItems[0];
  const pricedUnits = items.reduce((total, item) => total + (item.market_value_usd !== null ? (item.quantity ?? 1) : 0), 0);
  const latestHistoryLabel = `Past ${horizon}`;
  const chartPoints = displayHistory.slice(-14);
  const chartWidth = Math.min(360, Math.max(260, screenWidth - 80));
  const chartHeight = 208;
  const chartPlotHeight = 150;
  const chartBottom = chartHeight - 26;
  const chartStep = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
  const selectedHistoryPoint = selectedHistoryIndex === null ? null : chartPoints[selectedHistoryIndex] ?? null;
  const chartCoordinates = chartPoints.map((point, index) => {
    const x = chartPoints.length > 1 ? index * chartStep : chartWidth / 2;
    const y = hasHistoryMovement
      ? chartBottom - ((point.total_value_usd - minHistoryValue) / historyRange) * chartPlotHeight
      : chartHeight / 2;
    return { ...point, x, y };
  });
  const safeChartCoordinates = chartCoordinates.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const chartLinePath = getSmoothPath(safeChartCoordinates);
  const firstCoordinate = safeChartCoordinates[0];
  const lastCoordinate = safeChartCoordinates[safeChartCoordinates.length - 1];
  const chartAreaPath = chartLinePath && firstCoordinate && lastCoordinate
    ? `${chartLinePath} L ${lastCoordinate.x} ${chartBottom} L ${firstCoordinate.x} ${chartBottom} Z`
    : "";
  const selectedCoordinate = selectedHistoryIndex === null ? null : chartCoordinates[selectedHistoryIndex] ?? null;
  const selectedX = selectedCoordinate?.x ?? 0;
  const popupWidth = 132;
  const popupLeft = selectedCoordinate ? Math.max(4, Math.min(chartWidth - popupWidth - 4, selectedCoordinate.x - popupWidth / 2)) : 0;
  const popupTop = selectedCoordinate ? Math.max(4, selectedCoordinate.y - 76) : 0;
  const handleChartTouch = (event: GestureResponderEvent) => {
    const locationX = Math.max(0, Math.min(chartWidth, event.nativeEvent.locationX));
    const nextIndex = Math.round(locationX / chartStep);
    const boundedIndex = Math.max(0, Math.min(chartPoints.length - 1, nextIndex));
    setSelectedHistoryIndex((currentIndex) => (currentIndex === boundedIndex ? currentIndex : boundedIndex));
  };
  const selectHorizon = (option: Horizon) => {
    setHorizon(option);
    setSelectedHistoryIndex(null);
  };
  const popupTranslateY = popupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const historyTipTranslateY = historyTipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  useEffect(() => {
    Animated.timing(popupProgress, {
      toValue: selectedHistoryPoint ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [popupProgress, selectedHistoryPoint]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistoryTip() {
      const seen = await SecureStore.getItemAsync(HISTORY_TIP_KEY);
      if (cancelled || seen) return;
      await SecureStore.setItemAsync(HISTORY_TIP_KEY, "1");
      setShowHistoryTip(true);
    }
    loadHistoryTip();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    Animated.timing(historyTipProgress, {
      toValue: showHistoryTip ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [historyTipProgress, showHistoryTip]);

  useEffect(() => {
    if (!showHistoryTip) return;
    const timer = setTimeout(() => setShowHistoryTip(false), 4200);
    return () => clearTimeout(timer);
  }, [showHistoryTip]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRail}>
          <View>
            <Text style={styles.brand}>BrickVal <Text style={styles.pro}>INDEX</Text></Text>
            <Text style={styles.brandMeta}>Sets + minifigures</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan item"
            style={styles.scanButton}
            onPress={() => router.push("/scan")}
          >
            <Text style={styles.scanButtonText}>Scan item</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.eyebrow}>Portfolio value</Text>
          <Text style={styles.total}>{usdFormatter.format(totalValue)}</Text>
          <Text style={styles.caption}>
            Based on sold/listing market values from saved LEGO sets and minifigures
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{setCount}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{minifigureCount}</Text>
              <Text style={styles.statLabel}>Minifigs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatSignedPercent(historyDelta)}</Text>
              <Text style={styles.statLabel}>{horizon} change</Text>
            </View>
          </View>

          <View style={styles.historyBlock}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Value history</Text>
            </View>
            {showHistoryTip ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.historyTip,
                  {
                    opacity: historyTipProgress,
                    transform: [{ translateY: historyTipTranslateY }],
                  },
                ]}
              >
                <Text style={styles.historyTipText}>Tap the line to see value changes over time.</Text>
              </Animated.View>
            ) : null}
            <View
              accessibilityLabel={`Collection value chart, ${latestHistoryLabel}, from ${usdFormatter.format(firstHistoryValue)} to ${usdFormatter.format(totalValue)}`}
              style={[styles.valueGraph, { width: chartWidth, height: chartHeight }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleChartTouch}
              onResponderMove={handleChartTouch}
            >
              <View style={styles.gridLineTop} />
              <View style={styles.gridLineMid} />
              <View style={styles.gridLineBottom} />
              {selectedHistoryPoint ? (
                <>
                  <View style={[styles.chartCursor, { left: selectedX }]} />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.chartPopup,
                      {
                        left: popupLeft,
                        top: popupTop,
                        opacity: popupProgress,
                        transform: [{ translateY: popupTranslateY }],
                      },
                    ]}
                  >
                    <Text style={styles.chartPopupLabel}>{formatTimelineLabel(selectedHistoryPoint.date)}</Text>
                    <Text style={styles.chartPopupValue}>
                      {usdFormatter.format(selectedHistoryPoint.total_value_usd)}
                    </Text>
                  </Animated.View>
                </>
              ) : null}
              <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={ACCENT} stopOpacity="0.2" />
                    <Stop offset="1" stopColor={ACCENT} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {chartAreaPath ? <Path d={chartAreaPath} fill="url(#portfolioFill)" /> : null}
                {chartLinePath ? (
                  <Path
                    d={chartLinePath}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {safeChartCoordinates.map((point, index) => {
                const selected = selectedHistoryIndex === index;
                return (
                  <Circle
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r={selected ? 5 : 3.2}
                    fill={selected ? INK : ACCENT}
                    stroke={selected ? ACCENT : PANEL}
                    strokeWidth={selected ? 2 : 1.6}
                  />
                );
              })}
              </Svg>
            </View>
            <View style={[styles.graphTimeline, { width: chartWidth }]}>
              {chartPoints.map((point) => (
                <Text key={point.date} style={styles.graphTimelineLabel}>
                  {formatTimelineLabel(point.date)}
                </Text>
              ))}
            </View>
            <View style={styles.horizonRow}>
              {(["1M", "3M", "6M"] as Horizon[]).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: horizon === option }}
                  accessibilityLabel={`Show ${option} value history`}
                  style={[styles.horizonPill, horizon === option && styles.horizonPillActive]}
                  onPress={() => selectHorizon(option)}
                >
                  <Text style={[styles.horizonText, horizon === option && styles.horizonTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.graphFooter}>
            <Text style={styles.graphText}>
              {topSet
                ? `Top item · ${topSet.quantity > 1 ? `${topSet.quantity}× ` : ""}${topSet.name}`
                : "Add your first item to start the value history"}
            </Text>
            <Text style={styles.graphDelta}>{pricedUnits} priced units</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Saved inventory</Text>
          <Text style={styles.sectionMeta}>{items.length} total</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyBody}>
              Scan a LEGO set or minifigure, then add the result to start tracking value changes.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start scanning"
              style={styles.emptyAction}
              onPress={() => router.push("/scan")}
            >
              <Text style={styles.emptyActionText}>Start scanning</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {topItems.map((item, index) => {
              const itemLabel = item.item_type === "minifig" ? "Minifig" : "Set";
              return (
                <Pressable
                  key={`${item.item_type}-${item.set_number}-${item.condition}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open details for ${item.name}. ${formatCondition(item.condition)}.`}
                  style={styles.item}
                  onPress={() =>
                    router.push({
                      pathname: "/detail/[itemType]/[setNumber]",
                      params: {
                        itemType: item.item_type,
                        setNumber: item.set_number,
                        condition: item.condition,
                      },
                    })
                  }
                >
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumb} />
                  ) : (
                    <QuestionMarkPlaceholder style={styles.thumb} />
                  )}
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <View style={[styles.itemConditionBadge, item.condition === "used" ? styles.itemConditionBadgeUsed : styles.itemConditionBadgeNew]}>
                      <Text style={[styles.itemConditionText, item.condition === "used" ? styles.itemConditionTextUsed : styles.itemConditionTextNew]}>
                        {formatConditionTag(item.condition)}
                      </Text>
                    </View>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      #{index + 1} · {itemLabel} {item.set_number} · {item.theme}
                    </Text>
                    <Text style={styles.itemSubMeta} numberOfLines={1}>
                      Qty {item.quantity} · {formatCondition(item.condition)}
                    </Text>
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
                  <View style={styles.itemPriceBlock}>
                    <Text style={styles.itemValue}>
                      {item.market_value_usd === null ? "N/A" : usdFormatter.format(getItemTotalValue(item))}
                    </Text>
                    <Text style={styles.itemSource}>
                      Total
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070908" },
  content: { padding: 20, paddingTop: 58, paddingBottom: 112, gap: 24 },
  topRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: INK, fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  pro: { color: ACCENT, fontSize: 11, fontWeight: "900" },
  brandMeta: { color: MUTED, fontSize: 12, fontWeight: "800", marginTop: 3 },
  scanButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(98,199,154,0.08)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: { color: INK, fontSize: 12, fontWeight: "900" },
  hero: {
    minHeight: 450,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 18,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -96,
    right: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(98,199,154,0.13)",
  },
  eyebrow: { color: ACCENT, fontSize: 12, fontWeight: "900", textAlign: "center" },
  total: { color: INK, fontSize: 47, fontWeight: "900", lineHeight: 58, textAlign: "center", letterSpacing: -1.8 },
  caption: { color: MUTED, fontSize: 12, fontWeight: "800", textAlign: "center" },
  muted: { color: MUTED },
  positive: { color: ACCENT },
  negative: { color: DANGER },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    gap: 10,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { color: INK, fontSize: 15, fontWeight: "900" },
  statLabel: { color: SOFT, fontSize: 10, fontWeight: "800", textTransform: "uppercase", textAlign: "center" },
  historyBlock: {
    marginTop: 28,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  historyTip: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(247,244,234,0.12)",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyTipText: { color: INK, fontSize: 11, fontWeight: "800", lineHeight: 15 },
  horizonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "rgba(247,244,234,0.07)",
    padding: 4,
  },
  horizonPill: {
    minHeight: 34,
    minWidth: 62,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  horizonPillActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  horizonText: { color: SOFT, fontSize: 11, fontWeight: "900" },
  horizonTextActive: { color: "#07100c" },
  valueGraph: {
    marginTop: 18,
    alignSelf: "center",
    position: "relative",
  },
  gridLineTop: {
    position: "absolute",
    top: 26,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(153,231,189,0.08)",
  },
  gridLineMid: {
    position: "absolute",
    top: 104,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(153,231,189,0.12)",
  },
  gridLineBottom: {
    position: "absolute",
    bottom: 26,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(153,231,189,0.2)",
  },
  chartCursor: {
    position: "absolute",
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: "rgba(247,244,234,0.38)",
    zIndex: 2,
  },
  chartPopup: {
    position: "absolute",
    zIndex: 4,
    width: 132,
    borderRadius: 18,
    backgroundColor: INK,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  chartPopupLabel: {
    color: "#253129",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chartPopupValue: {
    color: "#07100c",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  graphTimeline: {
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -6,
    paddingHorizontal: 2,
  },
  graphTimelineLabel: {
    color: SOFT,
    flex: 1,
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },
  graphFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  graphText: { flex: 1, color: SOFT, fontSize: 11, fontWeight: "800" },
  graphDelta: { color: ACCENT, fontSize: 11, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionTitle: { color: INK, fontSize: 20, fontWeight: "900" },
  sectionMeta: { color: MUTED, fontSize: 12, fontWeight: "700" },
  empty: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    padding: 18,
    gap: 12,
  },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: "900" },
  emptyBody: { color: MUTED, fontSize: 14, lineHeight: 21 },
  emptyAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  emptyActionText: { color: "#07100c", fontSize: 14, fontWeight: "900" },
  list: { gap: 12 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    padding: 13,
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: "rgba(247,244,234,0.08)" },
  itemCopy: { flex: 1, gap: 4, minWidth: 0 },
  itemName: { color: INK, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  itemConditionBadge: {
    alignSelf: "flex-start",
    minHeight: 22,
    borderRadius: 999,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderWidth: 1,
  },
  itemConditionBadgeNew: {
    borderColor: "rgba(98,199,154,0.34)",
    backgroundColor: "rgba(98,199,154,0.12)",
  },
  itemConditionBadgeUsed: {
    borderColor: "rgba(242,201,76,0.28)",
    backgroundColor: "rgba(242,201,76,0.11)",
  },
  itemConditionText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  itemConditionTextNew: { color: ACCENT },
  itemConditionTextUsed: { color: LEGO_YELLOW },
  itemMeta: { color: MUTED, fontSize: 11, fontWeight: "800" },
  itemSubMeta: { color: SOFT, fontSize: 10, fontWeight: "700" },
  itemDelta: { fontSize: 11, fontWeight: "900" },
  itemPriceBlock: { alignItems: "flex-end", gap: 5, maxWidth: 86 },
  itemValue: { color: INK, fontSize: 15, fontWeight: "900" },
  itemSource: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
