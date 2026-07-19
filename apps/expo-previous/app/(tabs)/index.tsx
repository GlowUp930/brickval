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
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { SymbolView } from "expo-symbols";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
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
  addToCollection,
} from "../../lib/collection";
import { getNativeProStatus } from "../../lib/paywall";
import { lookupSet, normalizeHistoryDate } from "../../lib/api";
import { buildChartAreaPath, interpolateChartLine, sampleChartLine } from "../../lib/chart-motion";
import { useTheme, type ModeColors, type ThemeColors } from "../../lib/ThemeProvider";
import { accents } from "../../lib/theme";
import { QuestionMarkPlaceholder } from "../../components/QuestionMarkPlaceholder";
import { ManualEntrySheet, type ManualEntryHandle } from "../../components/ManualEntrySheet";

const HISTORY_TIP_KEY = "brickval_home_history_tip_seen";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Horizon = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
type CollectionFilter = "all" | "set" | "minifig" | "part";

const HORIZON_DAYS: Record<Horizon, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "YTD": Math.max(1, Math.ceil((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 86400000)),
  "1Y": 365,
  "ALL": 3650,
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

export default function CollectionScreen() {
  const { colors: palette, c, mode } = useTheme();
  const accent = accents.green;
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(palette, c, insets.top, insets.bottom), [palette, c, mode, insets.top, insets.bottom]);
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("1M");
  const [chartHorizon, setChartHorizon] = useState<Horizon>("1M");
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>("all");
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
  const manualEntryRef = useRef<ManualEntryHandle>(null);
  const [manualLookupBusy, setManualLookupBusy] = useState(false);
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
  const filteredItems = topItems.filter((item) => collectionFilter === "all" || item.item_type === collectionFilter);
  const displayHistory = getHistoricalCollectionSeries(items, chartHorizon);
  const firstHistoryValue = displayHistory[0]?.total_value_usd ?? 0;
  const historyDelta = firstHistoryValue > 0 ? ((totalValue - firstHistoryValue) / firstHistoryValue) * 100 : null;
  const pricedUnits = items.reduce((total, item) => total + (item.market_value_usd !== null ? (item.quantity ?? 1) : 0), 0);
  const latestHistoryLabel = horizon === "YTD" ? "Year to date" : `Past ${horizon}`;
  const chartPoints = displayHistory.slice(-14);
  const chartWidth = Math.min(430, Math.max(300, screenWidth - 40));
  const chartHeight = 360;
  const chartPlotHeight = 252;
  const chartBottom = chartHeight - 42;
  const chartStep = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
  const selectedHistoryPoint = selectedHistoryIndex === null ? null : chartPoints[selectedHistoryIndex] ?? null;
  const baseChartCoordinates = buildChartCoordinates(displayHistory.slice(-14), chartWidth, chartHeight, chartBottom, chartPlotHeight);
  const activeChartCoordinates = sampleChartLine(baseChartCoordinates.chartPoints, chartWidth);
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

  const handleManualSetSubmit = async (setNumber: string) => {
    setManualLookupBusy(true);
    try {
      const result = await lookupSet(setNumber, "set");
      const next = await addToCollection(result, { quantity: 1, condition: "new_sealed" });
      setItems(next);
      router.push({
        pathname: "/detail/[itemType]/[setNumber]",
        params: { itemType: "set", setNumber: result.set_number, condition: "new_sealed" },
      });
    } catch {
      Alert.alert("Set not found", "Check the set number and try again.");
    } finally {
      setManualLookupBusy(false);
    }
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
          <Text style={s.brand}>Collection</Text>
          <View style={s.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              style={s.iconButton}
              onPress={() => router.push("/account")}
            >
              <SymbolView
                name={{ ios: "person.crop.circle", android: "account_circle", web: "account_circle" }}
                size={27}
                tintColor={c.text}
                fallback={<Text style={s.profileFallback}>●</Text>}
              />
            </Pressable>
          </View>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>COLLECTION VALUE</Text>
          <Text style={s.total}>{usdFormatter.format(totalValue)}</Text>
          <Text
            style={[
              s.valueMove,
              { color: historyDelta !== null && historyDelta < 0 ? palette.semantic.danger : accents.green.primary },
            ]}
          >
            {historyDelta === null ? "$0 (0%) Today" : `${totalValue - firstHistoryValue >= 0 ? "+" : "-"}${usdFormatter.format(Math.abs(totalValue - firstHistoryValue))} (${formatSignedPercent(historyDelta)}) Today`}
          </Text>

          <View style={s.historyBlock}>
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
                    <Stop offset="0" stopColor={accent.primary} stopOpacity="0.12" />
                    <Stop offset="1" stopColor={accent.primary} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {chartAreaPath ? <Path ref={morphFillRef} d={chartAreaPath} fill="url(#portfolioFill)" /> : null}
                {chartLinePath ? (
                  <Path
                    ref={morphLineRef}
                    d={chartLinePath}
                    fill="none"
                    stroke={accent.primary}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
            <View style={s.horizonRow}>
              {(["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"] as Horizon[]).map((option) => (
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
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Inventory</Text>
          <Text style={s.sectionMeta}>{pricedUnits} priced units</Text>
        </View>
        <View style={s.filterRow}>
          {[
            { key: "all" as const, label: "All", count: items.length },
            { key: "set" as const, label: "Sets", count: setCount },
            { key: "minifig" as const, label: "Minifigs", count: minifigureCount },
            { key: "part" as const, label: "Parts", count: partCount },
          ].map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: collectionFilter === option.key }}
              accessibilityLabel={`Show ${option.label}`}
              style={[s.filterPill, collectionFilter === option.key && s.filterPillActive]}
              onPress={() => setCollectionFilter(option.key)}
            >
              <Text style={[s.filterText, collectionFilter === option.key && s.filterTextActive]}>
                {option.label} {option.count}
              </Text>
            </Pressable>
          ))}
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
          <View style={s.cardGrid}>
            {filteredItems.map((item) => {
              return (
                <CollectionCard
                  key={`${item.item_type}-${item.set_number}-${item.condition}-${item.color_id ?? "base"}`}
                  item={item}
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
                  styles={s}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a LEGO set by number"
        disabled={manualLookupBusy}
        onPress={() => manualEntryRef.current?.open()}
        style={[s.manualFabPosition, { bottom: Math.max(104, insets.bottom + 82) }]}
      >
        {Platform.OS === "ios" && isLiquidGlassAvailable() ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="dark"
            tintColor={accent.primary}
            style={s.manualFab}
          >
            {manualLookupBusy ? <ActivityIndicator color={c.text} /> : <SymbolView name="plus" size={25} tintColor={c.text} />}
          </GlassView>
        ) : (
          <View style={[s.manualFab, { backgroundColor: accent.primary }]}>
            {manualLookupBusy ? <ActivityIndicator color={accent.contrast} /> : <SymbolView name="plus" size={25} tintColor={accent.contrast} />}
          </View>
        )}
      </Pressable>
      <ManualEntrySheet ref={manualEntryRef} mode="set" onSubmit={handleManualSetSubmit} />
    </View>
  );
}

function CollectionCard({
  item,
  onPress,
  onDelete,
  styles,
}: {
  item: CollectionItem;
  onPress: () => void;
  onDelete: (target: {
    set_number: string;
    item_type: CollectionItem["item_type"];
    condition: CollectionItem["condition"];
    color_id?: number | null;
  }) => Promise<void>;
  styles: ReturnType<typeof getStyles>;
}) {
  const totalValue = item.market_value_usd === null ? null : Math.round(item.market_value_usd * (item.quantity ?? 1));
  const itemLabel = item.item_type === "part" ? "Part" : item.item_type === "minifig" ? "Minifig" : "Set";
  const conditionLabel = item.condition === "used" ? "Used" : "New";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${item.name}`}
      style={({ pressed }) => [styles.collectionCard, pressed && styles.collectionCardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardImageWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <QuestionMarkPlaceholder style={styles.cardImage} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardValue}>{totalValue === null ? "N/A" : usdFormatter.format(totalValue)}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          #{item.set_number} · {itemLabel} · x{item.quantity}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {conditionLabel}{item.item_type === "part" && item.color_name ? ` · ${item.color_name}` : ""}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        style={styles.cardRemove}
        onPress={(event) => {
          event.stopPropagation?.();
          void onDelete({
            set_number: item.set_number,
            item_type: item.item_type,
            condition: item.condition,
            color_id: item.item_type === "part" ? item.color_id ?? null : undefined,
          })
        }}
        hitSlop={8}
      >
        <Text style={styles.cardRemoveText}>Remove</Text>
      </Pressable>
    </Pressable>
  );
}

function getStyles(palette: ThemeColors, m: ModeColors, safeTop: number, safeBottom: number) {
  const accentRgb = `${parseInt(m.primary.slice(1, 3), 16)}, ${parseInt(m.primary.slice(3, 5), 16)}, ${parseInt(m.primary.slice(5, 7), 16)}`;
  const textRgb = `${parseInt(m.text.slice(1, 3), 16)}, ${parseInt(m.text.slice(3, 5), 16)}, ${parseInt(m.text.slice(5, 7), 16)}`;
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: m.background },
  manualFabPosition: { position: "absolute", right: 20, zIndex: 20, borderRadius: 30 },
  manualFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `rgba(${accentRgb}, 0.62)`,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Math.max(70, safeTop + 22),
    paddingBottom: Math.max(112, safeBottom + 96),
    gap: 22,
  },
  topRail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: m.text, fontSize: 32, fontWeight: "900" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 18 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  profileFallback: { color: m.text, fontSize: 20 },
  hero: {
    minHeight: 520,
    backgroundColor: m.background,
    paddingTop: 8,
    overflow: "hidden",
  },
  eyebrow: { color: m.textMuted, fontSize: 16, fontWeight: "900", marginTop: 4 },
  total: { color: m.text, fontSize: 58, fontWeight: "900", lineHeight: 66 },
  valueMove: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  caption: { color: m.textMuted, fontSize: 12, fontWeight: "800" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    gap: 10,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { color: m.text, fontSize: 15, fontWeight: "900" },
  statLabel: { color: m.textDisabled, fontSize: 10, fontWeight: "800", textTransform: "uppercase", textAlign: "center" },
  historyBlock: {
    marginTop: 22,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: { color: m.text, fontSize: 14, fontWeight: "900" },
  historyTip: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: m.surface,
    borderWidth: 1,
    borderColor: m.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  historyTipText: { color: m.text, fontSize: 10, fontWeight: "800", lineHeight: 14 },
  horizonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 0,
    marginTop: 10,
  },
  horizonPill: {
    minHeight: 42,
    minWidth: 42,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  horizonPillActive: {
    borderColor: accents.green.primary,
    borderBottomColor: accents.green.primary,
  },
  horizonText: { color: "#5C6166", fontSize: 16, fontWeight: "800" },
  horizonTextActive: { color: accents.green.primary },
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
    backgroundColor: `rgba(${textRgb}, 0.32)`,
    zIndex: 2,
  },
  chartPopup: {
    position: "absolute",
    zIndex: 4,
    width: 124,
    borderRadius: 10,
    backgroundColor: "#000000",
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000000",
  },
  chartPopupLabel: {
    color: "#C2C5CA",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chartPopupValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  selectedPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: m.primary,
    borderWidth: 2,
    borderColor: m.background,
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
    color: m.textMuted,
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
  graphText: { flex: 1, color: m.textDisabled, fontSize: 11, fontWeight: "800" },
  graphDelta: { color: palette.semantic.success, fontSize: 11, fontWeight: "900" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: -4 },
  sectionTitle: { color: m.text, fontSize: 22, fontWeight: "900" },
  sectionMeta: { color: m.textMuted, fontSize: 12, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: -8,
  },
  filterPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: {
    borderColor: m.primary,
    backgroundColor: `rgba(${accentRgb}, 0.14)`,
  },
  filterText: {
    color: m.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  filterTextActive: {
    color: m.text,
  },
  collectionLimit: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
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
    backgroundColor: m.primary,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  proStatusPillText: { color: "#07100c", fontSize: 10, fontWeight: "900" },
  collectionLimitLabel: { color: m.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  collectionLimitLabelPro: { color: m.primary },
  collectionLimitText: { color: m.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  collectionLimitTextPro: { color: m.text, fontSize: 13, lineHeight: 18 },
  empty: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
    padding: 18,
    gap: 12,
  },
  emptyTitle: { color: m.text, fontSize: 18, fontWeight: "900" },
  emptyBody: { color: m.textMuted, fontSize: 14, lineHeight: 21 },
  emptyAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: m.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  emptyActionText: { color: "#07100c", fontSize: 14, fontWeight: "900" },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  collectionCard: {
    width: "48%",
    minHeight: 238,
    borderRadius: 8,
    backgroundColor: m.background,
    overflow: "hidden",
  },
  collectionCardPressed: {
    opacity: 0.78,
  },
  cardImageWrap: {
    minHeight: 118,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: m.surface,
    borderWidth: 1,
    borderColor: m.border,
    borderRadius: 8,
    margin: 8,
    padding: 12,
  },
  cardImage: {
    width: "100%",
    height: 98,
    borderRadius: 10,
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardName: {
    color: m.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
    minHeight: 36,
  },
  cardValue: {
    color: m.text,
    fontSize: 20,
    fontWeight: "900",
  },
  cardMeta: {
    color: m.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  cardRemove: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: m.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRemoveText: {
    color: m.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  });
}
