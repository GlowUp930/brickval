import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, View, Text, StyleSheet, Pressable, ScrollView, type ImageSourcePropType } from "react-native";
import * as SecureStore from "expo-secure-store";
import { clearCollection, getCollection, getCollectionValue, type CollectionItem } from "../../lib/collection";
import { getAuthToken } from "../../lib/api";
import { tap, warn } from "../../lib/haptics";
import { presentSuperwallUpgrade, restoreNativePurchases } from "../../lib/paywall";

const ACCENT = "#62c79a";
const LEGO_RED = "#df463f";
const LEGO_BLUE = "#4b8fff";
const LEGO_YELLOW = "#f2c94c";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#121715";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const DANGER = "#ff8f8f";
const AVATAR_KEY = "brickval_account_avatar";

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadCollection() {
        const [collection, savedAvatar] = await Promise.all([
          getCollection(),
          SecureStore.getItemAsync(AVATAR_KEY),
        ]);
        if (!active) return;
        setItems(collection);
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
  const selectedAvatar = getAvatarOption(avatar);

  const openAccount = () => {
    router.push("/account");
  };

  const openUpgrade = async () => {
    const token = await getAuthToken();
    if (!token) {
      openAccount();
      return;
    }

    const shown = await presentSuperwallUpgrade();
    if (!shown) {
      Alert.alert("Upgrade unavailable", "Use an EAS Android build with the native paywall enabled.");
    }
  };

  const handleRestorePurchases = async () => {
    const token = await getAuthToken();
    if (!token) {
      openAccount();
      return;
    }

    const restored = await restoreNativePurchases();
    if (restored === null) {
      Alert.alert("Restore unavailable", "Use an EAS Android build with RevenueCat enabled.");
      return;
    }

    Alert.alert(
      restored ? "BrickVal Pro restored" : "No purchase found",
      restored
        ? "Your Google Play purchase is active on this device."
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
  const handleAvatarSelect = async (nextAvatar: AvatarKey) => {
    setAvatar(nextAvatar);
    tap();
    await SecureStore.setItemAsync(AVATAR_KEY, nextAvatar);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Account vault</Text>
          <Text style={styles.body}>Manage your BrickVal account, Pro access, and the collection saved on this device.</Text>
        </View>

        <View style={styles.passportCard}>
          <View style={styles.studRail}>
            <View style={[styles.stud, { backgroundColor: LEGO_RED }]} />
            <View style={[styles.stud, { backgroundColor: LEGO_YELLOW }]} />
            <View style={[styles.stud, { backgroundColor: LEGO_BLUE }]} />
          </View>
          <View style={styles.passportTop}>
            <View style={styles.avatarBlock}>
              <AvatarImage source={selectedAvatar.source} size={62} />
            </View>
            <View style={styles.passportCopy}>
              <Text style={styles.passportLabel}>Collector profile</Text>
              <Text style={styles.passportTitle}>BrickVal account</Text>
              <Text style={styles.passportMeta}>Native Google sign-in, Pro access, and account actions now stay inside the app.</Text>
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
          <View style={styles.avatarPicker}>
            <Text style={styles.avatarPickerLabel}>Choose profile head</Text>
            <View style={styles.avatarOptions}>
              {AVATARS.map((option) => (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: avatar === option.key }}
                  accessibilityLabel={`${option.label} avatar. ${option.meta}`}
                  style={[styles.avatarOption, avatar === option.key && styles.avatarOptionActive]}
                  onPress={() => handleAvatarSelect(option.key)}
                >
                  <AvatarImage source={option.source} size={38} />
                  <Text style={[styles.avatarOptionText, avatar === option.key && styles.avatarOptionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
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
          <SettingsRow
            code="PRO"
            title="BrickVal Pro"
            meta="Native Android upgrade flow"
            accent={ACCENT}
            onPress={() => void openUpgrade()}
          />
          <SettingsRow
            code="RST"
            title="Restore purchases"
            meta="Re-check Google Play access for this account"
            accent={LEGO_BLUE}
            onPress={() => void handleRestorePurchases()}
          />
          <SettingsRow
            code="ACT"
            title="Native account"
            meta="Google sign-in, sign out, and delete account"
            accent={LEGO_YELLOW}
            onPress={openAccount}
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
          </View>
          <SettingsRow
            code="CLR"
            title="Clear local collection"
            meta="Removes saved items from this phone only"
            accent={DANGER}
            destructive
            onPress={handleClearCollection}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function AvatarImage({ source, size }: { source: ImageSourcePropType; size: number }) {
  return (
    <View style={[styles.avatarImageFrame, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Image source={source} style={styles.avatarImage} resizeMode="cover" />
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
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${meta}`} style={styles.row} onPress={onPress}>
      <View style={[styles.rowGlyph, { borderColor: accent }]}>
        <Text style={[styles.rowGlyphText, { color: accent }]}>{code}</Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDanger]}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={styles.rowArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070908" },
  content: { padding: 20, paddingTop: 58, paddingBottom: 112, gap: 22 },
  header: { gap: 8 },
  eyebrow: { color: ACCENT, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: INK, fontSize: 34, fontWeight: "900", letterSpacing: -1.2 },
  body: { color: MUTED, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  passportCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
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
    backgroundColor: "rgba(98,199,154,0.14)",
    borderWidth: 1,
    borderColor: "rgba(98,199,154,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  passportCopy: { flex: 1, gap: 4, minWidth: 0 },
  passportLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  passportTitle: { color: INK, fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
  passportMeta: { color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  primaryAction: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: { color: "#07100c", fontSize: 14, fontWeight: "900" },
  avatarPicker: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 14,
    gap: 10,
  },
  avatarPickerLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  avatarOptions: { flexDirection: "row", gap: 8 },
  avatarOption: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.09)",
    backgroundColor: "rgba(247,244,234,0.035)",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  avatarOptionActive: {
    borderColor: "rgba(98,199,154,0.72)",
    backgroundColor: "rgba(98,199,154,0.1)",
  },
  avatarOptionText: { color: SOFT, fontSize: 9, fontWeight: "900" },
  avatarOptionTextActive: { color: INK },
  avatarImageFrame: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(247,244,234,0.05)",
  },
  avatarImage: { width: "100%", height: "100%" },
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
    padding: 14,
    gap: 7,
  },
  summaryLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  summaryValue: { color: INK, fontSize: 19, fontWeight: "900", letterSpacing: -0.5 },
  group: { gap: 10 },
  groupTitle: { color: MUTED, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginLeft: 2 },
  row: {
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: SURFACE,
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
    backgroundColor: "rgba(247,244,234,0.035)",
  },
  rowGlyphText: { fontSize: 10, fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0, gap: 4 },
  rowTitle: { color: INK, fontSize: 15, fontWeight: "900" },
  rowTitleDanger: { color: DANGER },
  rowMeta: { color: MUTED, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  rowArrow: { color: SOFT, fontSize: 28, fontWeight: "700" },
  localPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(18,23,21,0.76)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  localMetric: { flex: 1, alignItems: "center", gap: 4 },
  localValue: { color: INK, fontSize: 22, fontWeight: "900" },
  localLabel: { color: SOFT, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  localDivider: { width: 1, height: 42, backgroundColor: LINE },
});
