import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, StyleSheet, Pressable, Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { CameraScanner } from "../../components/CameraScanner";
import { ResultCard } from "../../components/ResultCard";
import { LegoLoaderNative } from "../../components/LegoLoaderNative";
import { ManualEntrySheet, type ManualEntryHandle } from "../../components/ManualEntrySheet";
import {
  clearAuthToken,
  getAuthToken,
  identifySet,
  lookupSet,
  type IdentificationCandidate,
  type IdentificationResult,
  type LookupResult,
  type ScanMode,
} from "../../lib/api";
import { addToCollection, type CollectionCondition } from "../../lib/collection";
import { success, warn } from "../../lib/haptics";
import { presentSuperwallUpgrade } from "../../lib/paywall";

/**
 * Native scan screen — fullscreen camera, manual capture, result sheet over
 * the dimmed camera background, and hosted WebView details when needed.
 */

type Status = "idle" | "loading" | "result" | "candidates";
const GUEST_SCAN_LIMIT = 3;
const GUEST_SCAN_KEY = "guest_scan_lookups_used";
const LOW_CONFIDENCE_THRESHOLD = 0.8;

const previewResult: LookupResult = {
  set_number: "75192",
  item_type: "set",
  name: "Millennium Falcon",
  theme: "Star Wars Ultimate Collector Series",
  pieces: 7541,
  image_url: "https://img.bricklink.com/ItemImage/SN/0/75192-1.png",
  market_history: [
    { date: "2025-11-08", price_usd: 760, source: "bricklink" },
    { date: "2026-01-14", price_usd: 790, source: "bricklink" },
    { date: "2026-03-22", price_usd: 812, source: "bricklink" },
  ],
  pricing: {
    hero_new_avg_usd: 812,
    rrp_usd: 849,
    gain_pct: -4,
    bricklink_new_qty: 18,
    data_source: "sold",
  },
};

const previewMinifigResult: LookupResult = {
  set_number: "sw0001",
  item_type: "minifig",
  name: "Battle Droid Tan with Back Plate",
  theme: "Minifigure · 1999",
  pieces: null,
  image_url: "https://img.bricklink.com/ItemImage/MN/0/sw0001.png",
  market_history: [
    { date: "2025-11-08", price_usd: 4, source: "bricklink" },
    { date: "2026-01-14", price_usd: 5, source: "bricklink" },
    { date: "2026-03-22", price_usd: 5, source: "bricklink" },
  ],
  pricing: {
    hero_new_avg_usd: 5,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: 42,
    data_source: "sold",
  },
};

