import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Three throwaway versions of the saved-item detail opened from Collection.
type DetailVariant = "reference" | "collector" | "market";

const SPIDER_MAN = "https://img.bricklink.com/ItemImage/MN/0/sh0115.png";

function ItemDetailPrototype({ variant }: { variant: DetailVariant }) {
  return (
    <View style={styles.phone}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {variant === "reference" ? <ReferenceLedDetail /> : null}
        {variant === "collector" ? <CollectorLedDetail /> : null}
        {variant === "market" ? <MarketLedDetail /> : null}
      </ScrollView>
      <NativeTabPreview />
      <View style={styles.homeIndicator} />
    </View>
  );
}

const meta = {
  title: "Item detail prototype / Saved collection item",
  component: ItemDetailPrototype,
  args: { variant: "reference" },
  render: (args) => <ItemDetailPrototype {...args} />,
} satisfies Meta<typeof ItemDetailPrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const A_ReferenceLed: Story = {
  name: "A - Reference led",
  args: { variant: "reference" },
};

export const B_CollectorLed: Story = {
  name: "B - Collector led",
  args: { variant: "collector" },
};

export const C_MarketLed: Story = {
  name: "C - Market led",
  args: { variant: "market" },
};

function DetailControls() {
  return (
    <View style={styles.controls}>
      <CircleButton ios="chevron.left" web="arrow_back" label="Back" />
      <View style={styles.controlRight}>
        <CircleButton ios="square.and.arrow.up" web="ios_share" label="Share" />
        <CircleButton ios="ellipsis" web="more_horiz" label="More options" />
      </View>
    </View>
  );
}

function ReferenceLedDetail() {
  return (
    <>
      <DetailControls />
      <View style={styles.referenceHero}>
        <Image source={{ uri: SPIDER_MAN }} style={styles.referenceImage} resizeMode="contain" />
      </View>
      <View style={styles.referencePanel}>
        <View style={styles.referenceIdentityRow}>
          <View style={styles.flexOne}>
            <Text style={styles.referenceName}>Spider-Man</Text>
            <Text style={styles.referenceMeta}>Juniors · sh0115</Text>
            <Text style={styles.referenceSubmeta}>Minifigure · 2014 · Quantity 1</Text>
          </View>
          <Pressable accessibilityLabel="Favourite item">
            <ExpoSymbol ios="star" web="star" size={27} color="rgba(247,244,234,0.62)" />
          </Pressable>
        </View>

        <View style={styles.referenceActionRow}>
          <Pressable style={styles.soldButton}>
            <ExpoSymbol ios="tag.fill" web="sell" size={18} color="#F7F4EA" />
            <Text style={styles.soldButtonText}>View Market Rows</Text>
          </Pressable>
          <View style={styles.referencePriceBlock}>
            <Text style={styles.referencePriceLabel}>NEW VALUE</Text>
            <Text style={styles.referencePrice}>$7.57</Text>
          </View>
        </View>

        <ConditionTabs />
        <View style={styles.referenceChartHeader}>
          <View style={styles.chartLegendDot} />
          <Text style={styles.chartLegend}>Collection value</Text>
          <Text style={styles.chartDelta}>+$0.62 · 3M</Text>
        </View>
        <ValueChart accent="#42DAD1" height={220} />
        <RangeTabs />
      </View>
    </>
  );
}

function CollectorLedDetail() {
  return (
    <>
      <DetailControls />
      <View style={styles.collectorHeroCard}>
        <View style={styles.collectorImageWrap}>
          <Image source={{ uri: SPIDER_MAN }} style={styles.collectorImage} resizeMode="contain" />
        </View>
        <View style={styles.collectorHeroCopy}>
          <View style={styles.typePill}><Text style={styles.typePillText}>MINIFIGURE</Text></View>
          <Text style={styles.collectorName}>Spider-Man</Text>
          <Text style={styles.collectorMeta}>Juniors · sh0115 · 2014</Text>
          <Text style={styles.collectorValue}>$7.57</Text>
          <Text style={styles.collectorValueMeta}>Collection value · New</Text>
        </View>
      </View>

      <View style={styles.holdingStats}>
        <HoldingStat label="Quantity" value="1" />
        <HoldingStat label="Paid" value="$6.95" />
        <HoldingStat label="Gain" value="+$0.62" accent />
      </View>

      <View style={styles.collectorChartCard}>
        <View style={styles.cardHeadingRow}>
          <View>
            <Text style={styles.cardEyebrow}>YOUR HOLDING</Text>
            <Text style={styles.cardTitle}>Value history</Text>
          </View>
          <Text style={styles.chartDelta}>+8.9%</Text>
        </View>
        <ValueChart accent="#F2CD37" height={172} />
        <RangeTabs compact />
      </View>

      <View style={styles.savedMarketCard}>
        <View style={styles.cardHeadingRow}>
          <Text style={styles.cardTitle}>Saved market rows</Text>
          <Text style={styles.savedCount}>8 sales</Text>
        </View>
        <MarketRow date="Jul 8" place="US" condition="New" value="$7.82" />
        <MarketRow date="Jul 2" place="AU" condition="New" value="$7.55" />
      </View>
    </>
  );
}

