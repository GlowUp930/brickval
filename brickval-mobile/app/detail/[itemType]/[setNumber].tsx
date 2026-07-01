import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
  Image,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { CollectionItem, getCollection, getItemTotalValue } from "../../../lib/collection";
import { normalizeHistoryDate } from "../../../lib/api";
import { QuestionMarkPlaceholder } from "../../../components/QuestionMarkPlaceholder";
import { buildChartAreaPath, interpolateChartLine, sampleChartLine } from "../../../lib/chart-motion";
import { useTheme } from "../../../lib/ThemeProvider";
import { type ThemeColors } from "../../../lib/theme";
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
type Horizon = "1M" | "3M" | "6M";
const HORIZON_DAYS: Record<Horizon, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
};
type HistoryPoint = CollectionItem["market_history"][number];
type ChartPoint = HistoryPoint & { x: number; y: number; total: number };
type CollectorField = {
  label: string;
  value: string;
};

function formatCondition(value: CollectionItem["condition"]) {
  return value === "used" ? "Used" : "New / sealed";
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

function getHistoryWindow(history: HistoryPoint[], horizon: Horizon) {
  const days = HORIZON_DAYS[horizon];
  const startIso = isoDate(addDays(new Date(), -days));
  const normalizedHistory = history
    .map((point) => ({
      ...point,
      date: normalizeHistoryDate(point.date) ?? "",
    }))
    .filter((point) => point.date && Number.isFinite(point.price_usd))
    .sort((a, b) => a.date.localeCompare(b.date));

  const windowedHistory = normalizedHistory.filter((point) => point.date >= startIso);
  return windowedHistory.length > 0 ? windowedHistory : normalizedHistory.slice(-1);
}

function countSalesInWindow(history: HistoryPoint[], horizon: Horizon) {
  const startIso = isoDate(addDays(new Date(), -HORIZON_DAYS[horizon]));
  return history.filter((point) => {
    const normalized = normalizeHistoryDate(point.date);
    return normalized ? normalized >= startIso : false;
  }).length;
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
  history: HistoryPoint[],
  chartWidth: number,
  chartHeight: number,
  chartBottom: number,
  quantity: number
) {
  const values = history.map((point) => point.price_usd * quantity);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const valueRange = Math.max(maxValue - minValue, 1);
  const hasMovement = values.some((value) => value !== minValue);
  const chartStep = history.length > 1 ? chartWidth / (history.length - 1) : chartWidth;

  return history.map((point, index) => {
    const x = history.length > 1 ? index * chartStep : chartWidth / 2;
    const total = point.price_usd * quantity;
    const y = hasMovement ? chartBottom - ((total - minValue) / valueRange) * 150 : chartHeight / 2;
    return { ...point, x, y, total };
  });
}

export default function ItemDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { colors: c } = useTheme();
  const s = useMemo(() => getStyles(c), [c]);
  const params = useLocalSearchParams<{
    itemType?: string | string[];
    setNumber?: string | string[];
    condition?: string | string[];
    colorId?: string | string[];
  }>();
  const itemType = Array.isArray(params.itemType) ? params.itemType[0] : params.itemType;
  const setNumber = Array.isArray(params.setNumber) ? params.setNumber[0] : params.setNumber;
  const conditionParam = Array.isArray(params.condition) ? params.condition[0] : params.condition;
  const colorIdParam = Array.isArray(params.colorId) ? params.colorId[0] : params.colorId;
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("6M");
  const [chartHorizon, setChartHorizon] = useState<Horizon>("6M");
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const popupProgress = useRef(new Animated.Value(0)).current;
  const morphRafRef = useRef<number | null>(null);
  const currentMorphShapeRef = useRef<{ x: number; y: number }[]>([]);
  const morphLineRef = useRef<any>(null);
  const morphFillRef = useRef<any>(null);

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

  const matchingItems = items.filter((entry) => {
    if (entry.set_number !== setNumber || entry.item_type !== itemType) return false;
    if (entry.item_type !== "part") return true;
    if (!colorIdParam) return true;
    return String(entry.color_id ?? "") === colorIdParam;
  });
  const item =
    conditionParam === "used"
      ? matchingItems.find((entry) => entry.condition === "used")
      : conditionParam === "new_sealed"
        ? matchingItems.find((entry) => entry.condition === "new_sealed")
        : matchingItems.find((entry) => entry.condition === "new_sealed") ?? matchingItems[0];
  const quantity = item?.quantity ?? 1;
  const unitValue = item?.market_value_usd ?? null;
  const totalValue = item ? getItemTotalValue(item) : 0;
  const history: HistoryPoint[] = (item?.market_history ?? [])
    .filter((point: HistoryPoint) => point.date && Number.isFinite(point.price_usd))
    .sort((a: HistoryPoint, b: HistoryPoint) => a.date.localeCompare(b.date));
  const windowedHistory = getHistoryWindow(history, chartHorizon);
  const salesInWindow = countSalesInWindow(history, horizon);
  const chartWidth = Math.min(360, Math.max(260, screenWidth - 40));
  const chartHeight = 220;
  const chartBottom = chartHeight - 26;
  const chartPoints: ChartPoint[] = windowedHistory.length
    ? buildChartCoordinates(windowedHistory, chartWidth, chartHeight, chartBottom, quantity)
    : item
      ? [{ date: isoDate(new Date(item.added_at)), price_usd: unitValue ?? 0, source: "bricklink" as const, x: chartWidth / 2, y: chartBottom / 2, total: totalValue }]
      : [];
  const activeChartPoints = sampleChartLine(chartPoints, chartWidth);
  const chartLinePath = getSmoothPath(activeChartPoints);
  const chartAreaPath = buildChartAreaPath(activeChartPoints, chartBottom);
  const chartStep = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
  const uniqueTimelinePoints = chartPoints.filter((point, index) => {
    if (index === 0) return true;
    return normalizeHistoryDate(point.date) !== normalizeHistoryDate(chartPoints[index - 1].date);
  });
  const timelinePoints = uniqueTimelinePoints.length <= 3
    ? uniqueTimelinePoints
    : [
        uniqueTimelinePoints[0],
        uniqueTimelinePoints[Math.floor((uniqueTimelinePoints.length - 1) / 2)],
        uniqueTimelinePoints[uniqueTimelinePoints.length - 1],
      ];
  const clampTimelineLeft = (x: number) => Math.max(0, Math.min(chartWidth - 52, x - 26));
  const selectedHistoryPoint = selectedHistoryIndex === null ? null : chartPoints[selectedHistoryIndex] ?? null;
  const selectedX = selectedHistoryPoint?.x ?? 0;
  const popupWidth = 132;
  const popupLeft = selectedHistoryPoint
    ? Math.max(4, Math.min(chartWidth - popupWidth - 4, selectedHistoryPoint.x - popupWidth / 2))
    : 0;
  const popupTop = selectedHistoryPoint ? Math.max(4, selectedHistoryPoint.y - 76) : 0;

  const handleChartTouch = (event: GestureResponderEvent) => {
    const locationX = Math.max(0, Math.min(chartWidth, event.nativeEvent.locationX));
    const nextIndex = Math.round(locationX / chartStep);
    const boundedIndex = Math.max(0, Math.min(chartPoints.length - 1, nextIndex));
    setSelectedHistoryIndex((currentIndex) => (currentIndex === boundedIndex ? currentIndex : boundedIndex));
  };

  useEffect(() => {
    Animated.timing(popupProgress, {
      toValue: selectedHistoryPoint ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [popupProgress, selectedHistoryPoint]);

  const popupTranslateY = popupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  useEffect(() => {
    return () => {
      if (morphRafRef.current !== null) {
        cancelAnimationFrame(morphRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (morphRafRef.current !== null) return;
    currentMorphShapeRef.current = sampleChartLine(chartPoints, chartWidth);
  }, [chartPoints, chartWidth]);

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
    const nextHistory = getHistoryWindow(history, option);
    const currentShape = currentMorphShapeRef.current.length ? currentMorphShapeRef.current : sampleChartLine(chartPoints, chartWidth);
    const nextShape = sampleChartLine(buildChartCoordinates(nextHistory, chartWidth, chartHeight, chartBottom, quantity), chartWidth);
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
    setSelectedHistoryIndex(null);
    setHorizon(option);
    morphRafRef.current = requestAnimationFrame(animateFrame);
  };

  if (!item) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Item not found</Text>
          <Text style={s.emptyBody}>This saved item is no longer on this phone.</Text>
        </View>
      </View>
    );
  }

  const collectorFields: CollectorField[] = (
    item.item_type === "set"
      ? [
          { label: "Set ID", value: item.set_number },
          item.theme ? { label: "Theme", value: item.theme } : null,
          item.year_released ? { label: "Release year", value: String(item.year_released) } : null,
          item.pieces ? { label: "Piece count", value: item.pieces.toLocaleString() } : null,
          item.is_obsolete === null || item.is_obsolete === undefined
            ? null
            : { label: "Status", value: item.is_obsolete ? "Retired" : "Current or unknown" },
        ]
      : item.item_type === "minifig"
        ? [
            { label: "Minifigure ID", value: item.set_number },
            item.year_released ? { label: "Release year", value: String(item.year_released) } : null,
            { label: "Category", value: "Minifigure" },
          ]
        : [
            { label: "Part ID", value: item.set_number },
            item.color_name ? { label: "Color", value: item.color_name } : null,
            item.year_released ? { label: "Release year", value: String(item.year_released) } : null,
            { label: "Category", value: "Part" },
          ]
  ).filter((field): field is CollectorField => field !== null);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.eyebrow}>
            {item.item_type === "part" ? "Part details" : item.item_type === "minifig" ? "Minifigure details" : "Set details"}
          </Text>
          <Text style={s.title}>{item.name}</Text>
          <Text style={s.meta}>
            {item.set_number}
            {item.item_type === "part" && item.color_name ? ` · ${item.color_name}` : ""}
            {` · ${item.quantity}× · ${formatCondition(item.condition)}`}
          </Text>
        </View>

        <View style={s.hero}>
          <View style={s.heroTop}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={s.image} />
            ) : (
              <QuestionMarkPlaceholder style={s.image} />
            )}
            <View style={s.heroCopy}>
              <Text style={s.valueLabel}>Collection value</Text>
              <Text style={s.value}>{USD.format(totalValue)}</Text>
              <Text style={s.unitValue}>
                {unitValue === null ? "No unit value" : `${USD.format(unitValue)} each`}
              </Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <Stat s={s} label="Quantity" value={`${quantity}`} />
            <Stat s={s} label="Condition" value={formatCondition(item.condition)} />
            <Stat s={s}
              label={item.item_type === "part" ? "Color" : "Retail"}
              value={item.item_type === "part" ? item.color_name ?? "Unknown" : formatRetailComparison(item.gain_pct)}
            />
          </View>
        </View>

        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Value history</Text>
            <Text style={s.chartMeta}>
              {windowedHistory.length ? `${windowedHistory.length} points` : "Saved snapshot"}
            </Text>
          </View>
          <View style={s.chartMotion}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryValue}>{salesInWindow}</Text>
                <Text style={s.summaryLabel}>Sales in window</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryValue}>{horizon}</Text>
                <Text style={s.summaryLabel}>Selected range</Text>
              </View>
            </View>

            <View
              accessibilityLabel="Saved item value history chart"
              style={[s.chartWrap, { width: chartWidth, height: chartHeight }]}
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
                    <Text style={s.chartPopupValue}>{USD.format(selectedHistoryPoint.total)}</Text>
                  </Animated.View>
                  <View
                    style={[
                      s.selectedPoint,
                      {
                        left: selectedX - 4,
                        top: selectedHistoryPoint.y >= 4 ? selectedHistoryPoint.y - 4 : selectedHistoryPoint.y,
                      },
                    ]}
                  />
                </>
              ) : null}
              <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={c.lego.yellow} stopOpacity="0.12" />
                  <Stop offset="1" stopColor={c.lego.yellow} stopOpacity="0" />
                </LinearGradient>
              </Defs>
                {chartAreaPath ? <Path ref={morphFillRef} d={chartAreaPath} fill="url(#detailFill)" /> : null}
                {chartLinePath ? <Path ref={morphLineRef} d={chartLinePath} fill="none" stroke={c.lego.yellow} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
              </Svg>
            </View>
            <View style={[s.timeline, { width: chartWidth }]}>
              {timelinePoints.map((point) => (
                <Text key={`${point.date}-${point.total}`} style={[s.timelineLabel, { left: clampTimelineLeft(point.x) }]} numberOfLines={1}>
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
            {salesInWindow === 0 ? (
              <Text style={s.noSalesText}>No sales in the selected time frame for this item.</Text>
            ) : null}
          </View>
        </View>

        <View style={s.collectorCard}>
          <Text style={s.collectorTitle}>Collector Details</Text>
          <View style={s.collectorGrid}>
            {collectorFields.map((field) => (
              <View key={field.label} style={s.collectorField}>
                <Text style={s.collectorLabel}>{field.label}</Text>
                <Text style={s.collectorValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ s, label, value }: { s: any; label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.dark.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 96, gap: 18 },
  header: { gap: 6 },
  backBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: c.dark.text, fontSize: 12, fontWeight: "900" },
  eyebrow: { color: c.lego.yellow, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: c.dark.text, fontSize: 30, fontWeight: "900", letterSpacing: -1.1, lineHeight: 34 },
  meta: { color: c.dark.textMuted, fontSize: 13, fontWeight: "700" },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.backgroundElevated,
    padding: 16,
    gap: 16,
  },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  image: { width: 82, height: 82, borderRadius: 14, backgroundColor: "#171717" },
  heroCopy: { flex: 1, gap: 5 },
  valueLabel: { color: c.dark.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  value: { color: c.dark.text, fontSize: 32, fontWeight: "900", lineHeight: 36, letterSpacing: -0.8 },
  unitValue: { color: c.dark.textDisabled, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.dark.border,
    padding: 12,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  statLabel: { color: c.dark.textMuted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  statValue: { color: c.dark.text, fontSize: 13, fontWeight: "800", lineHeight: 17 },
  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: "rgba(255,255,255,0.015)",
    padding: 16,
    gap: 14,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { color: c.dark.text, fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
  chartMeta: { color: c.dark.textMuted, fontSize: 11, fontWeight: "800" },
  chartMotion: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
  },
  summaryValue: { color: c.dark.text, fontSize: 18, fontWeight: "900", letterSpacing: -0.4, lineHeight: 22 },
  summaryLabel: { color: c.dark.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.2 },
  chartWrap: { alignSelf: "center", position: "relative" },
  gridLineTop: { position: "absolute", top: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.04)" },
  gridLineMid: { position: "absolute", top: 108, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  gridLineBottom: { position: "absolute", bottom: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
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
  timeline: { alignSelf: "center", position: "relative", height: 22, marginTop: -2 },
  timelineLabel: {
    position: "absolute",
    width: 52,
    color: c.dark.textMuted,
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  horizonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginTop: 2,
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
  horizonPillActive: { backgroundColor: c.lego.yellow, borderColor: c.lego.yellow },
  horizonText: { color: c.dark.textDisabled, fontSize: 11, fontWeight: "900" },
  horizonTextActive: { color: "#07100c" },
  noSalesText: { color: c.dark.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  collectorCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 16,
    gap: 12,
  },
  collectorTitle: { color: c.dark.text, fontSize: 14, fontWeight: "900" },
  collectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  collectorField: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(153,231,189,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  collectorLabel: { color: c.dark.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  collectorValue: { color: c.dark.text, fontSize: 13, lineHeight: 17, fontWeight: "800" },
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
  empty: {
    marginTop: 60,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.backgroundElevated,
    padding: 20,
    gap: 8,
  },
  emptyTitle: { color: c.dark.text, fontSize: 18, fontWeight: "900" },
  emptyBody: { color: c.dark.textMuted, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  });
}
