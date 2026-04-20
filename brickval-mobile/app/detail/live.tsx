import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { normalizeHistoryDate, type BrickLinkDetail, type EbaySale, type LookupDetailResult } from "../../lib/api";
import { getLatestLookupResult } from "../../lib/live-result";
import { QuestionMarkPlaceholder } from "../../components/QuestionMarkPlaceholder";

const ACCENT = "#62c79a";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#070908";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_DECIMAL = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type MarketRow = {
  id: string;
  label: string;
  meta: string;
  priceUsd: number;
};

function formatRetailComparison(value: number | null) {
  if (value === null) return "No retail comparison";
  if (value >= 0) return `${Math.round(value)}% higher than retail`;
  return `${Math.round(Math.abs(value))}% below retail`;
}

function formatDate(value: string | undefined) {
  if (!value) return "Current listing";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function buildSetRows(result: Extract<LookupDetailResult, { item_type: "set" }>): MarketRow[] {
  const soldRows = result.pricing.bricklink_sold_new_details.length
    ? result.pricing.bricklink_sold_new_details.slice(0, 4).map((row, index) => ({
        id: `bl-sold-new-${index}`,
        label: "BrickLink sold",
        meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
        priceUsd: row.price_usd,
      }))
    : result.pricing.bricklink_sold_used_details.slice(0, 4).map((row, index) => ({
        id: `bl-sold-used-${index}`,
        label: "BrickLink sold used",
        meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
        priceUsd: row.price_usd,
      }));

  const stockRows = result.pricing.bricklink_stock_new_details.length
    ? result.pricing.bricklink_stock_new_details.slice(0, 3).map((row, index) => ({
        id: `bl-stock-new-${index}`,
        label: "BrickLink listing",
        meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
        priceUsd: row.price_usd,
      }))
    : result.pricing.bricklink_stock_used_details.slice(0, 3).map((row, index) => ({
        id: `bl-stock-used-${index}`,
        label: "BrickLink used listing",
        meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
        priceUsd: row.price_usd,
      }));

  const ebayRows = (result.pricing.ebay_new_sales.length
    ? result.pricing.ebay_new_sales
    : result.pricing.ebay_used_sales
  )
    .slice(0, 3)
    .map((row: EbaySale, index: number) => ({
      id: `ebay-${index}`,
      label: "eBay market",
      meta: `${formatDate(row.sold_date)}${row.marketplace ? ` · ${row.marketplace}` : ""}`,
      priceUsd: row.price_usd,
    }));

  return [...soldRows, ...stockRows, ...ebayRows];
}

function buildMinifigRows(result: Extract<LookupDetailResult, { item_type: "minifig" }>): MarketRow[] {
  const soldRows = [...result.pricing.sold_new_details, ...result.pricing.sold_details]
    .slice(0, 5)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `fig-sold-${index}`,
      label: "BrickLink sold",
      meta: `${formatDate(row.date)}${row.country ? ` · ${row.country}` : ""}`,
      priceUsd: row.price_usd,
    }));

  const stockRows = [...result.pricing.stock_new_details, ...result.pricing.stock_details]
    .slice(0, 4)
    .map((row: BrickLinkDetail, index: number) => ({
      id: `fig-stock-${index}`,
      label: "BrickLink listing",
      meta: `${row.country ? `${row.country} · ` : ""}qty ${row.quantity}`,
      priceUsd: row.price_usd,
    }));

  return [...soldRows, ...stockRows];
}

