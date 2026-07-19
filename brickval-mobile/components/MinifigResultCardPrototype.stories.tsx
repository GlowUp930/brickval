import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// Three throwaway variants for the single-minifigure result shown over the captured frame.
type ResultVariant = "compact" | "market" | "confirm";

const MINIFIG_IMAGE = "https://img.bricklink.com/ItemImage/MN/0/sh0115.png";

function MinifigResultCardPrototype({ variant }: { variant: ResultVariant }) {
  return (
    <View style={styles.phone}>
      <CameraBackdrop />
      <View style={styles.resultScrim} />
      {variant === "compact" ? <CompactMatchSheet /> : null}
      {variant === "market" ? <MarketFirstSheet /> : null}
      {variant === "confirm" ? <ConfirmMatchSheet /> : null}
      <View style={styles.homeIndicator} />
    </View>
  );
}

const meta = {
  title: "Result card prototype / Single minifigure",
  component: MinifigResultCardPrototype,
  args: { variant: "compact" },
  render: (args) => <MinifigResultCardPrototype {...args} />,
} satisfies Meta<typeof MinifigResultCardPrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const A_CompactMatch: Story = {
  name: "A - Compact match",
  args: { variant: "compact" },
};

export const B_MarketFirst: Story = {
  name: "B - Market first",
  args: { variant: "market" },
};

export const C_ConfirmMatch: Story = {
  name: "C - Confirm match",
  args: { variant: "confirm" },
};

function CameraBackdrop() {
  return (
    <View style={styles.camera}>
      <View style={styles.deskGlow} />
      <View style={styles.laptop}>
        <View style={styles.laptopScreen} />
        <View style={styles.laptopBase} />
      </View>
      <View style={styles.hand} />
      <View style={styles.figureHead} />
      <View style={styles.figureBody} />
      <View style={styles.figureLegLeft} />
      <View style={styles.figureLegRight} />
      <View style={styles.cameraTopBar}>
        <CircleTool ios="bolt.slash" web="flash_off" />
        <View style={styles.scanModePill}>
          <View style={styles.scanModeActive}><Text style={styles.scanModeActiveText}>Minifig</Text></View>
          <Text style={styles.scanModeText}>Bulk</Text>
        </View>
        <CircleTool ios="person.crop.circle.fill" web="account_circle" />
      </View>
    </View>
  );
}

function CompactMatchSheet() {
  return (
    <View style={[styles.sheet, styles.compactSheet]}>
      <SheetHandle />
      <View style={styles.identityRow}>
        <CatalogImage size={88} />
        <View style={styles.identityCopy}>
          <View style={styles.matchRow}>
            <StatusPill label="MATCH FOUND" />
            <CloseButton />
          </View>
          <Text style={styles.name}>Spider-Man</Text>
          <Text style={styles.meta}>Juniors · sh0115</Text>
          <Text style={styles.detail}>2014 · Appears in 2 sets</Text>
        </View>
      </View>

      <View style={styles.pricePair}>
        <ConditionPrice label="USED" value="$4.92" />
        <View style={styles.priceDivider} />
        <ConditionPrice label="NEW" value="$7.57" selected />
      </View>

      <Pressable style={styles.correctionRow}>
        <View>
          <Text style={styles.correctionTitle}>Wrong minifigure?</Text>
          <Text style={styles.correctionMeta}>Compare 3 similar matches</Text>
        </View>
        <ExpoSymbol ios="chevron.right" web="chevron_right" size={22} color="#F7F4EA" />
      </Pressable>

      <PrimaryAction label="Add to Collection" />
      <Text style={styles.sourceFootnote}>BrickLink sold average · 8 recent sales</Text>
    </View>
  );
}

