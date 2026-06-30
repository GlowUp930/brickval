import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Linking, Platform, View, Text, StyleSheet, Pressable, ScrollView, type ImageSourcePropType } from "react-native";
import * as SecureStore from "expo-secure-store";
import { clearCollection, getCollection, getCollectionValue, type CollectionItem } from "../../lib/collection";
import { getAuthToken } from "../../lib/api";
import { warn } from "../../lib/haptics";
import {
  getNativeProStatus,
  restoreNativePurchases,
} from "../../lib/paywall";
import { useUpgrade } from "../../lib/useUpgrade";
import { useTheme, type ModeColors } from "../../lib/ThemeProvider";
import { PrePurchaseDisclosure } from "../../components/PrePurchaseDisclosure";
import { colors } from "../../lib/theme";

const AVATAR_KEY = "brickval_account_avatar";
const PRIVACY_URL = "https://brickvalue.live/privacy";
const TERMS_URL = "https://brickvalue.live/terms";

type AvatarKey = "classic" | "ghost" | "wolf" | "knight";

const AVATARS: { key: AvatarKey; label: string; meta: string; source: ImageSourcePropType }[] = [
  { key: "classic", label: "Classic", meta: "Blue cap", source: require("../../assets/account-icons/classic.webp") },
  { key: "ghost", label: "Ghost", meta: "Glow shell", source: require("../../assets/account-icons/ghost.webp") },
  { key: "wolf", label: "Wolf", meta: "Wolfpack", source: require("../../assets/account-icons/wolf.webp") },
  { key: "knight", label: "Knight", meta: "Castle helm", source: require("../../assets/account-icons/knight.webp") },
];

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function isAvatarKey(value: string | null): value is AvatarKey {
  return AVATARS.some((option) => option.key === value);
}

function getAvatarOption(avatar: AvatarKey) {
  return AVATARS.find((option) => option.key === avatar) ?? AVATARS[0];
}