export default function ScanHome() {
  const [mode, setMode] = useState<ScanMode>("set");
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMsg, setLoadingMsg] = useState("Reading set number...");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [addedSetNumber, setAddedSetNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<IdentificationCandidate[]>([]);
  const [candidateMessage, setCandidateMessage] = useState<string>("We found a few possible matches.");
  const errorProgress = useRef(new Animated.Value(0)).current;
  const candidateProgress = useRef(new Animated.Value(0)).current;
  const manualRef = useRef<ManualEntryHandle>(null);

  useEffect(() => {
    if (!errorMessage) return;
    errorProgress.setValue(0);
    Animated.timing(errorProgress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [errorMessage, errorProgress]);

  useEffect(() => {
    if (status !== "candidates") {
      candidateProgress.setValue(0);
      return;
    }

    candidateProgress.setValue(0);
    Animated.timing(candidateProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [candidateProgress, status]);

  const openWebView = (path: string) => {
    router.push({ pathname: "/webview-modal", params: { path } });
  };

  const openUpgrade = () => {
    void presentSuperwallUpgrade(() => openWebView("/upgrade"));
  };

  const getGuestScansUsed = async () => {
    const raw = await SecureStore.getItemAsync(GUEST_SCAN_KEY);
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const prepareLookupAccess = async () => {
    const token = await getAuthToken();
    if (token) {
      return { allowed: true, hasToken: true };
    }

    const guestScansUsed = await getGuestScansUsed();
    if (guestScansUsed >= GUEST_SCAN_LIMIT) {
      return { allowed: false, hasToken: false };
    }

    await SecureStore.setItemAsync(GUEST_SCAN_KEY, String(guestScansUsed + 1));
    return { allowed: true, hasToken: false };
  };

  const openAccountForSignIn = () => {
    openWebView("/account");
  };

  const beginLookup = async (identifier: string) => {
    setLoadingMsg("Fetching market prices...");
    const data = await lookupSet(identifier, mode);
    setResult(data);
    setAddedSetNumber(null);
    setStatus("result");
  };

  const maybeShowCandidates = (identification: IdentificationResult) => {
    const topScore = identification.confidence ?? identification.candidates[0]?.score ?? null;
    const shouldPauseForChoice =
      identification.candidates.length > 0 &&
      (topScore === null || topScore < LOW_CONFIDENCE_THRESHOLD);

    if (!shouldPauseForChoice) {
      return false;
    }

    setCandidateOptions(identification.candidates.slice(0, 4));
    setCandidateMessage(
      mode === "minifig"
        ? "We found a few possible minifigures. Pick the closest match."
        : "We found a few possible set numbers. Pick the closest match."
    );
    setStatus("candidates");
    return true;
  };

  const openHostedDetails = async (identifier: string) => {
    const token = await getAuthToken();
    if (!token) {
      openAccountForSignIn();
      return;
    }

    openWebView(
      result?.item_type === "minifig" ? `/result/minifig/${identifier}` : `/result/${identifier}`
    );
  };

  const handleCapture = async (photoUri: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setStatus("loading");
    setLoadingMsg(mode === "minifig" ? "Identifying minifigure..." : "Reading set number...");
    try {
      const identification = await identifySet(photoUri, mode);
      const access = await prepareLookupAccess();
      if (!access.allowed) {
        setStatus("idle");
        openAccountForSignIn();
        return;
      }

      if (maybeShowCandidates(identification)) {
        setStatus("candidates");
        return;
      }

      if (!identification.set_number) {
        warn();
        setErrorMessage(
          mode === "minifig"
            ? "We couldn't identify the minifigure. Try a clearer front-facing shot."
            : "We couldn't find a set number in this photo. Try a clearer shot of the box or enter the set number manually."
        );
        setStatus("idle");
        return;
      }

      try {
        await beginLookup(identification.set_number);
      } catch (e) {
        if (e instanceof Error && e.message.includes("401")) {
          await clearAuthToken();
          openAccountForSignIn();
          setStatus("idle");
          return;
        }
        if (e instanceof Error && e.message.includes("404")) {
          warn();
          setErrorMessage(
            mode === "minifig"
              ? "We couldn't find market data for that minifigure. Try a different ID or clearer scan."
              : "We don't have data for that set number. Double-check it and try again."
          );
          setStatus("idle");
          return;
        }
        if (e instanceof Error && e.message.includes("402")) {
          openUpgrade();
          setStatus("idle");
          return;
        }
        warn();
        setErrorMessage("We found the item number, but couldn't fetch market prices. Try again in a moment.");
        setStatus("idle");
      }
    } catch (e) {
      warn();
      setErrorMessage("Something went wrong reading the photo. Try again in a moment or enter it manually.");
      setStatus("idle");
      return;
    }
  };

  const handleManualSubmit = async (identifier: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    try {
      const access = await prepareLookupAccess();
      if (!access.allowed) {
        openAccountForSignIn();
        return;
      }
      setStatus("loading");
      await beginLookup(identifier);
    } catch (e) {
      if (e instanceof Error && e.message.includes("401")) {
        await clearAuthToken();
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("404")) {
        warn();
        setErrorMessage(
          mode === "minifig"
            ? "We couldn't find market data for that minifigure. Try a different ID or clearer scan."
            : "We don't have data for that set number. Double-check it and try again."
        );
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("402")) {
        openUpgrade();
        setStatus("idle");
        return;
      }
      warn();
      setErrorMessage("We found the item number, but couldn't fetch market prices. Try again in a moment.");
      setStatus("idle");
    }
  };

  const handleCandidatePick = async (identifier: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setStatus("loading");
    try {
      await beginLookup(identifier);
    } catch (e) {
      if (e instanceof Error && e.message.includes("401")) {
        await clearAuthToken();
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("404")) {
        warn();
        setErrorMessage(
          mode === "minifig"
            ? "We couldn't find market data for that minifigure. Try a different ID."
            : "We don't have data for that set number. Double-check it and try again."
        );
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("402")) {
        openUpgrade();
        setStatus("idle");
        return;
      }
      warn();
      setErrorMessage(
        mode === "minifig"
          ? "We couldn't find market data for that minifigure. Try a clearer scan."
          : "We couldn't find market data for that set number. Double-check it and try again."
      );
      setStatus("idle");
    }
  };

  const dismissResult = () => {
    setResult(null);
    setStatus("idle");
  };

  const showPreviewResult = () => {
    setErrorMessage(null);
    setResult(mode === "minifig" ? previewMinifigResult : previewResult);
    setAddedSetNumber(null);
    setStatus("result");
  };

  const handleAddToCollection = async (
    item: LookupResult,
    options: { quantity: number; condition: CollectionCondition }
  ) => {
    await addToCollection(item, options);
    setAddedSetNumber(item.set_number);
    success();
  };

  const errorTranslateY = errorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  return (
    <View style={styles.root}>
      <CameraScanner
        enabled={status === "idle"}
        mode={mode}
        onModeChange={setMode}
        onCapture={handleCapture}
        onManualPress={() => {
          setErrorMessage(null);
          manualRef.current?.open();
        }}
      />

      <TopBar onAccountPress={() => openWebView("/account")} />

      {__DEV__ && status === "idle" && (
        <Pressable style={styles.previewBtn} onPress={showPreviewResult}>
          <Text style={styles.previewText}>Preview result</Text>
        </Pressable>
      )}

      {status === "loading" && <LegoLoaderNative message={loadingMsg} />}

      {status === "candidates" && candidateOptions.length > 0 ? (
        <Animated.View
          style={[
            styles.candidateSheet,
            {
              opacity: candidateProgress,
              transform: [
                {
                  translateY: candidateProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.candidateTitle}>Low confidence scan</Text>
          <Text style={styles.candidateBody}>{candidateMessage}</Text>
          <View style={styles.candidateList}>
            {candidateOptions.map((candidate, index) => (
              <Pressable
                key={`${candidate.id}-${index}`}
                accessibilityRole="button"
                style={styles.candidateRow}
                onPress={() => handleCandidatePick(candidate.id)}
              >
                <View style={styles.candidateRank}>
                  <Text style={styles.candidateRankText}>{index + 1}</Text>
                </View>
                <View style={styles.candidateCopy}>
                  <Text style={styles.candidateId}>#{candidate.id}</Text>
                  <Text style={styles.candidateScore}>
                    {Math.round(candidate.score * 100)}% match
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={styles.candidateActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.candidateSecondary}
              onPress={() => {
                setCandidateOptions([]);
                setStatus("idle");
              }}
            >
              <Text style={styles.candidateSecondaryText}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.candidatePrimary}
              onPress={() => {
                setCandidateOptions([]);
                setStatus("idle");
                manualRef.current?.open();
              }}
            >
              <Text style={styles.candidatePrimaryText}>Enter manually</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {status === "idle" && errorMessage ? (
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.errorBanner,
            {
              opacity: errorProgress,
              transform: [{ translateY: errorTranslateY }],
            },
          ]}
        >
          <Text style={styles.errorTitle}>Scan issue</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <View style={styles.errorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === "minifig" ? "Dismiss scan issue" : "Enter set number manually"}
              style={styles.errorPrimary}
              onPress={() => {
                setErrorMessage(null);
                if (mode === "set") {
                  manualRef.current?.open();
                }
              }}
            >
              <Text style={styles.errorPrimaryText}>{mode === "minifig" ? "Try again" : "Enter manually"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss scan issue"
              style={styles.errorSecondary}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={styles.errorSecondaryText}>Dismiss</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <ResultCard
        result={status === "result" ? result : null}
        onDismiss={dismissResult}
        onAddToCollection={handleAddToCollection}
        addedToCollection={!!result && addedSetNumber === result.set_number}
        onViewDetails={(identifier) => {
          openHostedDetails(identifier).catch(() => {
            openAccountForSignIn();
          });
        }}
      />

      <ManualEntrySheet ref={manualRef} mode={mode} onSubmit={handleManualSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#120e08" },
  previewBtn: {
    position: "absolute",
    top: 128,
    right: 18,
    zIndex: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewText: {
    color: "#fff3cf",
    fontSize: 12,
    fontWeight: "800",
  },
  errorBanner: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 132,
    zIndex: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,143,143,0.42)",
    backgroundColor: "rgba(35,18,12,0.9)",
    padding: 14,
    gap: 10,
  },
  errorTitle: {
    color: "#ffb4b4",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  errorBody: {
    color: "#fff3cf",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  errorActions: {
    flexDirection: "row",
    gap: 10,
  },
  errorPrimary: {
    minHeight: 40,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#f5c518",
    alignItems: "center",
    justifyContent: "center",
  },
  errorPrimaryText: {
    color: "#171006",
    fontSize: 12,
    fontWeight: "900",
  },
  errorSecondary: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,243,207,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorSecondaryText: {
    color: "#fff3cf",
    fontSize: 12,
    fontWeight: "900",
  },
  candidateSheet: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 128,
    zIndex: 35,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(16,16,18,0.9)",
    padding: 16,
    gap: 10,
  },
  candidateTitle: {
    color: "#fff3cf",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  candidateBody: {
    color: "#f7f4ea",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  candidateList: {
    gap: 8,
  },
  candidateRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  candidateRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5c518",
  },
  candidateRankText: {
    color: "#171006",
    fontSize: 12,
    fontWeight: "900",
  },
  candidateCopy: {
    flex: 1,
    gap: 2,
  },
  candidateId: {
    color: "#f7f4ea",
    fontSize: 14,
    fontWeight: "900",
  },
  candidateScore: {
    color: "rgba(247,244,234,0.68)",
    fontSize: 11,
    fontWeight: "700",
  },
  candidateActions: {
    flexDirection: "row",
    gap: 10,
  },
  candidateSecondary: {
    minHeight: 40,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,243,207,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  candidateSecondaryText: {
    color: "#fff3cf",
    fontSize: 12,
    fontWeight: "900",
  },
  candidatePrimary: {
    minHeight: 40,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#f5c518",
    alignItems: "center",
    justifyContent: "center",
  },
  candidatePrimaryText: {
    color: "#171006",
    fontSize: 12,
    fontWeight: "900",
  },
});