function MarketFirstSheet() {
  return (
    <View style={[styles.sheet, styles.marketSheet]}>
      <SheetHandle />
      <View style={styles.marketHeader}>
        <View style={styles.marketIdentity}>
          <CatalogImage size={66} />
          <View style={styles.marketIdentityCopy}>
            <StatusPill label="HIGH CONFIDENCE" />
            <Text style={styles.marketName}>Spider-Man</Text>
            <Text style={styles.meta}>Juniors · sh0115 · 2014</Text>
          </View>
        </View>
        <CloseButton />
      </View>

      <View style={styles.heroValueRow}>
        <View>
          <Text style={styles.marketEyebrow}>ESTIMATED MARKET VALUE</Text>
          <Text style={styles.heroValue}>$7.57</Text>
          <Text style={styles.marketBasis}>New condition · sold average</Text>
        </View>
        <View style={styles.salesBadge}>
          <Text style={styles.salesBadgeValue}>8</Text>
          <Text style={styles.salesBadgeLabel}>sales</Text>
        </View>
      </View>

      <View style={styles.conditionSegment}>
        <View style={styles.conditionSegmentOption}><Text style={styles.conditionSegmentText}>Used · $4.92</Text></View>
        <View style={[styles.conditionSegmentOption, styles.conditionSegmentActive]}><Text style={styles.conditionSegmentActiveText}>New · $7.57</Text></View>
      </View>

      <View style={styles.chartPanel}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Recent sold range</Text>
          <Text style={styles.chartRange}>$6.80 – $8.20</Text>
        </View>
        <MiniChart />
      </View>

      <View style={styles.marketFacts}>
        <Fact label="Source" value="BrickLink" />
        <Fact label="Basis" value="Sold comps" />
        <Fact label="Updated" value="Today" />
      </View>

      <View style={styles.marketActions}>
        <Pressable style={styles.secondaryIconAction} accessibilityLabel="Change match">
          <ExpoSymbol ios="arrow.triangle.2.circlepath" web="sync" size={22} color="#F7F4EA" />
        </Pressable>
        <PrimaryAction label="Add to Collection" compact />
      </View>
    </View>
  );
}

function ConfirmMatchSheet() {
  return (
    <View style={[styles.sheet, styles.confirmSheet]}>
      <SheetHandle />
      <View style={styles.confirmTitleRow}>
        <View>
          <Text style={styles.confirmEyebrow}>REVIEW MATCH</Text>
          <Text style={styles.confirmTitle}>Is this Spider-Man?</Text>
        </View>
        <CloseButton />
      </View>

      <View style={styles.comparePanel}>
        <View style={styles.compareItem}>
          <CapturedCrop />
          <Text style={styles.compareLabel}>Your scan</Text>
        </View>
        <View style={styles.compareArrow}>
          <ExpoSymbol ios="arrow.right" web="arrow_forward" size={22} color="#F2CD37" />
        </View>
        <View style={styles.compareItem}>
          <CatalogImage size={94} />
          <Text style={styles.compareLabel}>Catalog match</Text>
        </View>
      </View>

      <View style={styles.confirmIdentityRow}>
        <View>
          <View style={styles.confirmNameRow}>
            <Text style={styles.confirmName}>Spider-Man</Text>
            <StatusPill label="96% MATCH" />
          </View>
          <Text style={styles.meta}>Juniors · sh0115 · 2014</Text>
        </View>
        <View style={styles.confirmPriceBlock}>
          <Text style={styles.confirmPrice}>$7.57</Text>
          <Text style={styles.confirmPriceLabel}>new</Text>
        </View>
      </View>

      <View style={styles.alternativesHeader}>
        <Text style={styles.alternativesTitle}>Other possible matches</Text>
        <Text style={styles.alternativesAction}>View all</Text>
      </View>
      <View style={styles.alternativeRow}>
        <Alternative code="sh0381" price="$6.20" tone="#D94A32" />
        <Alternative code="sh0691" price="$9.10" tone="#245FC5" />
        <Alternative code="sh0420" price="$5.85" tone="#B13232" />
      </View>

      <View style={styles.confirmFooter}>
        <Pressable style={styles.notMatchButton}><Text style={styles.notMatchText}>Not a match</Text></Pressable>
        <PrimaryAction label="Confirm & Add" compact />
      </View>
    </View>
  );
}

function SheetHandle() {
  return <View style={styles.sheetHandle} />;
}

function CatalogImage({ size }: { size: number }) {
  return (
    <View style={[styles.catalogImageFrame, { width: size, height: size }]}>
      <Image source={{ uri: MINIFIG_IMAGE }} style={styles.catalogImage} resizeMode="contain" />
    </View>
  );
}