export default function SettingsScreen() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [avatar, setAvatar] = useState<AvatarKey>("classic");
  const [proStatus, setProStatus] = useState<boolean | null>(null);
  const { triggerUpgrade, openAccountForSignIn, showDisclosure, handleDisclosureContinue, handleDisclosureDismiss } = useUpgrade();
  const { colors, c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCollection() {
        const [collection, savedAvatar, nextProStatus] = await Promise.all([
          getCollection(),
          SecureStore.getItemAsync(AVATAR_KEY),
          getNativeProStatus(),
        ]);
        if (!active) return;
        setItems(collection);
        setProStatus(nextProStatus);
        if (isAvatarKey(savedAvatar)) {
          setAvatar(savedAvatar);
        }
      }
      loadCollection();
      return () => {
        active = false;
      };
    }, [])
  );

  const totalValue = getCollectionValue(items);
  const setCount = items.reduce((total, item) => total + (item.item_type === "set" ? item.quantity ?? 1 : 0), 0);
  const minifigureCount = items.reduce((total, item) => total + (item.item_type === "minifig" ? item.quantity ?? 1 : 0), 0);
  const partCount = items.reduce((total, item) => total + (item.item_type === "part" ? item.quantity ?? 1 : 0), 0);
  const selectedAvatar = getAvatarOption(avatar);
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play";

  const openAccount = () => {
    router.push("/account");
  };

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open link", "Try again in a moment.");
    }
  };

  const handleRestorePurchases = async () => {
    const token = await getAuthToken();
    if (!token) {
      openAccountForSignIn();
      return;
    }

    const restored = await restoreNativePurchases();
    setProStatus(restored ? true : await getNativeProStatus());
    if (restored === null) {
      Alert.alert("Restore unavailable", "Use an EAS store build with RevenueCat enabled.");
      return;
    }

    Alert.alert(
      restored ? "BrickVal Pro restored" : "No purchase found",
      restored
        ? `Your ${storeName} purchase is active on this device.`
        : "We could not find an active BrickVal Pro purchase for this account."
    );
  };

  const handleClearCollection = async () => {
    Alert.alert("Clear local collection?", "This removes saved items from this phone only.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearCollection();
          setItems([]);
          warn();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Account vault</Text>
          <Text style={styles.body}>Manage your BrickVal account, Pro access, and the collection of sets, minifigures, and parts saved on this device.</Text>
        </View>

        <View style={styles.passportCard}>
          <View style={styles.studRail}>
            <View style={[styles.stud, { backgroundColor: colors.lego.red }]} />
            <View style={[styles.stud, { backgroundColor: colors.lego.yellow }]} />
            <View style={[styles.stud, { backgroundColor: colors.lego.blue }]} />
          </View>
          <View style={styles.passportTop}>
            <View style={styles.avatarBlock}>
              <AvatarImage source={selectedAvatar.source} size={62} />
              <View style={[styles.planBadge, proStatus && styles.planBadgePro]}>
                <Text style={[styles.planBadgeText, proStatus && styles.planBadgeTextPro]}>
                  {proStatus ? "Pro" : "Free plan"}
                </Text>
              </View>
            </View>
            <View style={styles.passportCopy}>
              <Text style={styles.passportLabel}>Collector profile</Text>
              <Text style={styles.passportTitle}>BrickVal account</Text>
              <Text style={styles.passportMeta}>
                {proStatus
                  ? "Pro unlocks unlimited scans and collection space."
                  : "Free plan access is active on this device."}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account"
            style={styles.primaryAction}
            onPress={openAccount}
          >
            <Text style={styles.primaryActionText}>Open account</Text>
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Device value</Text>
            <Text style={styles.summaryValue}>{usdFormatter.format(totalValue)}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryLabel}>Saved items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Access</Text>
          {proStatus ? (
            <View style={[styles.row, { borderColor: colors.semantic.success }]}>
              <View style={[styles.rowGlyph, { borderColor: colors.semantic.success, backgroundColor: colors.semantic.successSoft }]}>
                <Text style={[styles.rowGlyphText, { color: colors.semantic.success }]}>PRO</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.semantic.success }]}>BrickVal Pro active</Text>
                <Text style={styles.rowMeta}>Unlimited scans unlocked on this device</Text>
              </View>
              <Text style={[styles.rowArrow, { color: colors.semantic.success }]}>✓</Text>
            </View>
          ) : (
            <SettingsRow
              code="PRO"
              title="BrickVal Pro"
              meta={`Native ${storeName} upgrade flow`}
              accent={colors.semantic.success}
              onPress={() => void triggerUpgrade()}
            />
          )}
          <SettingsRow
            code="RST"
            title="Restore purchases"
            meta={`Re-check ${storeName} access for this account`}
            accent={colors.lego.blue}
            onPress={() => void handleRestorePurchases()}
          />

        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Legal</Text>
          <SettingsRow
            code="PRV"
            title="Privacy policy"
            meta="How BrickVal handles scans, account data, and purchases"
            accent={colors.lego.blue}
            onPress={() => void openExternalUrl(PRIVACY_URL)}
          />
          <SettingsRow
            code="TOS"
            title="Terms and subscription terms"
            meta="App terms, Apple purchase terms, and LEGO disclaimer"
            accent={colors.semantic.success}
            onPress={() => void openExternalUrl(TERMS_URL)}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>This device</Text>
          <View style={styles.localPanel}>
            <View style={styles.localMetric}>
              <Text style={styles.localValue}>{setCount}</Text>
              <Text style={styles.localLabel}>Sets</Text>
            </View>
            <View style={styles.localDivider} />
          <View style={styles.localMetric}>
            <Text style={styles.localValue}>{minifigureCount}</Text>
            <Text style={styles.localLabel}>Minifigs</Text>
          </View>
          <View style={styles.localDivider} />
          <View style={styles.localMetric}>
            <Text style={styles.localValue}>{partCount}</Text>
            <Text style={styles.localLabel}>Parts</Text>
          </View>
        </View>
          <SettingsRow
            code="CLR"
            title="Clear local collection"
            meta="Removes saved items from this phone only"
            accent={colors.semantic.danger}
            destructive
            onPress={handleClearCollection}
          />
        </View>
      </ScrollView>
      <PrePurchaseDisclosure
        visible={showDisclosure}
        onContinue={handleDisclosureContinue}
        onDismiss={handleDisclosureDismiss}
      />
    </View>
  );
}

