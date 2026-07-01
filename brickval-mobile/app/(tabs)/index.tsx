import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  AccessibilityInfo,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Paths, File } from "expo-file-system";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  CollectionItem,
  getCollection,
  getCollectionValue,
  getItemTotalValue,
  removeFromCollection,
} from "../../lib/collection";
import { getNativeProStatus } from "../../lib/paywall";
import { normalizeHistoryDate } from "../../lib/api";
import { CollectionSwipeRow } from "../../components/CollectionSwipeRow";
import { buildChartAreaPath, interpolateChartLine, sampleChartLine } from "../../lib/chart-motion";
import { useTheme, type ThemeColors } from "../../lib/ThemeProvider";

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

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatTimelineLabel(value: string) {
  const normalized = normalizeHistoryDate(value);
  if (!normalized) return "";
  const date = new Date(`${normalized}T00:00:00Z`);
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

function buildChartCoordinates(
  history: { date: string; total_value_usd: number }[],
  chartWidth: number,
  chartHeight: number,
  chartBottom: number,
  chartPlotHeight: number
) {
  const historyValues = history.map((point) => point.total_value_usd);
  const minHistoryValue = historyValues.length ? Math.min(...historyValues) : 0;
  const maxHistoryValue = historyValues.length ? Math.max(...historyValues) : 0;
  const historyRange = Math.max(maxHistoryValue - minHistoryValue, 1);
  const hasHistoryMovement = historyValues.some((value) => value !== minHistoryValue);
  const chartStep = history.length > 1 ? chartWidth / (history.length - 1) : chartWidth;
  const chartPoints = history.map((point, index) => {
    const x = history.length > 1 ? index * chartStep : chartWidth / 2;
    const y = hasHistoryMovement
      ? chartBottom - ((point.total_value_usd - minHistoryValue) / historyRange) * chartPlotHeight
      : chartHeight / 2;
    return { ...point, x, y };
  });

  return { chartPoints, minHistoryValue, maxHistoryValue, historyRange, hasHistoryMovement };
}

type HistoryBucket = { date: Date; label: string; total_value_usd: number };

function getHistoricalCollectionSeries(items: CollectionItem[], horizon: Horizon): {
  date: string;
  total_value_usd: number;
}[] {
  const today = new Date();
  const days = HORIZON_DAYS[horizon];
  const start = addDays(today, -days);
  const bucketCount = 8;
  const bucketStep = days / (bucketCount - 1);
  const buckets: HistoryBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const date = addDays(start, Math.round(index * bucketStep));
    return { date, label: isoDate(date), total_value_usd: 0 };
  });

  return buckets.map((bucket): { date: string; total_value_usd: number } => {
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
  const { colors: c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(c, insets.top, insets.bottom), [c, mode, insets.top, insets.bottom]);
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("6M");
  const [chartHorizon, setChartHorizon] = useState<Horizon>("6M");
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [showHistoryTip, setShowHistoryTip] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [proStatus, setProStatus] = useState<boolean | null>(null);
  const popupProgress = useRef(new Animated.Value(0)).current;
  const historyTipProgress = useRef(new Animated.Value(0)).current;
  const proBannerProgress = useRef(new Animated.Value(0)).current;
  const morphRafRef = useRef<number | null>(null);
  const currentMorphShapeRef = useRef<{ x: number; y: number }[]>([]);
  const morphLineRef = useRef<any>(null);
  const morphFillRef = useRef<any>(null);
  const indexTapCount = useRef(0);
  const indexTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIndexTap = () => {
    indexTapCount.current += 1;
    if (indexTapTimer.current) clearTimeout(indexTapTimer.current);
    if (indexTapCount.current >= 5) {
      indexTapCount.current = 0;
      SecureStore.deleteItemAsync("has_completed_onboarding").catch(() => {});
      SecureStore.deleteItemAsync("primary_goal").catch(() => {});
      router.replace("/onboarding");
      return;
    }
    indexTapTimer.current = setTimeout(() => { indexTapCount.current = 0; }, 2000);
  };

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotionEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCollection() {
        const [collection, nextProStatus] = await Promise.all([
          getCollection(),
          getNativeProStatus(),
        ]);
        if (!active) return;
        setItems(collection);
        setProStatus(nextProStatus);
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
  const partCount = items.reduce((total, item) => total + (item.item_type === "part" ? item.quantity ?? 1 : 0), 0);
  const topItems = [...items].sort((a, b) => getItemTotalValue(b) - getItemTotalValue(a));
  const displayHistory = getHistoricalCollectionSeries(items, chartHorizon);
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
  const baseChartCoordinates = buildChartCoordinates(displayHistory.slice(-14), chartWidth, chartHeight, chartBottom, chartPlotHeight);
  const activeChartCoordinates = sampleChartLine(baseChartCoordinates.chartPoints, chartWidth);
  const timelinePoints = chartPoints.length <= 3
    ? chartPoints
    : [chartPoints[0], chartPoints[Math.floor((chartPoints.length - 1) / 2)], chartPoints[chartPoints.length - 1]];
  const chartLinePath = getSmoothPath(activeChartCoordinates);
  const chartAreaPath = buildChartAreaPath(activeChartCoordinates, chartBottom);
  const selectedCoordinate = selectedHistoryIndex === null ? null : baseChartCoordinates.chartPoints[selectedHistoryIndex] ?? null;
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
    if (option === horizon) return;
    if (reduceMotionEnabled) {
      setHorizon(option);
      setChartHorizon(option);
      setSelectedHistoryIndex(null);
      return;
    }
    if (morphRafRef.current !== null) {
      cancelAnimationFrame(morphRafRef.current);
      morphRafRef.current = null;
    }
    const nextHistory = getHistoricalCollectionSeries(items, option).slice(-14);
    const currentShape = currentMorphShapeRef.current.length
      ? currentMorphShapeRef.current
      : sampleChartLine(baseChartCoordinates.chartPoints, chartWidth);
    const nextCoordinates = buildChartCoordinates(nextHistory, chartWidth, chartHeight, chartBottom, chartPlotHeight).chartPoints;
    const nextShape = sampleChartLine(nextCoordinates, chartWidth);
    const lineTarget = morphLineRef.current;
    const fillTarget = morphFillRef.current;
    const start = performance.now();
    const duration = 320;
    const animateFrame = (now: number) => {
      const eased = Easing.out(Easing.cubic)(Math.min(1, (now - start) / duration));
      const nextFrame = interpolateChartLine(currentShape, nextShape, eased);
      currentMorphShapeRef.current = nextFrame;
      const nextLinePath = getSmoothPath(nextFrame);
      const nextFillPath = buildChartAreaPath(nextFrame, chartBottom);
      lineTarget?.setNativeProps?.({ d: nextLinePath });
      fillTarget?.setNativeProps?.({ d: nextFillPath });
      if (eased < 1) {
        morphRafRef.current = requestAnimationFrame(animateFrame);
        return;
      }
      morphRafRef.current = null;
      currentMorphShapeRef.current = nextShape;
      setChartHorizon(option);
    };
    setHorizon(option);
    setSelectedHistoryIndex(null);
    morphRafRef.current = requestAnimationFrame(animateFrame);
  };
  const popupTranslateY = popupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const historyTipTranslateY = historyTipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const proBannerTranslateY = proBannerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const handleDeleteItem = async (target: {
    set_number: string;
    item_type: CollectionItem["item_type"];
    condition: CollectionItem["condition"];
    color_id?: number | null;
  }) => {
    const next = await removeFromCollection(target);
    setItems(next);
  };

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
      try {
        const seen = await SecureStore.getItemAsync(HISTORY_TIP_KEY);
        if (cancelled || seen) return;
        await SecureStore.setItemAsync(HISTORY_TIP_KEY, "1");
        setShowHistoryTip(true);
      } catch (error) {
        console.warn("History tip storage unavailable.", error);
      }
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

  useEffect(() => {
    Animated.timing(proBannerProgress, {
      toValue: proStatus ? 1 : 0,
      duration: reduceMotionEnabled ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [proBannerProgress, proStatus, reduceMotionEnabled]);

  useEffect(() => {
    if (morphRafRef.current !== null) return;
    currentMorphShapeRef.current = sampleChartLine(baseChartCoordinates.chartPoints, chartWidth);
  }, [baseChartCoordinates.chartPoints, chartWidth]);

  useEffect(() => {
    return () => {
      if (morphRafRef.current !== null) {
        cancelAnimationFrame(morphRafRef.current);
      }
    };
  }, []);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.topRail}>
          <View>
            <Text style={s.brand}>BrickVal <Pressable onPress={handleIndexTap}><Text style={s.pro}>INDEX</Text></Pressable></Text>
            <Text style={s.brandMeta}>Sets + minifigures + parts</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan item"
            style={s.scanButton}
            onPress={() => router.push("/scan")}
          >
            <Text style={s.scanButtonText}>Scan item</Text>
          </Pressable>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>Portfolio value</Text>
          <Text style={s.total}>{usdFormatter.format(totalValue)}</Text>
          <Text style={s.caption}>
            Based on sold/listing market values from saved LEGO sets, minifigures, and parts
          </Text>

          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{setCount}</Text>
              <Text style={s.statLabel}>Sets</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>{minifigureCount}</Text>
              <Text style={s.statLabel}>Minifigs</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statValue}>{partCount}</Text>
              <Text style={s.statLabel}>Parts</Text>
            </View>
          </View>

          <View style={s.historyBlock}>
            <View style={s.historyHeader}>
              <Text style={s.historyTitle}>Value history</Text>
            </View>
            {showHistoryTip ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  s.historyTip,
                  {
                    opacity: historyTipProgress,
                    transform: [{ translateY: historyTipTranslateY }],
                  },
                ]}
              >
                <Text style={s.historyTipText}>Tap the line to inspect a point.</Text>
              </Animated.View>
            ) : null}
            <View
              accessibilityLabel={`Collection value chart, ${latestHistoryLabel}, from ${usdFormatter.format(firstHistoryValue)} to ${usdFormatter.format(totalValue)}`}
              style={[s.valueGraph, { width: chartWidth, height: chartHeight }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleChartTouch}
              onResponderMove={handleChartTouch}
            >
              <View style={s.gridLineTop} />
              <View style={s.gridLineMid} />
              <View style={s.gridLineBottom} />
              {selectedHistoryPoint ? (
                <>
                  <View style={[s.chartCursor, { left: selectedX }]} />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      s.chartPopup,
                      {
                        left: popupLeft,
                        top: popupTop,
                        opacity: popupProgress,
                        transform: [{ translateY: popupTranslateY }],
                      },
                    ]}
                  >
                    <Text style={s.chartPopupLabel}>{formatTimelineLabel(selectedHistoryPoint.date)}</Text>
                    <Text style={s.chartPopupValue}>
                      {usdFormatter.format(selectedHistoryPoint.total_value_usd)}
                    </Text>
                  </Animated.View>
                  <View
                    style={[
                      s.selectedPoint,
                      {
                        left: selectedX - 4,
                        top:
                          selectedCoordinate && selectedCoordinate.y >= 4
                            ? selectedCoordinate.y - 4
                            : selectedCoordinate?.y ?? 0,
                      },
                    ]}
                  />
                </>
              ) : null}
              <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={c.lego.yellow} stopOpacity="0.12" />
                    <Stop offset="1" stopColor={c.lego.yellow} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {chartAreaPath ? <Path ref={morphFillRef} d={chartAreaPath} fill="url(#portfolioFill)" /> : null}
                {chartLinePath ? (
                  <Path
                    ref={morphLineRef}
                    d={chartLinePath}
                    fill="none"
                    stroke={c.lego.yellow}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
            <View style={[s.graphTimeline, { width: chartWidth }]}>
              {timelinePoints.map((point) => (
                <Text key={point.date} style={s.graphTimelineLabel}>
                  {formatTimelineLabel(point.date)}
                </Text>
              ))}
            </View>
            <View style={s.horizonRow}>
              {(["1M", "3M", "6M"] as Horizon[]).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: horizon === option }}
                  accessibilityLabel={`Show ${option} value history`}
                  style={[s.horizonPill, horizon === option && s.horizonPillActive]}
                  onPress={() => selectHorizon(option)}
                >
                  <Text style={[s.horizonText, horizon === option && s.horizonTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={s.graphFooter}>
            <Text style={s.graphText}>
              {topSet
                ? `Top item · ${topSet.quantity > 1 ? `${topSet.quantity}× ` : ""}${topSet.name}`
                : "Add your first item to start the value history"}
            </Text>
            <Text style={s.graphDelta}>{pricedUnits} priced units</Text>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Saved inventory</Text>
          <Text style={s.sectionMeta}>{items.length} total</Text>
        </View>
        {proStatus ? (
          <Animated.View
            accessibilityLabel="BrickVal Pro active. Unlimited scans are enabled."
            style={[
              s.collectionLimit,
              s.collectionLimitPro,
              {
                opacity: reduceMotionEnabled ? 1 : proBannerProgress,
                transform: reduceMotionEnabled ? [] : [{ translateY: proBannerTranslateY }],
              },
            ]}
          >
            <View style={s.proStatusTop}>
              <Text style={[s.collectionLimitLabel, s.collectionLimitLabelPro]}>BrickVal Pro</Text>
              <View style={s.proStatusPill}>
                <Text style={s.proStatusPillText}>Active</Text>
              </View>
            </View>
            <Text style={[s.collectionLimitText, s.collectionLimitTextPro]}>
              Unlimited scans are on. Keep checking LEGO values without the free-plan limit.
            </Text>
          </Animated.View>
        ) : (
          <View style={s.collectionLimit}>
            <Text style={s.collectionLimitLabel}>Free plan</Text>
            <Text style={s.collectionLimitText}>Save up to 10 LEGO items. Pro unlocks unlimited collection space.</Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No items yet</Text>
              <Text style={s.emptyBody}>
              Scan a LEGO set, minifigure, or part, then add the result to start tracking value changes.
              </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start scanning"
              style={s.emptyAction}
              onPress={() => router.push("/scan")}
            >
              <Text style={s.emptyActionText}>Start scanning</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.list}>
            {topItems.map((item, index) => {
              return (
                <CollectionSwipeRow
                  key={`${item.item_type}-${item.set_number}-${item.condition}-${item.color_id ?? "base"}`}
                  item={item}
                  index={index}
                  onPress={() =>
                    router.push({
                      pathname: "/detail/[itemType]/[setNumber]",
                      params: {
                        itemType: item.item_type,
                        setNumber: item.set_number,
                        condition: item.condition,
                        colorId: item.item_type === "part" ? String(item.color_id ?? "") : undefined,
                      },
                    })
                  }
                  onDelete={handleDeleteItem}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(c: ThemeColors, safeTop: number, safeBottom: number) {
  const accentRgb = `${parseInt(c.lego.yellow.slice(1, 3), 16)}, ${parseInt(c.lego.yellow.slice(3, 5), 16)}, ${parseInt(c.lego.yellow.slice(5, 7), 16)}`;
  const textRgb = `${parseInt(c.dark.text.slice(1, 3), 16)}, ${parseInt(c.dark.text.slice(3, 5), 16)}, ${parseInt(c.dark.text.slice(5, 7), 16)}`;
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.dark.background },
  content: {
    padding: 20,
    paddingTop: Math.max(58, safeTop + 18),
    paddingBottom: Math.max(112, safeBottom + 96),
    gap: 24,
  },
  topRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: c.dark.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.4 },
  pro: { color: c.lego.yellow, fontSize: 11, fontWeight: "900" },
  brandMeta: { color: c.dark.textMuted, fontSize: 12, fontWeight: "800", marginTop: 3 },
  scanButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: `rgba(${accentRgb}, 0.08)`,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: { color: c.dark.text, fontSize: 12, fontWeight: "900" },
  hero: {
    minHeight: 450,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.backgroundElevated,
    padding: 18,
    overflow: "hidden",
  },
  eyebrow: { color: c.lego.yellow, fontSize: 12, fontWeight: "900", textAlign: "center" },
  total: { color: c.dark.text, fontSize: 47, fontWeight: "900", lineHeight: 58, textAlign: "center", letterSpacing: -1.8 },
  caption: { color: c.dark.textMuted, fontSize: 12, fontWeight: "800", textAlign: "center" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    gap: 10,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { color: c.dark.text, fontSize: 15, fontWeight: "900" },
  statLabel: { color: c.dark.textDisabled, fontSize: 10, fontWeight: "800", textTransform: "uppercase", textAlign: "center" },
  historyBlock: {
    marginTop: 28,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: { color: c.dark.text, fontSize: 14, fontWeight: "900" },
  historyTip: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  historyTipText: { color: c.dark.text, fontSize: 10, fontWeight: "800", lineHeight: 14 },
  horizonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: `rgba(${textRgb}, 0.07)`,
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
    backgroundColor: c.lego.yellow,
    borderColor: c.lego.yellow,
  },
  horizonText: { color: c.dark.textDisabled, fontSize: 11, fontWeight: "900" },
  horizonTextActive: { color: "#07100c" },
  valueGraph: {
    marginTop: 18,
    alignSelf: "center",
    position: "relative",
  },
  gridLineTop: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  gridLineMid: {
    position: "absolute",
    top: 102,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  gridLineBottom: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chartCursor: {
    position: "absolute",
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    zIndex: 2,
  },
  chartPopup: {
    position: "absolute",
    zIndex: 4,
    width: 124,
    borderRadius: 14,
    backgroundColor: "rgba(7,9,8,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chartPopupLabel: {
    color: c.dark.textDisabled,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chartPopupValue: {
    color: c.dark.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  selectedPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.lego.yellow,
    borderWidth: 2,
    borderColor: "#0b0f0d",
    zIndex: 3,
  },
  graphTimeline: {
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
    paddingHorizontal: 2,
  },
  graphTimelineLabel: {
    color: c.dark.textMuted,
    flex: 1,
    fontSize: 8,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  graphFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  graphText: { flex: 1, color: c.dark.textDisabled, fontSize: 11, fontWeight: "800" },
  graphDelta: { color: c.semantic.success, fontSize: 11, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sectionTitle: { color: c.dark.text, fontSize: 20, fontWeight: "900" },
  sectionMeta: { color: c.dark.textMuted, fontSize: 12, fontWeight: "700" },
  collectionLimit: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: "rgba(247,244,234,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  collectionLimitPro: {
    borderColor: `rgba(${accentRgb}, 0.34)`,
    backgroundColor: `rgba(${accentRgb}, 0.1)`,
    gap: 8,
  },
  proStatusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  proStatusPill: {
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: c.lego.yellow,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  proStatusPillText: { color: "#07100c", fontSize: 10, fontWeight: "900" },
  collectionLimitLabel: { color: c.dark.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  collectionLimitLabelPro: { color: c.lego.yellow },
  collectionLimitText: { color: c.dark.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  collectionLimitTextPro: { color: c.dark.text, fontSize: 13, lineHeight: 18 },
  empty: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.surface,
    padding: 18,
    gap: 12,
  },
  emptyTitle: { color: c.dark.text, fontSize: 18, fontWeight: "900" },
  emptyBody: { color: c.dark.textMuted, fontSize: 14, lineHeight: 21 },
  emptyAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: c.lego.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  emptyActionText: { color: "#07100c", fontSize: 14, fontWeight: "900" },
  list: { gap: 12 },
  });
}
