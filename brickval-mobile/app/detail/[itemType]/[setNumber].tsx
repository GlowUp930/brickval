import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Image,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { CollectionItem, getCollection, getItemTotalValue } from "../../../lib/collection";
import { normalizeHistoryDate } from "../../../lib/api";
import { QuestionMarkPlaceholder } from "../../../components/QuestionMarkPlaceholder";

const ACCENT = "#62c79a";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#070908";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
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

function formatHorizonDays(horizon: Horizon) {
  return `${HORIZON_DAYS[horizon]} days`;
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

export default function ItemDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
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
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const popupProgress = useRef(new Animated.Value(0)).current;
  const horizonProgress = useRef(new Animated.Value(1)).current;

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
  const windowedHistory = getHistoryWindow(history, horizon);
  const salesInWindow = countSalesInWindow(history, horizon);
  const chartWidth = Math.min(360, Math.max(260, screenWidth - 40));
  const chartHeight = 220;
  const chartBottom = chartHeight - 26;
  const minHistoryValue = windowedHistory.length ? Math.min(...windowedHistory.map((point) => point.price_usd * quantity)) : 0;
  const maxHistoryValue = windowedHistory.length ? Math.max(...windowedHistory.map((point) => point.price_usd * quantity)) : 0;
  const historyRange = Math.max(maxHistoryValue - minHistoryValue, 1);
  const chartPoints: ChartPoint[] = windowedHistory.length
    ? windowedHistory.map((point: HistoryPoint, index: number) => {
        const x = windowedHistory.length > 1 ? (index * chartWidth) / (windowedHistory.length - 1) : chartWidth / 2;
        const total = point.price_usd * quantity;
        const y = chartBottom - ((total - minHistoryValue) / historyRange) * 150;
        return { ...point, x, y, total };
      })
    : item
      ? [{ date: isoDate(new Date(item.added_at)), price_usd: unitValue ?? 0, source: "bricklink" as const, x: chartWidth / 2, y: chartBottom / 2, total: totalValue }]
      : [];
  const chartLinePath = getSmoothPath(chartPoints);
  const firstPoint = chartPoints[0];
  const lastPoint = chartPoints[chartPoints.length - 1];
  const chartAreaPath = chartLinePath && firstPoint && lastPoint
    ? `${chartLinePath} L ${lastPoint.x} ${chartBottom} L ${firstPoint.x} ${chartBottom} Z`
    : "";
  const chartStep = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
  const uniqueTimelinePoints = chartPoints.filter((point, index) => {
    if (index === 0) return true;
    return normalizeHistoryDate(point.date) !== normalizeHistoryDate(chartPoints[index - 1].date);
  });
  const timelinePoints = uniqueTimelinePoints.filter((point, index) => {
    if (uniqueTimelinePoints.length <= 5) return true;
    const stride = Math.max(1, Math.round(uniqueTimelinePoints.length / 4));
    return index === 0 || index === uniqueTimelinePoints.length - 1 || index % stride === 0;
  });
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
  const horizonTranslateY = horizonProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  useEffect(() => {
    horizonProgress.setValue(0.96);
    Animated.timing(horizonProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [horizon, horizonProgress]);

  if (!item) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Item not found</Text>
          <Text style={styles.emptyBody}>This saved item is no longer on this phone.</Text>
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
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>
            {item.item_type === "part" ? "Part details" : item.item_type === "minifig" ? "Minifigure details" : "Set details"}
          </Text>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.set_number}
            {item.item_type === "part" && item.color_name ? ` · ${item.color_name}` : ""}
            {` · ${item.quantity}× · ${formatCondition(item.condition)}`}
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <QuestionMarkPlaceholder style={styles.image} />
            )}
            <View style={styles.heroCopy}>
              <Text style={styles.valueLabel}>Collection value</Text>
              <Text style={styles.value}>{USD.format(totalValue)}</Text>
              <Text style={styles.unitValue}>
                {unitValue === null ? "No unit value" : `${USD.format(unitValue)} each`}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Quantity" value={`${quantity}`} />
            <Stat label="Condition" value={formatCondition(item.condition)} />
            <Stat
              label={item.item_type === "part" ? "Color" : "Retail"}
              value={item.item_type === "part" ? item.color_name ?? "Unknown" : formatRetailComparison(item.gain_pct)}
            />
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Value history</Text>
            <Text style={styles.chartMeta}>
              {windowedHistory.length ? `${windowedHistory.length} points` : "Saved snapshot"}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.chartMotion,
              {
                opacity: horizonProgress,
                transform: [{ translateY: horizonTranslateY }, { scale: horizonProgress }],
              },
            ]}
          >
            <View style={styles.salesCard}>
              <View style={styles.salesStat}>
                <Text style={styles.salesValue}>{salesInWindow}</Text>
                <Text style={styles.salesLabel}>Sales in last {formatHorizonDays(horizon)}</Text>
              </View>
              <View style={styles.salesStat}>
                <Text style={styles.salesValue}>{horizon}</Text>
                <Text style={styles.salesLabel}>Chart window</Text>
              </View>
            </View>

            <View
              accessibilityLabel="Saved item value history chart"
              style={[styles.chartWrap, { width: chartWidth, height: chartHeight }]}
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
                    <Text style={styles.chartPopupValue}>{USD.format(selectedHistoryPoint.total)}</Text>
                  </Animated.View>
                </>
              ) : null}
              <Svg width={chartWidth} height={chartHeight} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={ACCENT} stopOpacity="0.22" />
                    <Stop offset="1" stopColor={ACCENT} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {chartAreaPath ? <Path d={chartAreaPath} fill="url(#detailFill)" /> : null}
                {chartLinePath ? <Path d={chartLinePath} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
                {chartPoints.map((point, index) => {
                  const selected = selectedHistoryIndex === index;
                  return (
                    <Circle
                      key={`${point.date}-${point.total}`}
                      cx={point.x}
                      cy={point.y}
                      r={selected ? 5 : 3.4}
                      fill={selected ? INK : ACCENT}
                      stroke={selected ? ACCENT : PANEL}
                      strokeWidth={selected ? 2 : 1.4}
                    />
                  );
                })}
              </Svg>
            </View>
            <View style={[styles.timeline, { width: chartWidth }]}>
              {timelinePoints.map((point) => (
                <Text key={`${point.date}-${point.total}`} style={[styles.timelineLabel, { left: clampTimelineLeft(point.x) }]} numberOfLines={1}>
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
                  onPress={() => {
                    setSelectedHistoryIndex(null);
                    setHorizon(option);
                  }}
                >
                  <Text style={[styles.horizonText, horizon === option && styles.horizonTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {salesInWindow === 0 ? (
              <Text style={styles.noSalesText}>No sales in the selected time frame for this item.</Text>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.collectorCard}>
          <Text style={styles.collectorTitle}>Collector Details</Text>
          <View style={styles.collectorGrid}>
            {collectorFields.map((field) => (
              <View key={field.label} style={styles.collectorField}>
                <Text style={styles.collectorLabel}>{field.label}</Text>
                <Text style={styles.collectorValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 20, paddingTop: 56, paddingBottom: 96, gap: 18 },
  header: { gap: 6 },
  backBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: INK, fontSize: 12, fontWeight: "900" },
  eyebrow: { color: ACCENT, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: INK, fontSize: 30, fontWeight: "900", letterSpacing: -1.1, lineHeight: 34 },
  meta: { color: MUTED, fontSize: 13, fontWeight: "700" },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 16,
  },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  image: { width: 82, height: 82, borderRadius: 14, backgroundColor: "#171717" },
  heroCopy: { flex: 1, gap: 5 },
  valueLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  value: { color: INK, fontSize: 32, fontWeight: "900", lineHeight: 36, letterSpacing: -0.8 },
  unitValue: { color: SOFT, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 12,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  statLabel: { color: MUTED, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  statValue: { color: INK, fontSize: 13, fontWeight: "800", lineHeight: 17 },
  chartCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 12,
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  chartMeta: { color: MUTED, fontSize: 11, fontWeight: "800" },
  chartMotion: {
    gap: 12,
  },
  salesCard: {
    flexDirection: "row",
    gap: 10,
  },
  salesStat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    gap: 4,
  },
  salesValue: { color: INK, fontSize: 18, fontWeight: "900", letterSpacing: -0.4 },
  salesLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  chartWrap: { alignSelf: "center", position: "relative" },
  gridLineTop: { position: "absolute", top: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.08)" },
  gridLineMid: { position: "absolute", top: 108, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.12)" },
  gridLineBottom: { position: "absolute", bottom: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.2)" },
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
  timeline: { alignSelf: "center", position: "relative", height: 22, marginTop: -2 },
  timelineLabel: {
    position: "absolute",
    width: 52,
    color: SOFT,
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
  horizonPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  horizonText: { color: SOFT, fontSize: 11, fontWeight: "900" },
  horizonTextActive: { color: "#07100c" },
  noSalesText: { color: MUTED, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  collectorCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 16,
    gap: 12,
  },
  collectorTitle: { color: INK, fontSize: 14, fontWeight: "900" },
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
  collectorLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  collectorValue: { color: INK, fontSize: 13, lineHeight: 17, fontWeight: "800" },
  empty: {
    marginTop: 60,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 20,
    gap: 8,
  },
  emptyTitle: { color: INK, fontSize: 18, fontWeight: "900" },
  emptyBody: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: "700" },
});