function AvatarImage({ source, size }: { source: ImageSourcePropType; size: number }) {
  const { c } = useTheme();
  const s = getStyles(c);
  return (
    <View style={[s.avatarImageFrame, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Image source={source} style={s.avatarImage} resizeMode="cover" />
    </View>
  );
}

function SettingsRow({
  code,
  title,
  meta,
  accent,
  destructive,
  onPress,
}: {
  code: string;
  title: string;
  meta: string;
  accent: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const s = getStyles(c);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${meta}`} style={s.row} onPress={onPress}>
      <View style={[s.rowGlyph, { borderColor: accent }]}>
        <Text style={[s.rowGlyphText, { color: accent }]}>{code}</Text>
      </View>
      <View style={s.rowCopy}>
        <Text style={[s.rowTitle, destructive && s.rowTitleDanger]}>{title}</Text>
        <Text style={s.rowMeta}>{meta}</Text>
      </View>
      <Text style={s.rowArrow}>›</Text>
    </Pressable>
  );
}

function getStyles(c: ModeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.surface },
    content: { padding: 20, paddingTop: 58, paddingBottom: 112, gap: 22 },
    header: { gap: 8 },
    eyebrow: { color: colors.semantic.success, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: c.text, fontSize: 34, fontWeight: "900", letterSpacing: -1.2 },
    body: { color: c.textMuted, fontSize: 14, lineHeight: 21, fontWeight: "700" },
    passportCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElevated,
      padding: 18,
      gap: 18,
    },
    studRail: {
      position: "absolute",
      top: 14,
      right: 14,
      flexDirection: "row",
      gap: 8,
    },
    stud: {
      width: 18,
      height: 18,
      borderRadius: 9,
      opacity: 0.82,
    },
    passportTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingTop: 14,
    },
    avatarBlock: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor: c.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.semantic.success,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
    },
    planBadge: {
      position: "absolute",
      top: -8,
      right: -8,
      minHeight: 22,
      borderRadius: 999,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    planBadgePro: {
      borderColor: colors.semantic.success,
      backgroundColor: colors.semantic.success,
    },
    planBadgeText: { color: c.text, fontSize: 9, fontWeight: "900" },
    planBadgeTextPro: { color: c.textInverse },
    passportCopy: { flex: 1, gap: 4, minWidth: 0 },
    passportLabel: { color: c.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    passportTitle: { color: c.text, fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
    passportMeta: { color: c.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
    primaryAction: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.semantic.success,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryActionText: { color: c.textInverse, fontSize: 14, fontWeight: "900" },
    avatarImageFrame: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    avatarImage: { width: "100%", height: "100%" },
    summaryGrid: { flexDirection: "row", gap: 12 },
    summaryTile: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 14,
      gap: 7,
    },
    summaryLabel: { color: c.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    summaryValue: { color: c.text, fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
    group: { gap: 10 },
    groupTitle: { color: c.textMuted, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginLeft: 2 },
    row: {
      minHeight: 74,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowGlyph: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    rowGlyphText: { fontSize: 10, fontWeight: "900" },
    rowCopy: { flex: 1, minWidth: 0, gap: 4 },
    rowTitle: { color: c.text, fontSize: 15, fontWeight: "900" },
    rowTitleDanger: { color: colors.semantic.danger },
    rowMeta: { color: c.textMuted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    rowArrow: { color: c.textDisabled, fontSize: 28, fontWeight: "700" },
    localPanel: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    localMetric: { flex: 1, alignItems: "center", gap: 4 },
    localValue: { color: c.text, fontSize: 22, fontWeight: "900" },
    localLabel: { color: c.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    localDivider: { width: 1, height: 42, backgroundColor: c.border },
  });
}
