import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { API_BASE, getAuthToken } from "../lib/api";
import { isClerkConfigured } from "../lib/clerk";
import { clearCollection } from "../lib/collection";
import { tap } from "../lib/haptics";
import { presentNativeAuth } from "../lib/native-auth";
import {
  getNativeProStatus,
  getPaywallDiagnosticMessage,
  presentSuperwallUpgradeWithResult,
  restoreNativePurchases,
} from "../lib/paywall";
import { PrePurchaseDisclosure } from "../components/PrePurchaseDisclosure";
import { useTheme, type ModeColors } from "../lib/ThemeProvider";
import { colors } from "../lib/theme";

const AVATAR_KEY = "brickval_account_avatar";

type AvatarKey = "classic" | "ghost" | "wolf" | "knight";

const AVATARS: { key: AvatarKey; label: string; meta: string; source: ImageSourcePropType }[] = [
  { key: "classic", label: "Classic", meta: "Blue cap", source: require("../assets/account-icons/classic.webp") },
  { key: "ghost", label: "Ghost", meta: "Glow shell", source: require("../assets/account-icons/ghost.webp") },
  { key: "wolf", label: "Wolf", meta: "Wolfpack", source: require("../assets/account-icons/wolf.webp") },
  { key: "knight", label: "Knight", meta: "Castle helm", source: require("../assets/account-icons/knight.webp") },
];

function isAvatarKey(value: string | null): value is AvatarKey {
  return AVATARS.some((option) => option.key === value);
}

