import { router, useFocusEffect } from "expo-router";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Alert, Image, Linking, Platform, View, Text, StyleSheet, Pressable, ScrollView, Switch, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { BadgeCheck, ChevronRight, Crown, RotateCcw, ScrollText, ShieldCheck, Trash2, Wrench } from "lucide-react-native";
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
import {
  getSmartAutoScanPreference,
  getScanImprovementConsent,
  setScanImprovementConsent,
  setSmartAutoScanPreference,
  type ThemePreference,
} from "../../lib/preferences";

const AVATAR_KEY = "brickval_account_avatar";
const PRIVACY_URL = "https://brickvalue.live/privacy";
const TERMS_URL = "https://brickvalue.live/terms";
const DETECTOR_ATTRIBUTION_URL = "https://universe.roboflow.com/object-detection-3oawx/lego-364li";

type AvatarKey = "classic" | "ghost" | "wolf" | "knight";
type FallbackIcon = typeof Crown;

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
  const [smartAutoScanEnabled, setSmartAutoScanEnabled] = useState(true);
  const [scanImprovementConsent, setScanImprovementConsentState] = useState(false);
  const { triggerUpgrade, openAccountForSignIn, showDisclosure, handleDisclosureContinue, handleDisclosureDismiss } = useUpgrade();
  const { colors: palette, c, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(c, insets.top, insets.bottom), [c, insets.top, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCollection() {
        const [collection, savedAvatar, nextProStatus, smartAutoScan, improvementConsent] = await Promise.all([
          getCollection(),
          SecureStore.getItemAsync(AVATAR_KEY),
          getNativeProStatus(),
          getSmartAutoScanPreference(),
          getScanImprovementConsent(),
        ]);
        if (!active) return;
        setItems(collection);
        setProStatus(nextProStatus);
        setSmartAutoScanEnabled(smartAutoScan);
        setScanImprovementConsentState(improvementConsent);
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

  const updateSmartAutoScan = (enabled: boolean) => {
    setSmartAutoScanEnabled(enabled);
    void setSmartAutoScanPreference(enabled);
  };

  const updateThemePreference = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
  };

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

        <GlassSurface style={styles.passportCard} tintColor="rgba(31, 32, 38, 0.84)">
          <View style={styles.studRail}>
            <View style={[styles.stud, { backgroundColor: palette.lego.yellow }]} />
            <View style={[styles.stud, { backgroundColor: palette.lego.yellow }]} />
            <View style={[styles.stud, { backgroundColor: c.borderStrong }]} />
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
        </GlassSurface>

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
            <View style={[styles.row, { borderColor: palette.lego.yellowBorder }]}>
              <View style={[styles.rowGlyph, { borderColor: palette.lego.yellow, backgroundColor: palette.lego.yellowSoft }]}>
                <Text style={[styles.rowGlyphText, { color: palette.light.text }]}>PRO</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>BrickVal Pro active</Text>
                <Text style={styles.rowMeta}>Unlimited scans unlocked on this device</Text>
              </View>
              <SettingsIcon symbol="checkmark.seal.fill" fallbackIcon={BadgeCheck} color={palette.lego.yellowPressed} />
            </View>
          ) : (
            <SettingsRow
              symbol="crown.fill"
              fallbackIcon={Crown}
              title="BrickVal Pro"
              meta={`Native ${storeName} upgrade flow`}
              accent={palette.lego.yellow}
              onPress={() => void triggerUpgrade()}
            />
          )}
          <SettingsRow
            symbol="arrow.clockwise.circle.fill"
            fallbackIcon={RotateCcw}
            title="Restore purchases"
            meta={`Re-check ${storeName} access for this account`}
            accent={c.textMuted}
            onPress={() => void handleRestorePurchases()}
          />

        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Design</Text>
          <SettingsRow
            symbol="wrench.and.screwdriver.fill"
            fallbackIcon={Wrench}
            title="Redesign playground"
            meta="Preview component directions before changing the live app"
            accent={palette.lego.yellow}
            onPress={() => router.push("/playground")}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Scan and appearance</Text>
          <SettingsSwitchRow
            title="Smart auto-scan"
            meta="Capture automatically when the camera is steady"
            value={smartAutoScanEnabled}
            onValueChange={updateSmartAutoScan}
          />
          <SettingsSwitchRow
            title="Help improve scanning"
            meta="Share anonymous cropped scan photos; location data is removed"
            value={scanImprovementConsent}
            onValueChange={(enabled) => {
              setScanImprovementConsentState(enabled);
              void setScanImprovementConsent(enabled);
            }}
          />
          <View style={styles.themePanel}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>App theme</Text>
              <Text style={styles.rowMeta}>Dark remains the default premium BrickVal look</Text>
            </View>
            <View style={styles.themeOptions}>
              {(["system", "dark", "light"] as ThemePreference[]).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preference === option }}
                  style={[styles.themeOption, preference === option && styles.themeOptionActive]}
                  onPress={() => updateThemePreference(option)}
                >
                  <Text style={[styles.themeOptionText, preference === option && styles.themeOptionTextActive]}>
                    {option === "system" ? "System" : option === "dark" ? "Dark" : "Light"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Legal</Text>
          <SettingsRow
            symbol="lock.shield.fill"
            fallbackIcon={ShieldCheck}
            title="Privacy policy"
            meta="How BrickVal handles scans, account data, and purchases"
            accent={c.textMuted}
            onPress={() => void openExternalUrl(PRIVACY_URL)}
          />
          <SettingsRow
            symbol="doc.text.fill"
            fallbackIcon={ScrollText}
            title="Terms and subscription terms"
            meta="App terms, Apple purchase terms, and LEGO disclaimer"
            accent={palette.lego.yellow}
            onPress={() => void openExternalUrl(TERMS_URL)}
          />
          <SettingsRow
            symbol="camera.metering.matrix"
            fallbackIcon={ScrollText}
            title="Scanner model attribution"
            meta="Lego Minifigures by VC · CC BY 4.0"
            accent={c.textMuted}
            onPress={() => void openExternalUrl(DETECTOR_ATTRIBUTION_URL)}
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
            symbol="trash.fill"
            fallbackIcon={Trash2}
            title="Clear local collection"
            meta="Removes saved items from this phone only"
            accent={palette.semantic.danger}
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

function GlassSurface({
  children,
  style,
  tintColor,
}: {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  tintColor: string;
}) {
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" tintColor={tintColor} style={style}>
        {children}
      </GlassView>
    );
  }

  return <View style={style}>{children}</View>;
}

