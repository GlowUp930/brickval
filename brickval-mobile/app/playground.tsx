import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  BadgeDollarSign,
  Box,
  Camera,
  ChartSpline,
  ChevronRight,
  Gem,
  Layers3,
  ScanSearch,
  Sparkles,
} from "lucide-react-native";
import { MotiView } from "moti";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";

const concepts = [
  {
    key: "store",
    label: "Store scan",
    title: "Scan first. Price second.",
    body: "The camera stays dominant, then the value card rises fast with source confidence.",
  },
  {
    key: "bulk",
    label: "Bulk minifigs",
    title: "Many figures, one result flow.",
    body: "Group detection feels like a sorting tray, then each priced item can be saved.",
  },
  {
    key: "vault",
    label: "Collection",
    title: "Portfolio value feels serious.",
    body: "A collector dashboard should feel like money, history, and proof, not a generic list.",
  },
] as const;

const sampleItems = [
  { name: "Millennium Falcon", meta: "Set 75192", value: "$812", gain: "+18%" },
  { name: "Wolfpack Renegade", meta: "Minifig cas576", value: "$42", gain: "+7%" },
  { name: "Chrome Lightsaber Hilt", meta: "Part 64567", value: "$16", gain: "+31%" },
];

type ConceptKey = (typeof concepts)[number]["key"];