function MarketLedDetail() {
  return (
    <>
      <DetailControls />
      <View style={styles.marketTitleBlock}>
        <View style={styles.marketThumbWrap}>
          <Image source={{ uri: SPIDER_MAN }} style={styles.marketThumb} resizeMode="contain" />
        </View>
        <View style={styles.marketTitleCopy}>
          <Text style={styles.cardEyebrow}>SAVED MINIFIGURE</Text>
          <Text style={styles.marketName}>Spider-Man</Text>
          <Text style={styles.marketMeta}>Juniors · sh0115 · 2014</Text>
        </View>
      </View>

      <View style={styles.marketValueCard}>
        <View>
          <Text style={styles.marketValueLabel}>CURRENT MARKET VALUE</Text>
          <Text style={styles.marketValue}>$7.57</Text>
          <Text style={styles.marketValueBasis}>New · BrickLink sold average</Text>
        </View>
        <View style={styles.salesVolume}>
          <Text style={styles.salesVolumeValue}>8</Text>
          <Text style={styles.salesVolumeLabel}>sales</Text>
        </View>
      </View>

      <ConditionTabs />
      <View style={styles.marketChartCard}>
        <View style={styles.cardHeadingRow}>
          <View>
            <Text style={styles.cardTitle}>Market history</Text>
            <Text style={styles.marketChartSub}>Low $6.80 · High $8.20</Text>
          </View>
          <Text style={styles.chartDelta}>+8.9%</Text>
        </View>
        <ValueChart accent="#F2CD37" height={210} />
        <RangeTabs />
      </View>

      <Pressable style={styles.fullMarketButton}>
        <ExpoSymbol ios="list.bullet.rectangle" web="list_alt" size={20} color="#101012" />
        <Text style={styles.fullMarketButtonText}>View 8 Market Rows</Text>
      </Pressable>
    </>
  );
}

function ConditionTabs() {
  return (
    <View style={styles.conditionTabs}>
      <View style={styles.conditionTab}><Text style={styles.conditionTabText}>USED · $4.92</Text></View>
      <View style={[styles.conditionTab, styles.conditionTabActive]}><Text style={styles.conditionTabActiveText}>NEW · $7.57</Text></View>
    </View>
  );
}

function RangeTabs({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.rangeTabs, compact && styles.rangeTabsCompact]}>
      <Text style={styles.rangeText}>1M</Text>
      <View style={styles.rangeActive}><Text style={styles.rangeActiveText}>3M</Text></View>
      <Text style={styles.rangeText}>6M</Text>
      {!compact ? <Text style={styles.rangeText}>12M</Text> : null}
    </View>
  );
}

function ValueChart({ accent, height }: { accent: string; height: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 340 220">
      <Defs>
        <LinearGradient id={`detailFill-${accent.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="0.26" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M2 184 C34 178 50 164 77 171 C105 179 119 124 145 138 C176 155 194 92 220 104 C249 117 268 67 294 81 C315 92 324 42 338 48 L338 220 L2 220 Z" fill={`url(#detailFill-${accent.replace("#", "")})`} />
      <Path d="M2 184 C34 178 50 164 77 171 C105 179 119 124 145 138 C176 155 194 92 220 104 C249 117 268 67 294 81 C315 92 324 42 338 48" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <Path d="M2 198 L338 198" fill="none" stroke="rgba(247,244,234,0.18)" strokeWidth="1" strokeDasharray="5 5" />
    </Svg>
  );
}

function HoldingStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.holdingStat}>
      <Text style={styles.holdingStatLabel}>{label}</Text>
      <Text style={[styles.holdingStatValue, accent && styles.accentText]}>{value}</Text>
    </View>
  );
}

function MarketRow({ date, place, condition, value }: { date: string; place: string; condition: string; value: string }) {
  return (
    <View style={styles.marketRow}>
      <View><Text style={styles.marketRowTitle}>BrickLink sold</Text><Text style={styles.marketRowMeta}>{date} · {place} · {condition}</Text></View>
      <Text style={styles.marketRowValue}>{value}</Text>
    </View>
  );
}