export default function LiveDetailScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const result = getLatestLookupResult();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const popupProgress = useRef(new Animated.Value(0)).current;

  if (!result) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Live result unavailable</Text>
          <Text style={styles.body}>Scan again to open native result details.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.replace("/scan")}>
            <Text style={styles.backText}>Back to scan</Text>
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
  const marketRows = result.item_type === "set" ? buildSetRows(result) : buildMinifigRows(result);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{result.item_type === "set" ? "Live set result" : "Live minifigure result"}</Text>
          <Text style={styles.title}>{result.name}</Text>
          <Text style={styles.meta}>
            {result.set_number} · {result.theme}
            {result.pieces ? ` · ${result.pieces.toLocaleString()} pieces` : ""}
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            {result.image_url ? (
              <Image source={{ uri: result.image_url }} style={styles.image} />
            ) : (
              <QuestionMarkPlaceholder style={styles.image} />
            )}
            <View style={styles.heroCopy}>
              <Text style={styles.valueLabel}>Market price</Text>
              <Text style={styles.value}>{heroPrice === null ? "Unavailable" : USD.format(heroPrice)}</Text>
              <Text style={styles.unitValue}>{formatRetailComparison(result.pricing.gain_pct)}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Source" value={result.pricing.data_source === "sold" ? "Sold data" : result.pricing.data_source === "listing" ? "Listing data" : "Unknown"} />
            <Stat label="Volume" value={result.pricing.bricklink_new_qty ? `${result.pricing.bricklink_new_qty} rows` : "Light data"} />
            <Stat label="RRP" value={result.pricing.rrp_usd === null ? "Unavailable" : `~${USD.format(result.pricing.rrp_usd)}`} />
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Value history</Text>
            <Text style={styles.chartMeta}>{history.length ? `${history.length} points` : "No history yet"}</Text>
          </View>
          <View
            accessibilityLabel="Live value history chart"
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
                  <Text style={styles.chartPopupValue}>{USD_DECIMAL.format(selectedHistoryPoint.price_usd)}</Text>
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
                    key={`${point.date}-${point.price_usd}`}
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
              <Text key={`${point.date}-${point.price_usd}`} style={styles.timelineLabel}>
                {formatTimelineLabel(point.date)}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.marketCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Market rows</Text>
            <Text style={styles.chartMeta}>{marketRows.length} shown</Text>
          </View>
          {marketRows.length === 0 ? (
            <Text style={styles.emptyRows}>No detailed market rows came back for this scan.</Text>
          ) : (
            marketRows.map((row) => (
              <View key={row.id} style={styles.marketRow}>
                <View style={styles.marketCopy}>
                  <Text style={styles.marketLabel}>{row.label}</Text>
                  <Text style={styles.marketMeta}>{row.meta}</Text>
                </View>
                <Text style={styles.marketValue}>{USD_DECIMAL.format(row.priceUsd)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Why this page exists</Text>
          <Text style={styles.noteBody}>
            The result card gives the quick price reveal. This page keeps the same scan native and shows the pricing rows behind that headline number.
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
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  backBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: INK, fontSize: 12, fontWeight: "900" },
  header: { gap: 6 },
  eyebrow: { color: ACCENT, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: INK, fontSize: 30, fontWeight: "900", lineHeight: 34 },
  body: { color: MUTED, fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  meta: { color: MUTED, fontSize: 13, fontWeight: "700" },
  hero: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 16,
  },
  heroTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  image: { width: 82, height: 82, borderRadius: 8, backgroundColor: "#171717" },
  heroCopy: { flex: 1, gap: 5 },
  valueLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  value: { color: INK, fontSize: 32, fontWeight: "900", lineHeight: 36 },
  unitValue: { color: SOFT, fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    padding: 12,
    gap: 6,
  },
  statLabel: { color: SOFT, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  statValue: { color: INK, fontSize: 13, fontWeight: "800" },
  chartCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 14,
  },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chartTitle: { color: INK, fontSize: 16, fontWeight: "900" },
  chartMeta: { color: SOFT, fontSize: 12, fontWeight: "700" },
  chartWrap: { alignSelf: "center", overflow: "hidden" },
  gridLineTop: { position: "absolute", left: 0, right: 0, top: 18, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  gridLineMid: { position: "absolute", left: 0, right: 0, top: 92, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  gridLineBottom: { position: "absolute", left: 0, right: 0, bottom: 26, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
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
  timeline: { flexDirection: "row", justifyContent: "space-between", marginTop: -6, paddingHorizontal: 2 },
  timelineLabel: { flex: 1, color: SOFT, fontSize: 9, fontWeight: "900", textAlign: "center" },
  marketCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 10,
  },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  marketCopy: { flex: 1, gap: 3 },
  marketLabel: { color: INK, fontSize: 13, fontWeight: "800" },
  marketMeta: { color: SOFT, fontSize: 11, fontWeight: "700" },
  marketValue: { color: ACCENT, fontSize: 13, fontWeight: "900" },
  emptyRows: { color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  noteCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    gap: 8,
  },
  noteTitle: { color: INK, fontSize: 14, fontWeight: "900" },
  noteBody: { color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 19 },
});