function SettingsIcon({
  symbol,
  fallbackIcon: Fallback,
  color,
}: {
  symbol: SFSymbol;
  fallbackIcon: FallbackIcon;
  color: string;
}) {
  return (
    <SymbolView
      name={symbol}
      size={20}
      type="hierarchical"
      tintColor={color}
      fallback={<Fallback size={20} color={color} strokeWidth={2.2} />}
    />
  );
}

function SettingsRow({
  symbol,
  fallbackIcon,
  title,
  meta,
  accent,
  destructive,
  onPress,
}: {
  symbol: SFSymbol;
  fallbackIcon: FallbackIcon;
  title: string;
  meta: string;
  accent: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const s = getStyles(c);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      onPress={onPress}
    >
      <View style={[s.rowGlyph, { borderColor: accent }]}>
        <SettingsIcon symbol={symbol} fallbackIcon={fallbackIcon} color={accent} />
      </View>
      <View style={s.rowCopy}>
        <Text style={[s.rowTitle, destructive && s.rowTitleDanger]}>{title}</Text>
        <Text style={s.rowMeta}>{meta}</Text>
      </View>
      <ChevronRight size={19} color={c.textDisabled} strokeWidth={2.5} />
    </Pressable>
  );
}

function SettingsSwitchRow({
  title,
  meta,
  value,
  onValueChange,
}: {
  title: string;
  meta: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { c } = useTheme();
  const s = getStyles(c);
  return (
    <View style={s.row}>
      <View style={s.rowCopy}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowMeta}>{meta}</Text>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.backgroundMuted, true: colors.lego.yellow }}
        thumbColor={value ? colors.light.text : c.textMuted}
        ios_backgroundColor={c.backgroundMuted}
      />
    </View>
  );
}

function getStyles(c: ModeColors, safeTop = 0, safeBottom = 0) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: {
      padding: 20,
      paddingTop: Math.max(58, safeTop + 18),
      paddingBottom: Math.max(112, safeBottom + 96),
      gap: 22,
    },
    header: { gap: 8 },
    eyebrow: { color: colors.lego.yellowPressed, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
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
      borderColor: colors.lego.yellow,
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
      borderColor: colors.lego.yellow,
      backgroundColor: colors.lego.yellow,
    },
    planBadgeText: { color: c.text, fontSize: 9, fontWeight: "900" },
    planBadgeTextPro: { color: colors.light.text },
    passportCopy: { flex: 1, gap: 4, minWidth: 0 },
    passportLabel: { color: c.textDisabled, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    passportTitle: { color: c.text, fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
    passportMeta: { color: c.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
    primaryAction: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.lego.yellow,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryActionText: { color: colors.light.text, fontSize: 14, fontWeight: "900" },
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
    rowPressed: {
      opacity: 0.78,
      backgroundColor: c.backgroundMuted,
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
    themePanel: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: 14,
      gap: 14,
    },
    themeOptions: {
      flexDirection: "row",
      gap: 8,
      borderRadius: 999,
      backgroundColor: c.backgroundMuted,
      padding: 4,
    },
    themeOption: {
      flex: 1,
      minHeight: 36,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    themeOptionActive: {
      backgroundColor: colors.lego.yellow,
    },
    themeOptionText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "900",
    },
    themeOptionTextActive: {
      color: colors.light.text,
    },
  });
}
