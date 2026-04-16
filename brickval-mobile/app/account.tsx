import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useAuth, useClerk, useSSO, useUser } from "@clerk/expo";
import { API_BASE } from "../lib/api";
import { isClerkConfigured } from "../lib/clerk";
import { getNativeProStatus, presentSuperwallUpgrade, restoreNativePurchases } from "../lib/paywall";

const ACCENT = "#62c79a";
const INK = "#f7f4ea";
const MUTED = "rgba(247,244,234,0.64)";
const SOFT = "rgba(247,244,234,0.38)";
const SURFACE = "#070908";
const PANEL = "#0b0e0d";
const LINE = "rgba(153,231,189,0.14)";
const DANGER = "#ff8f8f";

export default function AccountScreen() {
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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { startSSOFlow } = useSSO();
  const [authBusy, setAuthBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [proStatus, setProStatus] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      void refreshProStatus();
    }, [refreshProStatus])
  );

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setErrorMessage(null);

    try {
      const redirectUrl = Linking.createURL("/");
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await refreshProStatus();
      }
    } catch (error) {
      console.warn("Google sign-in failed", error);
      setErrorMessage("Google sign-in did not finish. Try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUpgrade = async () => {
    setErrorMessage(null);
    if (!isSignedIn) {
      setErrorMessage("Sign in first so BrickVal Pro can attach to your account.");
      return;
    }

    const shown = await presentSuperwallUpgrade();
    if (!shown) {
      setErrorMessage("Upgrade is unavailable in this build. Use an EAS Android build with native paywall enabled.");
      return;
    }

    await refreshProStatus();
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
          ? "Your Google Play purchase is active on this device."
          : "We could not find an active BrickVal Pro purchase for this account."
      );
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    const token = await getToken();
    if (!token) {
      setErrorMessage("Sign in first before deleting this account.");
      return;
    }

    Alert.alert(
      "Delete account?",
      "This deletes your BrickVal account and server-side Pro access. Local collection data on this phone stays until you clear it from Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setAccountBusy(true);
            setErrorMessage(null);
            try {
              const res = await fetch(`${API_BASE}/api/delete-account`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                setErrorMessage("We could not delete the account right now. Try again in a moment.");
                return;
              }
              await signOut();
              setProStatus(false);
              router.replace("/(tabs)/settings");
            } catch (error) {
              console.warn("Delete account failed", error);
              setErrorMessage("We could not delete the account right now. Try again in a moment.");
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ]
    );
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Native access</Text>
          <Text style={styles.body}>
            Google sign-in opens your browser, then returns to BrickVal. No web screens stay inside the app.
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

        {!isLoaded ? null : !isSignedIn ? (
          <View style={styles.section}>
            <ActionButton
              label={authBusy ? "Opening Google..." : "Continue with Google"}
              onPress={handleGoogleSignIn}
              disabled={authBusy}
            />
            <Text style={styles.helpText}>
              Guest mode covers the first 3 mobile lookups. Sign in after that to keep scanning and attach Pro access to your account.
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
            <ActionButton
              label="Upgrade to BrickVal Pro"
              onPress={handleUpgrade}
              disabled={accountBusy}
            />
            <ActionButton
              label={accountBusy ? "Signing out..." : "Sign out"}
              onPress={handleSignOut}
              disabled={accountBusy}
              tone="secondary"
            />
            <ActionButton
              label={accountBusy ? "Deleting..." : "Delete account"}
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
    </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      style={[
        styles.action,
        tone === "secondary" && styles.actionSecondary,
        tone === "danger" && styles.actionDanger,
        disabled && styles.actionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionText,
          tone === "secondary" && styles.actionTextSecondary,
          tone === "danger" && styles.actionTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },
  content: { padding: 20, paddingTop: 56, paddingBottom: 96, gap: 18 },
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
  header: { gap: 8 },
  eyebrow: { color: ACCENT, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: INK, fontSize: 34, fontWeight: "900" },
  body: { color: MUTED, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
    gap: 6,
  },
  cardLabel: { color: SOFT, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  cardTitle: { color: INK, fontSize: 24, fontWeight: "900" },
  cardMeta: { color: ACCENT, fontSize: 14, fontWeight: "800" },
  section: { gap: 10 },
  action: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  actionSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: LINE,
  },
  actionDanger: {
    backgroundColor: "rgba(255,143,143,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,143,143,0.4)",
  },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: "#07100c", fontSize: 14, fontWeight: "900" },
  actionTextSecondary: { color: INK },
  actionTextDanger: { color: DANGER },
  helpText: { color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  errorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,143,143,0.38)",
    backgroundColor: "rgba(35,18,12,0.9)",
    padding: 14,
    gap: 8,
  },
  errorTitle: { color: "#ffb4b4", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  errorBody: { color: INK, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
});
