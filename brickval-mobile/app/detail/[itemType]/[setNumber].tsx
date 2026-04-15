import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Animated,
  GestureResponderEvent,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Image,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { CollectionItem, getCollection, getItemTotalValue } from "../../../lib/collection";

const ACCENT = "#62c79a";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#070908";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
type HistoryPoint = CollectionItem["market_history"][number];
type ChartPoint = HistoryPoint & { x: number; y: number; total: number };

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

export default function ItemDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ itemType?: string | string[]; setNumber?: string | string[] }>();
  const itemType = Array.isArray(params.itemType) ? params.itemType[0] : params.itemType;
  const setNumber = Array.isArray(params.setNumber) ? params.setNumber[0] : params.setNumber;
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const popupProgress = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(popupProgress, {
      toValue: selectedIndex !== null ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [popupProgress, selectedIndex]);

  const item = items.find((entry) => entry.set_number === setNumber && entry.item_type === itemType);
  const quantity = item?.quantity ?? 1;
  const unitValue = item?.market_value_usd ?? null;
  const totalValue = item ? getItemTotalValue(item) : 0;
  const history: HistoryPoint[] = (item?.market_history ?? [])
    .filter((point: HistoryPoint) => {
      if (!point.date || !Number.isFinite(point.price_usd)) return false;
      const d = new Date(`${point.date.slice(0, 10)}T00:00:00Z`);
      return !isNaN(d.getTime());
    })
    .sort((a: HistoryPoint, b: HistoryPoint) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)));
  const chartWidth = Math.min(360, Math.max(260, screenWidth - 40));
  const chartHeight = 220;
  const chartPlotHeight = 150;
  const chartBottom = chartHeight - 26;
  const minHistoryValue = history.length ? Math.min(...history.map((point) => point.price_usd * quantity)) : 0;
  const maxHistoryValue = history.length ? Math.max(...history.map((point) => point.price_usd * quantity)) : 0;
  const historyRange = Math.max(maxHistoryValue - minHistoryValue, 1);
  const hasMovement = history.some((point) => point.price_usd * quantity !== minHistoryValue);
  const chartPoints: ChartPoint[] = history.length
    ? history.map((point: HistoryPoint, index: number) => {
        const x = history.length > 1 ? (index * chartWidth) / (history.length - 1) : chartWidth / 2;
        const total = point.price_usd * quantity;
        const y = hasMovement
          ? chartBottom - ((total - minHistoryValue) / historyRange) * chartPlotHeight
          : chartHeight / 2;
        return { ...point, x, y, total };
      })
    : item
      ? [{ date: isoDate(new Date(item.added_at)), price_usd: unitValue ?? 0, source: "bricklink" as const, x: chartWidth / 2, y: chartHeight / 2, total: totalValue }]
      : [];
  const chartStep = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
  const selectedPoint = selectedIndex !== null ? chartPoints[selectedIndex] ?? null : null;
  const selectedCoord = selectedPoint ? { x: selectedPoint.x, y: selectedPoint.y } : null;
  const popupWidth = 132;
  const popupLeft = selectedCoord ? Math.max(4, Math.min(chartWidth - popupWidth - 4, selectedCoord.x - popupWidth / 2)) : 0;
  const popupTop = selectedCoord ? Math.max(4, selectedCoord.y - 76) : 0;
  const popupTranslateY = popupProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  const handleChartTouch = (event: GestureResponderEvent) => {
    if (chartPoints.length === 0) return;
    const locationX = Math.max(0, Math.min(chartWidth, event.nativeEvent.locationX));
    const nextIndex = Math.round(locationX / chartStep);
    const bounded = Math.max(0, Math.min(chartPoints.length - 1, nextIndex));
    setSelectedIndex((curr) => (curr === bounded ? curr : bounded));
  };
  const chartLinePath = getSmoothPath(chartPoints);
  const firstPoint = chartPoints[0];
  const lastPoint = chartPoints[chartPoints.length - 1];
  const chartAreaPath = chartLinePath && firstPoint && lastPoint
    ? `${chartLinePath} L ${lastPoint.x} ${chartBottom} L ${firstPoint.x} ${chartBottom} Z`
    : "";

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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>{item.item_type === "minifig" ? "Minifigure details" : "Set details"}</Text>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.set_number} · {item.quantity}× · {formatCondition(item.condition)}
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            ) : (
              <View style={styles.image} />
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
            <Stat label="Retail" value={formatRetailComparison(item.gain_pct)} />
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Value history</Text>
            <Text style={styles.chartMeta}>{history.length ? `${history.length} points` : "Saved snapshot"}</Text>
          </View>
          <View
            style={[styles.chartWrap, { width: chartWidth, height: chartHeight }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleChartTouch}
            onResponderMove={handleChartTouch}
          >
            <View style={styles.gridLineTop} />
            <View style={styles.gridLineMid} />
            <View style={styles.gridLineBottom} />
            {selectedCoord ? (
              <>
                <View style={[styles.chartCursor, { left: selectedCoord.x }]} />
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
                  <Text style={styles.chartPopupLabel}>{formatTimelineLabel(selectedPoint!.date)}</Text>
                  <Text style={styles.chartPopupValue}>{USD.format(selectedPoint!.total)}</Text>
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
                const selected = selectedIndex === index;
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
          <View style={styles.timeline}>
            {chartPoints.map((point) => (
              <Text key={`${point.date}-${point.total}`} style={styles.timelineLabel}>
                {formatTimelineLabel(point.date)}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>What this shows</Text>
          <Text style={styles.noteBody}>
            This page uses the saved collection entry from this phone. Quantity multiplies the value, so the total matches what you added to your collection.
          </Text>
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
  chartWrap: { alignSelf: "center", position: "relative" },
  gridLineTop: { position: "absolute", top: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.08)" },
  gridLineMid: { position: "absolute", top: 108, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.12)" },
  gridLineBottom: { position: "absolute", bottom: 24, left: 0, right: 0, height: 1, backgroundColor: "rgba(153,231,189,0.2)" },
  timeline: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  timelineLabel: { color: SOFT, fontSize: 10, fontWeight: "800" },
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
  chartPopupLabel: { color: "#253129", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  chartPopupValue: { color: "#07100c", fontSize: 16, fontWeight: "900", marginTop: 2 },
  noteCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 6,
  },
  noteTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  noteBody: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: "700" },
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
