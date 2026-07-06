import { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { MarketRow } from "../lib/market-rows";
import type { ModeColors, ThemeColors } from "../lib/theme";

const USD_DECIMAL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function MarketRowsTable({
  rows,
  colors,
  activeColors,
  initialVisible = 4,
}: {
  rows: MarketRow[];
  colors: ThemeColors;
  activeColors?: ModeColors;
  initialVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const s = useMemo(() => getStyles(colors, activeColors ?? colors.dark), [colors, activeColors]);
  const visibleRows = expanded ? rows : rows.slice(0, initialVisible);
  const hasMore = rows.length > initialVisible;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={s.table}>
      <View style={s.headerRow}>
        <Text style={[s.headerCell, s.sourceCell]}>Source</Text>
        <Text style={[s.headerCell, s.metaCell]}>Details</Text>
        <Text style={[s.headerCell, s.priceCell]}>USD</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={s.emptyRows}>No detailed market rows came back for this scan.</Text>
      ) : (
        visibleRows.map((row, index) => (
          <Animated.View
            key={row.id}
            style={[
              s.row,
              index === visibleRows.length - 1 && s.lastRow,
              {
                opacity: expanded ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) : 1,
              },
            ]}
          >
            <Text style={[s.cell, s.sourceCell]} numberOfLines={2}>
              {row.label}
            </Text>
            <Text style={[s.cell, s.metaCell]} numberOfLines={2}>
              {row.meta}
            </Text>
            <Text style={[s.cell, s.priceCell]} numberOfLines={1}>
              {USD_DECIMAL.format(row.priceUsd)}
            </Text>
          </Animated.View>
        ))
      )}

      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? "Collapse market rows" : "Expand market rows"}
          style={s.expandButton}
          onPress={toggleExpanded}
        >
          <Text style={s.expandText}>{expanded ? "Show fewer rows" : `Show all ${rows.length} rows`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getStyles(c: ThemeColors, m: ModeColors) {
  return StyleSheet.create({
    table: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: m.border,
      overflow: "hidden",
      backgroundColor: m.surface,
    },
    headerRow: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: m.backgroundMuted,
      borderBottomWidth: 1,
      borderBottomColor: m.border,
    },
    headerCell: {
      color: m.textDisabled,
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      paddingHorizontal: 10,
    },
    row: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: m.border,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    cell: {
      color: m.text,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 16,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    sourceCell: {
      flex: 0.9,
    },
    metaCell: {
      flex: 1.2,
      color: m.textMuted,
    },
    priceCell: {
      flex: 0.85,
      color: c.lego.yellow,
      textAlign: "right",
    },
    emptyRows: {
      color: m.textMuted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
      padding: 14,
    },
    expandButton: {
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: m.border,
      backgroundColor: "rgba(242,205,55,0.08)",
    },
    expandText: {
      color: c.lego.yellow,
      fontSize: 12,
      fontWeight: "900",
    },
  });
}