export default function AccountScreen() {
  const { colors, accent } = useTheme();
  const c = colors.dark;
  const styles = useMemo(() => getStyles(c, accent.primary, accent.softDark, accent.contrast), [accent, c]);

  if (!isClerkConfigured) {
    return (
      <View style={styles.root}>
        <View style={styles.emptyState}>
          <Text style={styles.title}>Account unavailable</Text>
          <Text style={styles.body}>
            Add `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the mobile app environment before using native sign-in.
          </Text>
        </View>
      </View>
    );
  }

  return <ConfiguredAccountScreen />;
}

function ConfiguredAccountScreen() {
  const { colors, accent, accentPreference, setAccentPreference } = useTheme();
  const c = colors.dark;
  const styles = useMemo(() => getStyles(c, accent.primary, accent.softDark, accent.contrast), [accent, c]);
  const { upgrade } = useLocalSearchParams<{ upgrade?: string }>();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { user } = useUser();
  const { signOut } = useClerk();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [accountBusy, setAccountBusy] = useState(false);
  const [proStatus, setProStatus] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [didAutoOpenUpgrade, setDidAutoOpenUpgrade] = useState(false);
  const [avatar, setAvatar] = useState<AvatarKey>("classic");
  const [showDisclosure, setShowDisclosure] = useState(false);

  const accountLabel = useMemo(() => {
    if (!user) return "Guest";
    return user.primaryEmailAddress?.emailAddress ?? user.fullName ?? user.id;
  }, [user]);

  const refreshProStatus = useCallback(async () => {
    const nextStatus = await getNativeProStatus();
    setProStatus(nextStatus);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      SecureStore.getItemAsync(AVATAR_KEY).then((savedAvatar) => {
        if (active && isAvatarKey(savedAvatar)) {
          setAvatar(savedAvatar);
        }
      });

      if (isSignedIn) {
        void refreshProStatus();
      } else {
        setProStatus(false);
      }

      return () => {
        active = false;
      };
    }, [isSignedIn, refreshProStatus])
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProStatus(false);
      return;
    }

    void refreshProStatus();
  }, [isLoaded, isSignedIn, refreshProStatus]);

  const handleUpgrade = async () => {
    setErrorMessage(null);
    if (!isSignedIn) {
      setErrorMessage("Sign in first so BrickVal Pro can attach to your account.");
      return;
    }
    if (proStatus) return;

    setShowDisclosure(true);
  };

  const handleDisclosureContinue = async () => {
    setShowDisclosure(false);
    setErrorMessage(null);

    const result = await presentSuperwallUpgradeWithResult();
    if (result.status !== "presented") {
      setErrorMessage(getPaywallDiagnosticMessage(result));
      return;
    }

    await refreshProStatus();
  };

  const handleDisclosureDismiss = () => {
    setShowDisclosure(false);
  };

  useEffect(() => {
    if (upgrade !== "1" || didAutoOpenUpgrade || !isLoaded || !isSignedIn) return;
    setDidAutoOpenUpgrade(true);
    void handleUpgrade();
  }, [didAutoOpenUpgrade, isLoaded, isSignedIn, upgrade]);

  const handleAppleSignIn = async () => {
    setAccountBusy(true);
    setErrorMessage(null);

    try {
      if (!isLoaded) {
        setErrorMessage("Account is still loading. Try again in a moment.");
        return;
      }

      const { createdSessionId, setActive } = await startAppleAuthenticationFlow();
      if (!createdSessionId || !setActive) {
        setErrorMessage("Apple sign-in did not return a session. Check Clerk Apple Sign In for com.brickval.app, or use email sign-in for now.");
        return;
      }

      await setActive({ session: createdSessionId });
      await refreshProStatus();
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      console.warn("Apple sign-in failed", error);
      setErrorMessage("Apple sign-in could not finish. Make sure Apple is enabled in Clerk, or use email sign-in for now.");
    } finally {
      setAccountBusy(false);
    }
  };

  const handleNativeSignIn = async () => {
    setAccountBusy(true);
    setErrorMessage(null);

    try {
      if (!isLoaded) {
        setErrorMessage("Account is still loading. Try again in a moment.");
        return;
      }

      const result = await presentNativeAuth();
      if (result === "unavailable") {
        setErrorMessage("Native sign-in is unavailable in this build. Use an EAS store build.");
        return;
      }
      if (result === "signed-in") {
        await refreshProStatus();
      }
    } catch (error) {
      console.warn("Native sign-in failed", error);
      setErrorMessage("We could not open sign-in right now. Try again in a moment.");
    } finally {
      setAccountBusy(false);
    }
  };

  const handleRestorePurchases = async () => {
    setAccountBusy(true);
    setErrorMessage(null);

    try {
      if (!isSignedIn) {
        setErrorMessage("Sign in first so restored access maps to your BrickVal account.");
        return;
      }

      const restored = await restoreNativePurchases();
      await refreshProStatus();

      if (restored === null) {
        setErrorMessage("Restore is unavailable in this build.");
        return;
      }

      Alert.alert(
        restored ? "BrickVal Pro restored" : "No purchase found",
        restored
          ? "Your store purchase is active on this device."
          : "We could not find an active BrickVal Pro purchase for this account."
      );
    } finally {
      setAccountBusy(false);
    }
  };

  const handleSignOut = async () => {
    setAccountBusy(true);
    setErrorMessage(null);
    try {
      await signOut();
      setProStatus(false);
    } catch (error) {
      console.warn("Sign out failed", error);
      setErrorMessage("We could not sign you out right now. Try again.");
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setErrorMessage(null);
    if (!isSignedIn) {
      setErrorMessage("Sign in first so we know which account to delete.");
      return;
    }

    Alert.alert(
      "Delete BrickVal account?",
      "This permanently deletes your BrickVal account data. Active App Store subscriptions must still be cancelled in your Apple ID settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setAccountBusy(true);
            try {
              const token = await getAuthToken();
              if (!token) {
                setErrorMessage("Your sign-in session expired. Sign in again before deleting your account.");
                return;
              }

              const response = await fetch(`${API_BASE}/api/delete-account`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? `Delete failed with HTTP ${response.status}`);
              }

              await clearCollection();
              await signOut();
              setProStatus(false);
              setErrorMessage(null);
            } catch (error) {
              console.warn("Delete account failed", error);
              setErrorMessage(error instanceof Error ? error.message : "We could not delete your account right now. Try again.");
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleAvatarSelect = async (nextAvatar: AvatarKey) => {
    setAvatar(nextAvatar);
    tap();
    await SecureStore.setItemAsync(AVATAR_KEY, nextAvatar);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Pressable accessibilityRole="button" style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Native access</Text>
          <Text style={styles.body}>
            Sign in natively inside BrickVal, then manage your account and Pro access below.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={styles.cardTitle}>
            {!isLoaded ? "Checking session..." : isSignedIn ? accountLabel : "Signed out"}
          </Text>
          <Text style={styles.cardMeta}>
            {proStatus === null
              ? "BrickVal Pro status unavailable"
              : proStatus
                ? "BrickVal Pro active"
                : "Free access"}
          </Text>
        </View>

        <View style={styles.avatarPanel}>
          <View style={styles.avatarHeader}>
            <View>
              <Text style={styles.cardLabel}>Profile head</Text>
              <Text style={styles.avatarTitle}>Choose your collector look</Text>
            </View>
            <AvatarImage source={AVATARS.find((option) => option.key === avatar)?.source ?? AVATARS[0].source} size={44} />
          </View>
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
                <AvatarImage source={option.source} size={36} />
                <Text style={[styles.avatarOptionText, avatar === option.key && styles.avatarOptionTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.appearancePanel}>
          <View>
            <Text style={styles.cardLabel}>App accent</Text>
            <Text style={styles.avatarTitle}>Choose your highlight color</Text>
          </View>
          <View style={styles.accentOptions}>
            {(["yellow", "blue"] as const).map((option) => {
              const selected = accentPreference === option;
              const swatch = option === "yellow" ? "#F2CD37" : "#42DAD1";
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    tap();
                    setAccentPreference(option);
                  }}
                  style={[styles.accentOption, selected && styles.accentOptionActive]}
                >
                  <View style={[styles.accentSwatch, { backgroundColor: swatch }]} />
                  <Text style={[styles.accentOptionText, selected && styles.accentOptionTextActive]}>
                    {option === "yellow" ? "Brick yellow" : "Market blue"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {!isLoaded ? null : !isSignedIn ? (
          <View style={styles.section}>
            <ActionButton
              label={accountBusy ? "Opening sign-in..." : "Sign in with email"}
              onPress={handleNativeSignIn}
              disabled={accountBusy}
            />
            {Platform.OS === "ios" ? (
              <ActionButton
                label={accountBusy ? "Opening sign-in..." : "Continue with Apple"}
                onPress={handleAppleSignIn}
                disabled={accountBusy}
                tone="secondary"
              />
            ) : null}
            <Text style={styles.helpText}>
              Free plan includes 5 scans. Sign in to keep scanning and attach Pro access to your account.
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <ActionButton
              label={accountBusy ? "Restoring..." : "Restore purchases"}
              onPress={handleRestorePurchases}
              disabled={accountBusy}
              tone="secondary"
            />
            {proStatus ? null : (
              <ActionButton
                label="Upgrade to BrickVal Pro"
                onPress={handleUpgrade}
                disabled={accountBusy}
              />
            )}
            <ActionButton
              label={accountBusy ? "Signing out..." : "Sign out"}
              onPress={handleSignOut}
              disabled={accountBusy}
              tone="secondary"
            />
            <ActionButton
              label={accountBusy ? "Working..." : "Delete account"}
              onPress={handleDeleteAccount}
              disabled={accountBusy}
              tone="danger"
            />
          </View>
        )}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Account issue</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
      <PrePurchaseDisclosure
        visible={showDisclosure}
        onContinue={handleDisclosureContinue}
        onDismiss={handleDisclosureDismiss}
      />
    </KeyboardAvoidingView>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger";
}) {
  const { colors, accent } = useTheme();
  const c = colors.dark;
  const s = getStyles(c, accent.primary, accent.softDark, accent.contrast);
  return (
    <Pressable
      accessibilityRole="button"
      style={[
        s.action,
        tone === "secondary" && s.actionSecondary,
        tone === "danger" && s.actionDanger,
        disabled && s.actionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          s.actionText,
          tone === "secondary" && s.actionTextSecondary,
          tone === "danger" && s.actionTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AvatarImage({ source, size }: { source: ImageSourcePropType; size: number }) {
  const { colors, accent } = useTheme();
  const c = colors.dark;
  const s = getStyles(c, accent.primary, accent.softDark, accent.contrast);
  return (
    <View style={[s.avatarImageFrame, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Image source={source} style={s.avatarImage} resizeMode="cover" />
    </View>
  );
}

function getStyles(c: ModeColors, accent: string, accentSoft: string, accentContrast: string) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, paddingTop: 56, paddingBottom: 96, gap: 18 },
    backBtn: {
      alignSelf: "flex-start",
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    backText: { color: c.text, fontSize: 12, fontWeight: "900" },
    header: { gap: 8 },
    eyebrow: { color: accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    title: { color: c.text, fontSize: 34, fontWeight: "900" },
    body: { color: c.textMuted, fontSize: 14, lineHeight: 21, fontWeight: "700" },
    card: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElevated,
      padding: 16,
      gap: 6,
    },
    cardLabel: { color: c.textDisabled, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
    cardTitle: { color: c.text, fontSize: 24, fontWeight: "900" },
    cardMeta: { color: accent, fontSize: 14, fontWeight: "800" },
    avatarPanel: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElevated,
      padding: 14,
      gap: 12,
    },
    appearancePanel: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.backgroundElevated,
      padding: 14,
      gap: 12,
    },
    accentOptions: { flexDirection: "row", gap: 10 },
    accentOption: {
      flex: 1,
      minHeight: 58,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
    },
    accentOptionActive: { borderColor: accent, backgroundColor: accentSoft },
    accentSwatch: { width: 18, height: 18, borderRadius: 9 },
    accentOptionText: { color: c.textMuted, fontSize: 12, fontWeight: "800" },
    accentOptionTextActive: { color: c.text },
    avatarHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    avatarTitle: { color: c.text, fontSize: 15, fontWeight: "900", marginTop: 4 },
    avatarOptions: { flexDirection: "row", gap: 8 },
    avatarOption: {
      flex: 1,
      minHeight: 74,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    avatarOptionActive: {
      borderColor: accent,
      backgroundColor: accentSoft,
    },
    avatarOptionText: { color: c.textDisabled, fontSize: 9, fontWeight: "900" },
    avatarOptionTextActive: { color: c.text },
    avatarImageFrame: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    avatarImage: { width: "100%", height: "100%" },
    section: { gap: 10 },
    action: {
      minHeight: 48,
      borderRadius: 8,
      backgroundColor: accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    actionSecondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: c.border,
    },
    actionDanger: {
      backgroundColor: c.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.semantic.danger,
    },
    actionDisabled: { opacity: 0.6 },
    actionText: { color: accentContrast, fontSize: 14, fontWeight: "900" },
    actionTextSecondary: { color: c.text },
    actionTextDanger: { color: colors.semantic.danger },
    helpText: { color: c.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
    errorCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.semantic.danger,
      backgroundColor: c.surface,
      padding: 14,
      gap: 8,
    },
    errorTitle: { color: colors.semantic.danger, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
    errorBody: { color: c.text, fontSize: 13, fontWeight: "700", lineHeight: 19 },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
  });
}
