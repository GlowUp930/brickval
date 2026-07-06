import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { normalizeHistoryDate } from "../../lib/api";
import { getLatestLookupResult } from "../../lib/live-result";
import { QuestionMarkPlaceholder } from "../../components/QuestionMarkPlaceholder";
import { useTheme } from "../../lib/ThemeProvider";
import { type ThemeColors } from "../../lib/theme";
import { buildMarketRows } from "../../lib/market-rows";
import { MarketRowsTable } from "../../components/MarketRowsTable";
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_DECIMAL = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type CollectorField = {
  label: string;
  value: string;
};

function formatRetailComparison(value: number | null) {
  if (value === null) return "No retail comparison";
  if (value >= 0) return `${Math.round(value)}% higher than retail`;
  return `${Math.round(Math.abs(value))}% below retail`;
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

export default function LiveDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { colors: c } = useTheme();
  const s = useMemo(() => getStyles(c), [c]);
  const result = getLatestLookupResult();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const popupProgress = useRef(new Animated.Value(0)).current;

  if (!result) {
    return (
      <View style={s.root}>
        <View style={s.emptyState}>
          <Text style={s.title}>Live result unavailable</Text>
          <Text style={s.body}>Scan again to open native result details.</Text>
          <Pressable style={s.backBtn} onPress={() => router.replace("/scan")}>
            <Text style={s.backText}>Back to scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const history = result.market_history.filter((point) => point.date && Number.isFinite(point.price_usd));
  const chartWidth = Math.min(360, Math.max(260, screenWidth - 40));
  const chartHeight = 220;
  const chartBottom = chartHeight - 26;
  const minHistoryValue = history.length ? Math.min(...history.map((point) => point.price_usd)) : 0;
  const maxHistoryValue = history.length ? Math.max(...history.map((point) => point.price_usd)) : 0;
  const historyRange = Math.max(maxHistoryValue - minHistoryValue, 1);
  const chartPoints = history.map((point, index) => {
    const x = history.length > 1 ? (index * chartWidth) / (history.length - 1) : chartWidth / 2;
    const y = chartBottom - ((point.price_usd - minHistoryValue) / historyRange) * 150;
    return { ...point, x, y };
  });
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
  const timelinePoints = uniqueTimelinePoints.length <= 3
    ? uniqueTimelinePoints
    : [
        uniqueTimelinePoints[0],
        uniqueTimelinePoints[Math.floor((uniqueTimelinePoints.length - 1) / 2)],
        uniqueTimelinePoints[uniqueTimelinePoints.length - 1],
      ];
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
  const heroPrice = result.pricing.hero_new_avg_usd;
  const marketRows = buildMarketRows(result);
  const collectorFields: CollectorField[] = (
    result.item_type === "set"
      ? [
          { label: "Set ID", value: result.set_number },
          result.theme ? { label: "Theme", value: result.theme } : null,
          result.set_info.year_released ? { label: "Release year", value: String(result.set_info.year_released) } : null,
          result.pieces ? { label: "Piece count", value: result.pieces.toLocaleString() } : null,
          { label: "Status", value: result.set_info.is_obsolete ? "Retired" : "Current or unknown" },
        ]
      : result.item_type === "minifig"
        ? [
            { label: "Minifigure ID", value: result.fig_info.fig_number },
            result.fig_info.year_released ? { label: "Release year", value: String(result.fig_info.year_released) } : null,
            { label: "Category", value: "Minifigure" },
          ]
        : [
            { label: "Part ID", value: result.part_info.part_number },
            result.part_info.color_name ? { label: "Color", value: result.part_info.color_name } : null,
            result.part_info.year_released ? { label: "Release year", value: String(result.part_info.year_released) } : null,
            { label: "Category", value: "Part" },
          ]
  ).filter((field): field is CollectorField => field !== null);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <View style={s.header}>
          <Text style={s.eyebrow}>
            {result.item_type === "set" ? "Live set result" : result.item_type === "part" ? "Live part result" : "Live minifigure result"}
          </Text>
          <Text style={s.title}>{result.name}</Text>
          <Text style={s.meta}>
            {result.set_number} · {result.theme}
            {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
          </Text>
        </View>

        <View style={s.hero}>
          <View style={s.heroTop}>
            {result.image_url ? (
              <Image source={{ uri: result.image_url }} style={s.image} />
            ) : (
              <QuestionMarkPlaceholder style={s.image} />
            )}
            <View style={s.heroCopy}>
              <Text style={s.valueLabel}>Market price</Text>
              <Text style={s.value}>{heroPrice === null ? "Unavailable" : USD.format(heroPrice)}</Text>
              <Text style={s.unitValue}>
                {result.item_type === "part"
                  ? result.part_info.color_name ?? "Part color"
                  : formatRetailComparison(result.pricing.gain_pct)}
              </Text>
            </View>
          </View>

          <View style={s.statsRow}>
            <Stat s={s} label="Source" value={result.pricing.data_source === "sold" ? "Sold data" : result.pricing.data_source === "listing" ? "Listing data" : "Unknown"} />
            <Stat s={s} label="Volume" value={result.pricing.bricklink_new_qty ? `${result.pricing.bricklink_new_qty} rows` : "Light data"} />
            <Stat s={s}
              label={result.item_type === "part" ? "Color" : "RRP"}
              value={result.item_type === "part" ? result.part_info.color_name ?? "Unknown" : result.pricing.rrp_usd === null ? "Unavailable" : `~${USD.format(result.pricing.rrp_usd)}`}
            />
          </View>
        </View>

        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Value history</Text>
            <Text style={s.chartMeta}>{history.length ? `${history.length} points` : "No history yet"}</Text>
          </View>
          <View
            accessibilityLabel="Live value history chart"
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
                  <Text style={s.chartPopupValue}>{USD_DECIMAL.format(selectedHistoryPoint.price_usd)}</Text>
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
              {chartAreaPath ? <Path d={chartAreaPath} fill="url(#detailFill)" /> : null}
              {chartLinePath ? <Path d={chartLinePath} fill="none" stroke={c.lego.yellow} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </Svg>
          </View>
            <View style={s.timeline}>
              {timelinePoints.map((point) => (
                <Text key={`${point.date}-${point.price_usd}`} style={s.timelineLabel}>
                  {formatTimelineLabel(point.date)}
                </Text>
              ))}
            </View>
        </View>

        <View style={s.marketCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Market rows</Text>
            <Text style={s.chartMeta}>{marketRows.length} shown</Text>
          </View>
          <MarketRowsTable rows={marketRows} colors={c} />
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
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  backBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: c.dark.text, fontSize: 12, fontWeight: "900" },
  header: { gap: 6 },
  eyebrow: { color: c.lego.yellow, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: c.dark.text, fontSize: 30, fontWeight: "900", lineHeight: 34 },
  body: { color: c.dark.textMuted, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  meta: { color: c.dark.textMuted, fontSize: 13, fontWeight: "700" },
  hero: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.backgroundElevated,
    padding: 16,
    gap: 16,
  },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  image: { width: 82, height: 82, borderRadius: 8, backgroundColor: "#171717" },
  heroCopy: { flex: 1, gap: 5 },
  valueLabel: { color: c.dark.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  value: { color: c.dark.text, fontSize: 32, fontWeight: "900", lineHeight: 36 },
  unitValue: { color: c.dark.textDisabled, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.dark.border,
    padding: 12,
    gap: 6,
  },
  statLabel: { color: c.dark.textDisabled, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  statValue: { color: c.dark.text, fontSize: 13, fontWeight: "800" },
  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: "rgba(255,255,255,0.015)",
    padding: 16,
    gap: 14,
  },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chartTitle: { color: c.dark.text, fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
  chartMeta: { color: c.dark.textDisabled, fontSize: 12, fontWeight: "700" },
  chartWrap: { alignSelf: "center", overflow: "hidden", position: "relative" },
  gridLineTop: { position: "absolute", left: 0, right: 0, top: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  gridLineMid: { position: "absolute", left: 0, right: 0, top: 104, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  gridLineBottom: { position: "absolute", left: 0, right: 0, bottom: 24, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
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
  timeline: { flexDirection: "row", justifyContent: "space-between", marginTop: -4, paddingHorizontal: 2 },
  timelineLabel: { flex: 1, color: c.dark.textMuted, fontSize: 8, fontWeight: "900", textAlign: "center", letterSpacing: 0.2 },
  marketCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: c.dark.backgroundElevated,
    padding: 16,
    gap: 10,
  },
  collectorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.dark.border,
    backgroundColor: "rgba(255,255,255,0.025)",
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(153,231,189,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  collectorLabel: { color: c.dark.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  collectorValue: { color: c.dark.text, fontSize: 13, fontWeight: "800", lineHeight: 17 },
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
  });
}