function CircleButton({ ios, web, label }: { ios: SFSymbol; web: AndroidSymbol; label: string }) {
  return (
    <Pressable accessibilityLabel={label} style={styles.circleButton}>
      <ExpoSymbol ios={ios} web={web} size={22} color="#F7F4EA" />
    </Pressable>
  );
}

function NativeTabPreview() {
  return (
    <View style={styles.tabDock}>
      <Tab icon="archivebox.fill" web="inventory_2" label="Collection" active />
      <Tab icon="viewfinder" web="document_scanner" label="Scan" />
      <Tab icon="gearshape" web="settings" label="Settings" />
    </View>
  );
}

function Tab({ icon, web, label, active = false }: { icon: SFSymbol; web: AndroidSymbol; label: string; active?: boolean }) {
  return (
    <View style={[styles.tabItem, active && styles.tabItemActive]}>
      <ExpoSymbol ios={icon} web={web} size={23} color={active ? "#F2CD37" : "#D3D0C9"} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function ExpoSymbol({ ios, web, size, color }: { ios: SFSymbol; web: AndroidSymbol; size: number; color: string }) {
  return <SymbolView name={{ ios, android: web, web }} size={size} type="hierarchical" tintColor={color} fallback={<Text style={{ color }}>+</Text>} />;
}

const styles = StyleSheet.create({
  phone: { width: 390, height: 844, borderRadius: 34, overflow: "hidden", alignSelf: "center", backgroundColor: "#08090A" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 118 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  controlRight: { flexDirection: "row", gap: 8 },
  circleButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(23,24,26,0.9)", borderWidth: 1, borderColor: "rgba(247,244,234,0.14)" },
  flexOne: { flex: 1 },
  referenceHero: { height: 225, alignItems: "center", justifyContent: "center" },
  referenceImage: { width: 214, height: 214, borderRadius: 22, backgroundColor: "#F4F1E8" },
  referencePanel: { marginTop: 10, borderRadius: 24, padding: 16, backgroundColor: "#050607", borderWidth: 1, borderColor: "rgba(247,244,234,0.16)" },
  referenceIdentityRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  referenceName: { color: "#F7F4EA", fontSize: 26, fontWeight: "900" },
  referenceMeta: { color: "#42DAD1", fontSize: 14, fontWeight: "800", marginTop: 6 },
  referenceSubmeta: { color: "rgba(247,244,234,0.58)", fontSize: 11, fontWeight: "800", marginTop: 5 },
  referenceActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 },
  soldButton: { minHeight: 46, borderRadius: 23, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 2, borderColor: "#42DAD1" },
  soldButtonText: { color: "#F7F4EA", fontSize: 12, fontWeight: "900" },
  referencePriceBlock: { alignItems: "flex-end" },
  referencePriceLabel: { color: "rgba(247,244,234,0.45)", fontSize: 9, fontWeight: "900" },
  referencePrice: { color: "#F7F4EA", fontSize: 25, fontWeight: "900", marginTop: 2 },
  conditionTabs: { height: 46, borderRadius: 23, padding: 4, flexDirection: "row", marginTop: 16, backgroundColor: "#202123" },
  conditionTab: { flex: 1, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  conditionTabActive: { backgroundColor: "#F2CD37" },
  conditionTabText: { color: "rgba(247,244,234,0.58)", fontSize: 11, fontWeight: "900" },
  conditionTabActiveText: { color: "#101012", fontSize: 11, fontWeight: "900" },
  referenceChartHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 },
  chartLegendDot: { width: 22, height: 5, borderRadius: 3, backgroundColor: "#42DAD1" },
  chartLegend: { color: "rgba(247,244,234,0.65)", fontSize: 12, fontWeight: "800" },
  chartDelta: { color: "#F2CD37", fontSize: 11, fontWeight: "900", marginLeft: "auto" },
  rangeTabs: { height: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 2, backgroundColor: "rgba(247,244,234,0.06)" },
  rangeTabsCompact: { height: 42 },
  rangeText: { color: "rgba(247,244,234,0.43)", fontSize: 12, fontWeight: "900" },
  rangeActive: { minWidth: 54, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#F2CD37" },
  rangeActiveText: { color: "#101012", fontSize: 12, fontWeight: "900" },
  collectorHeroCard: { minHeight: 204, borderRadius: 28, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(247,244,234,0.12)" },
  collectorImageWrap: { width: 144, height: 168, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F1E8" },
  collectorImage: { width: "92%", height: "92%" },
  collectorHeroCopy: { flex: 1, minWidth: 0 },
  typePill: { alignSelf: "flex-start", minHeight: 25, borderRadius: 13, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,205,55,0.1)" },
  typePillText: { color: "#F2CD37", fontSize: 8, fontWeight: "900" },
  collectorName: { color: "#F7F4EA", fontSize: 23, fontWeight: "900", marginTop: 9 },
  collectorMeta: { color: "rgba(247,244,234,0.5)", fontSize: 10, fontWeight: "800", marginTop: 5 },
  collectorValue: { color: "#F7F4EA", fontSize: 34, fontWeight: "900", marginTop: 15 },
  collectorValueMeta: { color: "rgba(247,244,234,0.42)", fontSize: 9, fontWeight: "800", marginTop: 2 },
  holdingStats: { flexDirection: "row", gap: 9, marginTop: 12 },
  holdingStat: { flex: 1, minHeight: 70, borderRadius: 20, padding: 12, justifyContent: "center", backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(247,244,234,0.09)" },
  holdingStatLabel: { color: "rgba(247,244,234,0.4)", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  holdingStatValue: { color: "#F7F4EA", fontSize: 18, fontWeight: "900", marginTop: 5 },
  accentText: { color: "#F2CD37" },
  collectorChartCard: { marginTop: 12, borderRadius: 28, padding: 16, backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(247,244,234,0.09)" },
  cardHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardEyebrow: { color: "rgba(247,244,234,0.38)", fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  cardTitle: { color: "#F7F4EA", fontSize: 16, fontWeight: "900", marginTop: 3 },
  savedMarketCard: { marginTop: 12, borderRadius: 28, padding: 16, gap: 4, backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(247,244,234,0.09)" },
  savedCount: { color: "#F2CD37", fontSize: 10, fontWeight: "900" },
  marketRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(247,244,234,0.07)" },
  marketRowTitle: { color: "#F7F4EA", fontSize: 12, fontWeight: "900" },
  marketRowMeta: { color: "rgba(247,244,234,0.42)", fontSize: 9, fontWeight: "800", marginTop: 3 },
  marketRowValue: { color: "#F2CD37", fontSize: 15, fontWeight: "900" },
  marketTitleBlock: { flexDirection: "row", alignItems: "center", gap: 14 },
  marketThumbWrap: { width: 118, height: 132, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F1E8" },
  marketThumb: { width: "92%", height: "92%" },
  marketTitleCopy: { flex: 1 },
  marketName: { color: "#F7F4EA", fontSize: 25, fontWeight: "900", marginTop: 5 },
  marketMeta: { color: "rgba(247,244,234,0.52)", fontSize: 11, fontWeight: "800", marginTop: 6 },
  marketValueCard: { minHeight: 130, marginTop: 13, borderRadius: 26, padding: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(242,205,55,0.18)" },
  marketValueLabel: { color: "rgba(247,244,234,0.4)", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  marketValue: { color: "#F7F4EA", fontSize: 43, fontWeight: "900", lineHeight: 48 },
  marketValueBasis: { color: "rgba(247,244,234,0.5)", fontSize: 10, fontWeight: "800" },
  salesVolume: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,205,55,0.1)", borderWidth: 1, borderColor: "rgba(242,205,55,0.23)" },
  salesVolumeValue: { color: "#F2CD37", fontSize: 22, fontWeight: "900" },
  salesVolumeLabel: { color: "rgba(247,244,234,0.45)", fontSize: 9, fontWeight: "800" },
  marketChartCard: { marginTop: 13, borderRadius: 28, padding: 16, backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(247,244,234,0.09)" },
  marketChartSub: { color: "rgba(247,244,234,0.42)", fontSize: 10, fontWeight: "800", marginTop: 4 },
  fullMarketButton: { minHeight: 56, marginTop: 13, borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F2CD37" },
  fullMarketButtonText: { color: "#101012", fontSize: 14, fontWeight: "900" },
  tabDock: { position: "absolute", left: 12, right: 12, bottom: 14, height: 78, borderRadius: 38, padding: 6, flexDirection: "row", backgroundColor: "rgba(31,32,36,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  tabItem: { flex: 1, borderRadius: 30, alignItems: "center", justifyContent: "center", gap: 3 },
  tabItemActive: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tabLabel: { color: "#D3D0C9", fontSize: 10, fontWeight: "700" },
  tabLabelActive: { color: "#F7F4EA", fontWeight: "900" },
  homeIndicator: { position: "absolute", bottom: 4, alignSelf: "center", width: 112, height: 4, borderRadius: 2, backgroundColor: "rgba(247,244,234,0.9)" },
});