function CapturedCrop() {
  return (
    <View style={styles.capturedCrop}>
      <View style={styles.cropHead} />
      <View style={styles.cropBody} />
      <View style={styles.cropLegs} />
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <ExpoSymbol ios="checkmark.circle.fill" web="check_circle" size={13} color="#F2CD37" />
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function CloseButton() {
  return (
    <Pressable accessibilityLabel="Close result" style={styles.closeButton}>
      <ExpoSymbol ios="xmark" web="close" size={20} color="#F7F4EA" />
    </Pressable>
  );
}

function ConditionPrice({ label, value, selected = false }: { label: string; value: string; selected?: boolean }) {
  return (
    <View style={styles.conditionPrice}>
      <Text style={[styles.conditionLabel, selected && styles.conditionLabelSelected]}>{label}</Text>
      <Text style={styles.conditionValue}>{value}</Text>
    </View>
  );
}

function PrimaryAction({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <Pressable style={[styles.primaryAction, compact && styles.primaryActionCompact]}>
      <ExpoSymbol ios="plus.circle.fill" web="add_circle" size={22} color="#101012" />
      <Text style={styles.primaryActionText}>{label}</Text>
    </Pressable>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function MiniChart() {
  return (
    <Svg width="100%" height={82} viewBox="0 0 320 82">
      <Defs>
        <LinearGradient id="resultChartFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2CD37" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#F2CD37" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M2 66 C36 58 45 68 74 48 C102 29 118 53 146 39 C180 23 203 46 230 31 C258 17 283 29 318 12 L318 82 L2 82 Z" fill="url(#resultChartFill)" />
      <Path d="M2 66 C36 58 45 68 74 48 C102 29 118 53 146 39 C180 23 203 46 230 31 C258 17 283 29 318 12" fill="none" stroke="#F2CD37" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function Alternative({ code, price, tone }: { code: string; price: string; tone: string }) {
  return (
    <View style={styles.alternativeCard}>
      <View style={[styles.altFigure, { backgroundColor: tone }]} />
      <Text style={styles.altCode}>{code}</Text>
      <Text style={styles.altPrice}>{price}</Text>
    </View>
  );
}

function CircleTool({ ios, web }: { ios: SFSymbol; web: AndroidSymbol }) {
  return (
    <View style={styles.circleTool}>
      <ExpoSymbol ios={ios} web={web} size={24} color="#F7F4EA" />
    </View>
  );
}

function ExpoSymbol({ ios, web, size, color }: { ios: SFSymbol; web: AndroidSymbol; size: number; color: string }) {
  return (
    <SymbolView
      name={{ ios, android: web, web }}
      size={size}
      type="hierarchical"
      tintColor={color}
      fallback={<Text style={{ color, fontSize: size * 0.75, fontWeight: "900" }}>+</Text>}
    />
  );
}

const styles = StyleSheet.create({
  phone: { width: 390, height: 844, borderRadius: 34, overflow: "hidden", backgroundColor: "#111214", alignSelf: "center" },
  camera: { ...StyleSheet.absoluteFill, backgroundColor: "#34332E" },
  deskGlow: { position: "absolute", left: -40, right: -40, bottom: 160, height: 380, backgroundColor: "rgba(191,151,91,0.28)", transform: [{ rotate: "-8deg" }] },
  laptop: { position: "absolute", top: 122, left: 58, width: 274, height: 164, transform: [{ rotate: "4deg" }] },
  laptopScreen: { height: 138, borderRadius: 8, backgroundColor: "#15171B", borderWidth: 8, borderColor: "#A6A39A" },
  laptopBase: { alignSelf: "center", width: 250, height: 24, backgroundColor: "#B9B5AA", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  hand: { position: "absolute", left: 84, top: 397, width: 228, height: 260, borderRadius: 110, backgroundColor: "#C78B64", transform: [{ rotate: "-12deg" }] },
  figureHead: { position: "absolute", top: 286, left: 168, width: 56, height: 54, borderRadius: 14, backgroundColor: "#C92E2A", borderWidth: 5, borderColor: "#1B2735" },
  figureBody: { position: "absolute", top: 335, left: 148, width: 96, height: 84, borderRadius: 13, backgroundColor: "#275FAF", borderWidth: 7, borderColor: "#B52526" },
  figureLegLeft: { position: "absolute", top: 411, left: 157, width: 39, height: 74, borderRadius: 8, backgroundColor: "#275FAF", borderWidth: 5, borderColor: "#B52526" },
  figureLegRight: { position: "absolute", top: 411, left: 198, width: 39, height: 74, borderRadius: 8, backgroundColor: "#275FAF", borderWidth: 5, borderColor: "#B52526" },
  cameraTopBar: { position: "absolute", top: 48, left: 18, right: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  circleTool: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,15,17,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  scanModePill: { width: 214, height: 46, borderRadius: 23, padding: 4, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(14,15,17,0.76)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  scanModeActive: { flex: 1, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F2CD37" },
  scanModeActiveText: { color: "#101012", fontSize: 13, fontWeight: "900" },
  scanModeText: { flex: 1, color: "rgba(247,244,234,0.68)", textAlign: "center", fontSize: 13, fontWeight: "900" },
  resultScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.12)" },
  sheet: { position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 30, backgroundColor: "#17181A", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 18, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
  compactSheet: { minHeight: 470, paddingBottom: 24 },
  marketSheet: { minHeight: 604, paddingBottom: 24 },
  confirmSheet: { minHeight: 548, paddingBottom: 22 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "rgba(247,244,234,0.24)", alignSelf: "center", marginTop: 10, marginBottom: 15 },
  identityRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  catalogImageFrame: { borderRadius: 16, backgroundColor: "#F7F4EA", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  catalogImage: { width: "92%", height: "92%" },
  identityCopy: { flex: 1, minWidth: 0 },
  matchRow: { minHeight: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { alignSelf: "flex-start", minHeight: 26, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, backgroundColor: "rgba(242,205,55,0.11)", borderWidth: 1, borderColor: "rgba(242,205,55,0.28)" },
  statusPillText: { color: "#F2CD37", fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,244,234,0.07)", borderWidth: 1, borderColor: "rgba(247,244,234,0.12)" },
  name: { color: "#F7F4EA", fontSize: 25, fontWeight: "900", marginTop: 4 },
  marketName: { color: "#F7F4EA", fontSize: 20, fontWeight: "900", marginTop: 5 },
  meta: { color: "rgba(247,244,234,0.6)", fontSize: 13, fontWeight: "800", marginTop: 4 },
  detail: { color: "rgba(247,244,234,0.78)", fontSize: 12, fontWeight: "800", marginTop: 7 },
  pricePair: { height: 96, marginTop: 17, borderRadius: 22, flexDirection: "row", alignItems: "center", backgroundColor: "#111214", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  conditionPrice: { flex: 1, alignItems: "center", gap: 8 },
  conditionLabel: { color: "#E26E34", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  conditionLabelSelected: { color: "#F2CD37" },
  conditionValue: { color: "#F7F4EA", fontSize: 26, fontWeight: "900" },
  priceDivider: { width: 1, height: 56, backgroundColor: "rgba(255,255,255,0.09)" },
  correctionRow: { minHeight: 60, marginTop: 13, paddingHorizontal: 14, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(247,244,234,0.04)" },
  correctionTitle: { color: "#F7F4EA", fontSize: 14, fontWeight: "900" },
  correctionMeta: { color: "rgba(247,244,234,0.5)", fontSize: 11, fontWeight: "700", marginTop: 3 },
  primaryAction: { minHeight: 58, marginTop: 14, borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#F2CD37" },
  primaryActionCompact: { flex: 1, marginTop: 0, minHeight: 54 },
  primaryActionText: { color: "#101012", fontSize: 16, fontWeight: "900" },
  sourceFootnote: { color: "rgba(247,244,234,0.42)", fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 10 },
  marketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  marketIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  marketIdentityCopy: { flex: 1 },
  heroValueRow: { marginTop: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  marketEyebrow: { color: "rgba(247,244,234,0.48)", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  heroValue: { color: "#F7F4EA", fontSize: 48, lineHeight: 55, fontWeight: "900", letterSpacing: -1.2 },
  marketBasis: { color: "rgba(247,244,234,0.55)", fontSize: 11, fontWeight: "800" },
  salesBadge: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,205,55,0.11)", borderWidth: 1, borderColor: "rgba(242,205,55,0.25)" },
  salesBadgeValue: { color: "#F2CD37", fontSize: 21, fontWeight: "900" },
  salesBadgeLabel: { color: "rgba(247,244,234,0.52)", fontSize: 9, fontWeight: "800" },
  conditionSegment: { height: 46, borderRadius: 23, padding: 4, flexDirection: "row", marginTop: 15, backgroundColor: "#101113" },
  conditionSegmentOption: { flex: 1, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  conditionSegmentActive: { backgroundColor: "#F2CD37" },
  conditionSegmentText: { color: "rgba(247,244,234,0.6)", fontSize: 12, fontWeight: "900" },
  conditionSegmentActiveText: { color: "#101012", fontSize: 12, fontWeight: "900" },
  chartPanel: { marginTop: 13, borderRadius: 20, paddingHorizontal: 14, paddingTop: 12, backgroundColor: "rgba(247,244,234,0.035)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { color: "#F7F4EA", fontSize: 12, fontWeight: "900" },
  chartRange: { color: "#F2CD37", fontSize: 11, fontWeight: "900" },
  marketFacts: { minHeight: 58, marginTop: 12, borderRadius: 18, flexDirection: "row", backgroundColor: "#101113", overflow: "hidden" },
  fact: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  factLabel: { color: "rgba(247,244,234,0.4)", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  factValue: { color: "#F7F4EA", fontSize: 11, fontWeight: "900" },
  marketActions: { flexDirection: "row", gap: 10, marginTop: 13 },
  secondaryIconAction: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,244,234,0.06)", borderWidth: 1, borderColor: "rgba(247,244,234,0.12)" },
  confirmTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmEyebrow: { color: "#F2CD37", fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  confirmTitle: { color: "#F7F4EA", fontSize: 24, fontWeight: "900", marginTop: 4 },
  comparePanel: { minHeight: 132, marginTop: 14, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15, backgroundColor: "#101113", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  compareItem: { alignItems: "center", gap: 6 },
  capturedCrop: { width: 94, height: 94, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#6A5A48", overflow: "hidden" },
  cropHead: { width: 32, height: 30, borderRadius: 8, backgroundColor: "#C92E2A", borderWidth: 3, borderColor: "#1B2735" },
  cropBody: { width: 50, height: 38, borderRadius: 6, backgroundColor: "#275FAF", borderWidth: 4, borderColor: "#B52526" },
  cropLegs: { width: 44, height: 19, backgroundColor: "#275FAF", borderRadius: 4 },
  compareLabel: { color: "rgba(247,244,234,0.48)", fontSize: 9, fontWeight: "800" },
  compareArrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,205,55,0.1)" },
  confirmIdentityRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmName: { color: "#F7F4EA", fontSize: 21, fontWeight: "900" },
  confirmPriceBlock: { alignItems: "flex-end" },
  confirmPrice: { color: "#F2CD37", fontSize: 24, fontWeight: "900" },
  confirmPriceLabel: { color: "rgba(247,244,234,0.45)", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  alternativesHeader: { marginTop: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alternativesTitle: { color: "#F7F4EA", fontSize: 12, fontWeight: "900" },
  alternativesAction: { color: "#F2CD37", fontSize: 11, fontWeight: "900" },
  alternativeRow: { flexDirection: "row", gap: 9, marginTop: 9 },
  alternativeCard: { flex: 1, minHeight: 82, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,244,234,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  altFigure: { width: 23, height: 34, borderRadius: 6, borderWidth: 3, borderColor: "#121317" },
  altCode: { color: "rgba(247,244,234,0.56)", fontSize: 9, fontWeight: "800", marginTop: 4 },
  altPrice: { color: "#F7F4EA", fontSize: 11, fontWeight: "900", marginTop: 2 },
  confirmFooter: { flexDirection: "row", gap: 10, marginTop: 13 },
  notMatchButton: { width: 116, minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,244,234,0.05)", borderWidth: 1, borderColor: "rgba(247,244,234,0.13)" },
  notMatchText: { color: "#F7F4EA", fontSize: 12, fontWeight: "900" },
  homeIndicator: { position: "absolute", bottom: 4, alignSelf: "center", width: 112, height: 4, borderRadius: 2, backgroundColor: "rgba(247,244,234,0.9)" },
});
