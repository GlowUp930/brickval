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
import { BlurView } from "expo-blur";
import { buildValuationChart } from "../../lib/item-valuation";
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

export default function LiveDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { colors: c, accent } = useTheme();
  const s = useMemo(() => getStyles(c, accent.primary), [accent.primary, c]);
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
  const chartModel = buildValuationChart(history, chartWidth, chartHeight, chartBottom);
  const chartPoints = chartModel.points;
  const chartLinePath = chartModel.linePath;
  const chartAreaPath = chartModel.areaPath;
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
      {result.image_url ? <Image source={{ uri: result.image_url }} style={s.backdropImage} resizeMode="cover" /> : null}
      <BlurView intensity={72} tint="dark" style={s.backdropBlur} />
      <View style={s.backdropScrim} />
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
                  <Stop offset="0" stopColor={accent.primary} stopOpacity="0.18" />
                  <Stop offset="1" stopColor={accent.primary} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {chartAreaPath ? <Path d={chartAreaPath} fill="url(#detailFill)" /> : null}
              {chartLinePath ? <Path d={chartLinePath} fill="none" stroke={accent.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
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

function getStyles(c: ThemeColors, accent: string) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.dark.background },
  backdropImage: {
    position: "absolute",
    top: -90,
    left: -40,
    right: -40,
    height: 360,
    opacity: 0.2,
    transform: [{ scale: 1.18 }],
  },
  backdropBlur: { position: "absolute", top: 0, left: 0, right: 0, height: 430 },
  backdropScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  content: { padding: 20, paddingTop: 58, paddingBottom: 112, gap: 18 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  backBtn: {
    alignSelf: "flex-start",
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,247,247,0.14)",
    backgroundColor: "rgba(8,9,10,0.64)",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: c.dark.text, fontSize: 12, fontWeight: "900" },
  header: { gap: 6 },
  eyebrow: { color: accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: c.dark.text, fontSize: 30, fontWeight: "900", lineHeight: 34 },
  body: { color: c.dark.textMuted, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  meta: { color: c.dark.textMuted, fontSize: 13, fontWeight: "700" },
  hero: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(245,247,247,0.14)",
    backgroundColor: "rgba(5,6,7,0.9)",
    padding: 18,
    gap: 18,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  heroTop: { gap: 16, alignItems: "center" },
  image: { width: 188, height: 188, borderRadius: 26, backgroundColor: "#171717" },
  heroCopy: { alignItems: "center", gap: 5 },
  valueLabel: { color: c.dark.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  value: { color: c.dark.text, fontSize: 42, fontWeight: "900", lineHeight: 46, letterSpacing: -1.4 },
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
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(245,247,247,0.12)",
    backgroundColor: "rgba(5,6,7,0.88)",
    padding: 18,
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(245,247,247,0.12)",
    backgroundColor: "rgba(5,6,7,0.9)",
    padding: 18,
    gap: 12,
  },
  collectorCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(245,247,247,0.12)",
    backgroundColor: "rgba(255,255,255,0.035)",
    padding: 18,
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
    backgroundColor: accent,
    borderWidth: 2,
    borderColor: "#0b0f0d",
    zIndex: 3,
  },
  });
}