export default function PlaygroundScreen() {
  const [selectedConcept, setSelectedConcept] = useState<ConceptKey>("store");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useMemo(() => getStyles(insets.top, insets.bottom, width), [insets.top, insets.bottom, width]);
  const activeConcept = concepts.find((concept) => concept.key === selectedConcept) ?? concepts[0];

  const selectConcept = (concept: ConceptKey) => {
    setSelectedConcept(concept);
    void Haptics.selectionAsync();
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#0E0F11", "#191A1F", "#26231A"]} style={StyleSheet.absoluteFill} />
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.backButton}>
            <ArrowLeft size={19} color={colors.dark.text} strokeWidth={2.4} />
          </Pressable>
          <View style={s.topCopy}>
            <Text style={s.kicker}>Design playground</Text>
            <Text style={s.headerTitle}>BrickVal native redesign lab</Text>
          </View>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 420 }}
          style={s.heroCard}
        >
          <View style={s.heroHeader}>
            <View style={s.logoMark}>
              <Box size={24} color={colors.lego.black} strokeWidth={2.5} />
            </View>
            <View style={s.heroTitleWrap}>
              <Text style={s.heroTitle}>Premium scan surface</Text>
              <Text style={s.heroBody}>Previewing a sharper direction for scan, result, and collection moments.</Text>
            </View>
          </View>

          <View style={s.conceptRail}>
            {concepts.map((concept) => {
              const selected = concept.key === selectedConcept;
              return (
                <Pressable
                  key={concept.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Preview ${concept.label}`}
                  onPress={() => selectConcept(concept.key)}
                  style={[s.conceptPill, selected && s.conceptPillActive]}
                >
                  <Text style={[s.conceptText, selected && s.conceptTextActive]}>{concept.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.heroStatement}>
            <Text style={s.statementTitle}>{activeConcept.title}</Text>
            <Text style={s.statementBody}>{activeConcept.body}</Text>
          </View>
        </MotiView>

        <View style={s.previewGrid}>
          <ScanPreviewCard styles={s} concept={selectedConcept} />
          <ResultPreviewCard styles={s} />
        </View>

        <CollectionPreview styles={s} />

        <View style={s.patternRow}>
          <PatternTile styles={s} icon={<ChartSpline size={20} color={colors.lego.yellow} strokeWidth={2.4} />} label="Value chart" value="Source-led" />
          <PatternTile styles={s} icon={<Layers3 size={20} color={colors.lego.yellow} strokeWidth={2.4} />} label="Bulk scan" value="Tray flow" />
          <PatternTile styles={s} icon={<Gem size={20} color={colors.lego.yellow} strokeWidth={2.4} />} label="Pro moment" value="Quiet upsell" />
        </View>
      </ScrollView>
    </View>
  );
}

function ScanPreviewCard({ styles: s, concept }: { styles: ReturnType<typeof getStyles>; concept: ConceptKey }) {
  const chipText = concept === "bulk" ? "12 detected" : concept === "vault" ? "Saved proof" : "Ready";
  return (
    <BlurView tint="dark" intensity={34} style={s.scanCard}>
      <View style={s.scanCardTop}>
        <View>
          <Text style={s.cardLabel}>Scanner</Text>
          <Text style={s.cardTitle}>Fast value capture</Text>
        </View>
        <View style={s.statusChip}>
          <Sparkles size={14} color={colors.lego.yellow} strokeWidth={2.6} />
          <Text style={s.statusChipText}>{chipText}</Text>
        </View>
      </View>

      <View style={s.viewfinder}>
        <View style={[s.corner, s.cornerTopLeft]} />
        <View style={[s.corner, s.cornerTopRight]} />
        <View style={[s.corner, s.cornerBottomLeft]} />
        <View style={[s.corner, s.cornerBottomRight]} />
        <View style={s.scanPlate}>
          <Camera size={34} color={colors.lego.yellow} strokeWidth={2.2} />
          <Text style={s.scanPlateText}>Box, minifig, or part</Text>
        </View>
      </View>

      <View style={s.actionRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Preview camera scan" style={s.primaryButton}>
          <ScanSearch size={17} color={colors.lego.black} strokeWidth={2.6} />
          <Text style={s.primaryButtonText}>Scan</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Preview manual set entry" style={s.secondaryButton}>
          <Text style={s.secondaryButtonText}>Set number</Text>
        </Pressable>
      </View>
    </BlurView>
  );
}

function ResultPreviewCard({ styles: s }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <View style={s.resultCard}>
      <View style={s.resultTop}>
        <View style={s.resultIcon}>
          <BadgeDollarSign size={22} color={colors.lego.black} strokeWidth={2.5} />
        </View>
        <View style={s.sourceBadge}>
          <Text style={s.sourceBadgeText}>BrickLink sold</Text>
        </View>
      </View>

      <Text style={s.resultName}>Imperial Star Destroyer</Text>
      <Text style={s.resultMeta}>Set 75252. New condition estimate.</Text>

      <View style={s.priceBlock}>
        <Text style={s.priceLabel}>Market value</Text>
        <Text style={s.priceValue}>$694</Text>
      </View>

      <View style={s.resultFooter}>
        <Text style={s.rrpText}>RRP: ~$700</Text>
        <Text style={s.deltaText}>-1%</Text>
      </View>
    </View>
  );
}

function CollectionPreview({ styles: s }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <View style={s.collectionCard}>
      <View style={s.sectionTop}>
        <View>
          <Text style={s.cardLabel}>Collection surface</Text>
          <Text style={s.cardTitle}>Portfolio, not inventory</Text>
        </View>
        <Text style={s.totalValue}>$870</Text>
      </View>

      <View style={s.chartMock}>
        <View style={[s.chartBar, { height: 34 }]} />
        <View style={[s.chartBar, { height: 52 }]} />
        <View style={[s.chartBar, { height: 42 }]} />
        <View style={[s.chartBar, { height: 70 }]} />
        <View style={[s.chartBar, { height: 62 }]} />
      </View>

      <View style={s.itemList}>
        {sampleItems.map((item) => (
          <View key={item.name} style={s.itemRow}>
            <View style={s.itemStud} />
            <View style={s.itemCopy}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemMeta}>{item.meta}</Text>
            </View>
            <View style={s.itemValueBlock}>
              <Text style={s.itemValue}>{item.value}</Text>
              <Text style={s.itemGain}>{item.gain}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PatternTile({
  styles: s,
  icon,
  label,
  value,
}: {
  styles: ReturnType<typeof getStyles>;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={s.patternTile}>
      <View style={s.patternIcon}>{icon}</View>
      <Text style={s.patternLabel}>{label}</Text>
      <View style={s.patternValueRow}>
        <Text style={s.patternValue}>{value}</Text>
        <ChevronRight size={15} color="rgba(245,245,247,0.46)" strokeWidth={2.6} />
      </View>
    </View>
  );
}

function getStyles(safeTop = 0, safeBottom = 0, width = 390) {
  const compact = width < 380;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.dark.background },
    glowTop: {
      position: "absolute",
      top: -120,
      right: -100,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: "rgba(242, 205, 55, 0.16)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -140,
      left: -120,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: Math.max(54, safeTop + 16),
      paddingBottom: Math.max(46, safeBottom + 26),
      gap: 16,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
    },
    topCopy: { flex: 1, minWidth: 0 },
    kicker: { color: colors.lego.yellow, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    headerTitle: { color: colors.dark.text, fontSize: compact ? 22 : 24, fontWeight: "900", letterSpacing: -0.4 },
    heroCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.08)",
      padding: 16,
      gap: 16,
      overflow: "hidden",
    },
    heroHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    logoMark: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.lego.yellow,
    },
    heroTitleWrap: { flex: 1, minWidth: 0 },
    heroTitle: { color: colors.dark.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.2 },
    heroBody: { color: colors.dark.textMuted, fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 3 },
    conceptRail: { flexDirection: "row", gap: 8 },
    conceptPill: {
      flex: 1,
      minHeight: 38,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      backgroundColor: "rgba(255,255,255,0.07)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.09)",
    },
    conceptPillActive: {
      backgroundColor: colors.lego.yellow,
      borderColor: colors.lego.yellow,
    },
    conceptText: { color: colors.dark.textMuted, fontSize: compact ? 10 : 11, fontWeight: "900" },
    conceptTextActive: { color: colors.lego.black },
    heroStatement: {
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.24)",
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    statementTitle: { color: colors.dark.text, fontSize: 22, lineHeight: 27, fontWeight: "900", letterSpacing: -0.5 },
    statementBody: { color: colors.dark.textMuted, fontSize: 13, lineHeight: 19, fontWeight: "700", marginTop: 6 },
    previewGrid: { gap: 16 },
    scanCard: {
      borderRadius: 28,
      overflow: "hidden",
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.11)",
      backgroundColor: "rgba(17,18,22,0.72)",
      gap: 14,
    },
    scanCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    cardLabel: { color: colors.lego.yellow, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    cardTitle: { color: colors.dark.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.25, marginTop: 2 },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 10,
      minHeight: 30,
      backgroundColor: "rgba(242,205,55,0.12)",
      borderWidth: 1,
      borderColor: "rgba(242,205,55,0.22)",
    },
    statusChipText: { color: colors.dark.text, fontSize: 11, fontWeight: "900" },
    viewfinder: {
      height: 208,
      borderRadius: 24,
      backgroundColor: "rgba(5,8,12,0.62)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    corner: {
      position: "absolute",
      width: 35,
      height: 35,
      borderColor: colors.lego.yellow,
    },
    cornerTopLeft: { top: 18, left: 18, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
    cornerTopRight: { top: 18, right: 18, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
    cornerBottomLeft: { bottom: 18, left: 18, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
    cornerBottomRight: { bottom: 18, right: 18, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
    scanPlate: { alignItems: "center", gap: 10 },
    scanPlateText: { color: colors.dark.textMuted, fontSize: 13, fontWeight: "800" },
    actionRow: { flexDirection: "row", gap: 10 },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.lego.yellow,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    primaryButtonText: { color: colors.lego.black, fontSize: 14, fontWeight: "900" },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 16,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    secondaryButtonText: { color: colors.dark.text, fontSize: 13, fontWeight: "900" },
    resultCard: {
      borderRadius: 28,
      padding: 18,
      backgroundColor: "#F7F7F2",
      borderWidth: 1,
      borderColor: "rgba(242,205,55,0.26)",
      gap: 12,
    },
    resultTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    resultIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.lego.yellow,
    },
    sourceBadge: {
      minHeight: 30,
      borderRadius: 999,
      paddingHorizontal: 10,
      justifyContent: "center",
      backgroundColor: "rgba(17,17,17,0.06)",
    },
    sourceBadgeText: { color: "#111111", fontSize: 11, fontWeight: "900" },
    resultName: { color: "#111111", fontSize: 23, fontWeight: "900", letterSpacing: -0.45 },
    resultMeta: { color: "rgba(17,17,17,0.58)", fontSize: 13, fontWeight: "700", lineHeight: 18 },
    priceBlock: { marginTop: 2 },
    priceLabel: { color: "rgba(17,17,17,0.52)", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    priceValue: { color: "#111111", fontSize: 54, lineHeight: 60, fontWeight: "900", letterSpacing: -2.2 },
    resultFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "rgba(17,17,17,0.10)",
      paddingTop: 12,
    },
    rrpText: { color: "rgba(17,17,17,0.62)", fontSize: 13, fontWeight: "800" },
    deltaText: { color: colors.semantic.danger, fontSize: 13, fontWeight: "900" },
    collectionCard: {
      borderRadius: 28,
      padding: 16,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.11)",
      gap: 16,
    },
    sectionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
    totalValue: { color: colors.lego.yellow, fontSize: 25, fontWeight: "900", letterSpacing: -0.6 },
    chartMock: {
      height: 92,
      borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.20)",
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      padding: 14,
    },
    chartBar: {
      flex: 1,
      borderRadius: 999,
      backgroundColor: "rgba(242,205,55,0.74)",
    },
    itemList: { gap: 10 },
    itemRow: {
      minHeight: 62,
      borderRadius: 18,
      backgroundColor: "rgba(0,0,0,0.20)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    itemStud: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.lego.yellow },
    itemCopy: { flex: 1, minWidth: 0 },
    itemName: { color: colors.dark.text, fontSize: 14, fontWeight: "900" },
    itemMeta: { color: colors.dark.textMuted, fontSize: 12, fontWeight: "700", marginTop: 2 },
    itemValueBlock: { alignItems: "flex-end" },
    itemValue: { color: colors.dark.text, fontSize: 15, fontWeight: "900" },
    itemGain: { color: colors.semantic.success, fontSize: 12, fontWeight: "900", marginTop: 2 },
    patternRow: { flexDirection: compact ? "column" : "row", gap: 10 },
    patternTile: {
      flex: 1,
      minHeight: 118,
      borderRadius: 22,
      padding: 13,
      backgroundColor: "rgba(0,0,0,0.22)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.09)",
      justifyContent: "space-between",
    },
    patternIcon: {
      width: 36,
      height: 36,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(242,205,55,0.10)",
    },
    patternLabel: { color: colors.dark.textMuted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    patternValueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    patternValue: { color: colors.dark.text, fontSize: 15, fontWeight: "900" },
  });
}
