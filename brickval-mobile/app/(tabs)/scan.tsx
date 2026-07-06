import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, View, StyleSheet, Pressable, Text, ScrollView, TextInput, Image, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { TopBar } from "../../components/TopBar";
import { CameraScanner } from "../../components/CameraScanner";
import { ResultCard } from "../../components/ResultCard";
import { DetectionOverlay } from "../../components/DetectionOverlay";
import { LegoLoaderNative } from "../../components/LegoLoaderNative";
import { ManualEntrySheet, type ManualEntryHandle } from "../../components/ManualEntrySheet";
import {
  bulkLookupMinifigs,
  fetchPartColors,
  getAuthToken,
  identifySet,
  lookupSet,
  type IdentificationCandidate,
  type IdentificationDetection,
  type IdentificationResult,
  type BulkMinifigLookupRow,
  type LookupDetailResult,
  type LookupItemType,
  type PartColorOption,
  type ScanMode,
} from "../../lib/api";
import {
  getBatchableMinifigIds,
  getDetectionChoiceMessage,
  getDetectionReviewSummary,
  getDetectionReviewTitle,
  shouldPauseForDetectionChoice,
  toggleBulkMinifigSelection,
} from "../../lib/detection-choice";
import { getBrickLinkPreviewImageUrl } from "../../lib/image-url";
import { addToCollection, getCollection, type CollectionCondition } from "../../lib/collection";
import { shouldBlockCollectionAdd } from "../../lib/collection-core";
import { success, warn } from "../../lib/haptics";
import { getNativeProStatus } from "../../lib/paywall";
import { setLatestLookupResult } from "../../lib/live-result";
import {
  getGuestScansUsed,
  setGuestScansUsed,
  prepareLookupAccess,
  GUEST_SCAN_LIMIT,
} from "../../lib/guest-scan-limits";
import { getSmartAutoScanPreference } from "../../lib/preferences";
import { useUpgrade } from "../../lib/useUpgrade";
import { PrePurchaseDisclosure } from "../../components/PrePurchaseDisclosure";
import { useTheme, type ModeColors } from "../../lib/ThemeProvider";
import type { ThemeColors } from "../../lib/theme";

/**
 * Native scan screen — fullscreen camera, manual capture, result sheet over
 * the dimmed camera background, and native detail drill-down when needed.
 */

type Status = "idle" | "loading" | "result" | "candidates" | "detections" | "partColor";
const FREE_COLLECTION_LIMIT = 10;
const LOW_CONFIDENCE_THRESHOLD = 0.8;

function getResultKey(item: LookupDetailResult) {
  return `${item.item_type}:${item.set_number}:${item.item_type === "part" ? item.part_info.color_id ?? "none" : "base"}`;
}

const previewResult: LookupDetailResult = {
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
    exchange_rate_stale: false,
    ebay_new_sales: [],
    ebay_used_sales: [],
    ebay_new_avg_usd: 799,
    ebay_used_avg_usd: 640,
    bricklink_new_avg_usd: 812,
    bricklink_new_min_usd: 790,
    bricklink_new_max_usd: 839,
    bricklink_used_avg_usd: 645,
    bricklink_used_min_usd: 598,
    bricklink_used_max_usd: 701,
    bricklink_used_qty: 9,
    bricklink_stock_new_avg_usd: 828,
    bricklink_stock_new_qty: 22,
    bricklink_stock_used_avg_usd: 659,
    bricklink_stock_used_qty: 14,
    bricklink_sold_new_details: [
      { price_usd: 812, quantity: 1, date: "2026-03-22", country: "US" },
      { price_usd: 804, quantity: 1, date: "2026-02-09", country: "GB" },
    ],
    bricklink_sold_used_details: [],
    bricklink_stock_new_details: [{ price_usd: 829, quantity: 1, country: "DE" }],
    bricklink_stock_used_details: [],
  },
  set_info: {
    year_released: 2017,
    is_obsolete: true,
  },
};

const previewMinifigResult: LookupDetailResult = {
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
    used_sold_avg_usd: 4.15,
    used_sold_min_usd: 3.5,
    used_sold_max_usd: 5,
    used_sold_qty: 42,
    used_stock_avg_usd: 4.85,
    used_stock_qty: 17,
    new_sold_avg_usd: 5.1,
    new_sold_min_usd: 4.8,
    new_sold_max_usd: 5.4,
    new_sold_qty: 5,
    new_stock_avg_usd: 5.5,
    new_stock_qty: 8,
    sold_details: [{ price_usd: 4, quantity: 1, date: "2026-03-22", country: "US" }],
    stock_details: [{ price_usd: 5, quantity: 1, country: "CA" }],
    sold_new_details: [],
    stock_new_details: [],
  },
  fig_info: {
    fig_number: "sw0001",
    year_released: 1999,
  },
};

export default function ScanHome() {
  const [mode, setMode] = useState<ScanMode>("minifig");
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMsg, setLoadingMsg] = useState("Finding minifigures and parts...");
  const [result, setResult] = useState<LookupDetailResult | null>(null);
  const [addedResultKey, setAddedResultKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidateOptions, setCandidateOptions] = useState<IdentificationCandidate[]>([]);
  const [candidateMessage, setCandidateMessage] = useState<string>("We found a few possible matches.");
  const [detections, setDetections] = useState<IdentificationDetection[]>([]);
  const [partColors, setPartColors] = useState<PartColorOption[]>([]);
  const [selectedPart, setSelectedPart] = useState<IdentificationDetection | null>(null);
  const [partColorQuery, setPartColorQuery] = useState("");
  const [selectedBulkMinifigIds, setSelectedBulkMinifigIds] = useState<string[]>([]);
  const [bulkMinifigQueue, setBulkMinifigQueue] = useState<string[]>([]);
  const [bulkMinifigResultQueue, setBulkMinifigResultQueue] = useState<LookupDetailResult[]>([]);
  const [guestScansUsed, setGuestScansUsedState] = useState(0);
  const [smartAutoScanEnabled, setSmartAutoScanEnabled] = useState(true);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [photoLayout, setPhotoLayout] = useState({ width: 0, height: 0 });
  const [collectionLimitPromptVisible, setCollectionLimitPromptVisible] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState<string>(
    "We found LEGO minifigures and parts in this photo. Pick one to view its value."
  );
  const errorProgress = useRef(new Animated.Value(0)).current;
  const candidateProgress = useRef(new Animated.Value(0)).current;
  const collectionLimitProgress = useRef(new Animated.Value(0)).current;
  const collectionLimitPromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualRef = useRef<ManualEntryHandle>(null);
  const pendingGuestScan = useRef(false);
  const pendingServerScansUsed = useRef<number | null>(null);
  const promptedOnCurrentResult = useRef(false);
  const { triggerUpgrade, openAccountForUpgrade, openAccountForSignIn, showDisclosure, handleDisclosureContinue, handleDisclosureDismiss } = useUpgrade();
  const { colors: palette, c: activeColors, mode: themeMode } = useTheme();
  const s = useMemo(() => getStyles(palette, activeColors), [palette, activeColors, themeMode]);
  const insets = useSafeAreaInsets();

  const syncGuestScansUsed = async () => {
    const count = await getGuestScansUsed();
    setGuestScansUsedState(count);
    return count;
  };
  const commitGuestScansUsed = async (nextScansUsed: number) => {
    const count = await setGuestScansUsed(nextScansUsed);
    setGuestScansUsedState(count);
  };

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
    if (!["candidates", "detections", "partColor"].includes(status)) {
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

  useEffect(() => {
    if (status === "idle") {
      setCapturedPhotoUri(null);
      setPhotoLayout({ width: 0, height: 0 });
    }
  }, [status]);

  useEffect(() => {
    void syncGuestScansUsed();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSmartAutoScanPreference().then((enabled) => {
        if (active) setSmartAutoScanEnabled(enabled);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      if (collectionLimitPromptTimer.current) {
        clearTimeout(collectionLimitPromptTimer.current);
      }
    };
  }, []);

  const hideCollectionLimitPrompt = useCallback(() => {
    if (collectionLimitPromptTimer.current) {
      clearTimeout(collectionLimitPromptTimer.current);
      collectionLimitPromptTimer.current = null;
    }

    Animated.timing(collectionLimitProgress, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setCollectionLimitPromptVisible(false);
      }
    });
  }, [collectionLimitProgress]);

  const showCollectionLimitPrompt = useCallback(() => {
    if (collectionLimitPromptTimer.current) {
      clearTimeout(collectionLimitPromptTimer.current);
      collectionLimitPromptTimer.current = null;
    }

    setCollectionLimitPromptVisible(true);
    collectionLimitProgress.stopAnimation();
    Animated.timing(collectionLimitProgress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [collectionLimitProgress]);

  const handleCollectionLimitSignIn = useCallback(() => {
    hideCollectionLimitPrompt();
    openAccountForSignIn();
  }, [hideCollectionLimitPrompt, openAccountForSignIn]);

  const handleCollectionLimitUpgrade = useCallback(() => {
    hideCollectionLimitPrompt();
    void triggerUpgrade();
  }, [hideCollectionLimitPrompt, triggerUpgrade]);

  const yieldToRender = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const beginLookup = async (
    identifier: string,
    itemType: LookupItemType = mode,
    options?: { colorId?: number }
  ) => {
    setLoadingMsg("Fetching market prices...");
    const data = await lookupSet(identifier, itemType, options);
    setResult(data);
    setLatestLookupResult(data);
    setAddedResultKey(null);
    setStatus("result");
    promptedOnCurrentResult.current = false;
    let nextScansUsed: number | null = null;
    if (typeof data.scansUsed === "number" && (await getAuthToken())) {
      nextScansUsed = data.scansUsed;
      setGuestScansUsedState(data.scansUsed);
    } else if (pendingServerScansUsed.current !== null) {
      nextScansUsed = pendingServerScansUsed.current;
      setGuestScansUsedState(pendingServerScansUsed.current);
    } else if (pendingGuestScan.current) {
      const latestGuestScansUsed = await syncGuestScansUsed();
      nextScansUsed = latestGuestScansUsed + 1;
      await commitGuestScansUsed(nextScansUsed);
    }
    pendingGuestScan.current = false;
    pendingServerScansUsed.current = null;

    if (
      !promptedOnCurrentResult.current &&
      nextScansUsed !== null &&
      nextScansUsed >= GUEST_SCAN_LIMIT &&
      !data.isPro
    ) {
      promptedOnCurrentResult.current = true;
      const token = await getAuthToken();
      if (token) {
        setTimeout(() => {
          void triggerUpgrade();
        }, 900);
      } else {
        setTimeout(() => {
          openAccountForUpgrade();
        }, 900);
      }
    }
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

  const openDetectionSheet = async (nextDetections: IdentificationDetection[], message: string) => {
    const access = await prepareLookupAccess();
    if (!access.allowed) {
      openAccountForUpgrade();
      setStatus("idle");
      return;
    }
    if (!access.hasToken) {
      pendingGuestScan.current = true;
    }
    setDetections(nextDetections);
    setSelectedBulkMinifigIds(getBatchableMinifigIds(nextDetections));
    setDetectionMessage(message);
    setStatus("detections");
  };

  const openPartColorPicker = async (detection: IdentificationDetection) => {
    setSelectedPart(detection);
    setPartColorQuery("");
    if (partColors.length > 0) {
      setStatus("partColor");
      return;
    }

    setStatus("loading");
    setLoadingMsg("Loading part colors...");
    try {
      const colors = await fetchPartColors();
      setPartColors(colors);
      setStatus("partColor");
    } catch {
      warn();
      setErrorMessage("We found the part, but couldn't load the color list. Try again in a moment.");
      setStatus("idle");
    }
  };

  const priceMinifigDetection = async (id: string, options?: { preserveReview: boolean }) => {
    if (!options?.preserveReview) {
      setDetections([]);
      setSelectedBulkMinifigIds([]);
      setBulkMinifigResultQueue([]);
    }
    setStatus("loading");
    setLoadingMsg(`Found minifigure #${id}`);
    await yieldToRender();
    try {
      await beginLookup(id, "minifig");
    } catch (e) {
      if (e instanceof Error && e.message.includes("404")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        warn();
        setErrorMessage("We couldn't find market data for that minifigure. Try a different match.");
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("We found the item, but couldn't fetch market prices. Try again in a moment.");
      setStatus("idle");
    }
  };

  const handleDetectionPick = async (detection: IdentificationDetection) => {
    setErrorMessage(null);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    if (detection.item_type === "part") {
      await openPartColorPicker(detection);
      return;
    }

    await priceMinifigDetection(detection.id);
  };

  const handleBulkMinifigToggle = (id: string) => {
    setSelectedBulkMinifigIds((current) => toggleBulkMinifigSelection(current, id));
  };

  const handleBulkMinifigPricing = async () => {
    if (selectedBulkMinifigIds.length === 0) return;
    const figIds = Array.from(
      new Set(
        selectedBulkMinifigIds
          .map((id) => id.trim().replace(/[^a-z0-9]/gi, "").toLowerCase())
          .filter((id) => id.length >= 3)
      )
    );
    if (figIds.length === 0) return;

    setStatus("loading");
    setLoadingMsg(`Fetching prices for ${figIds.length} minifigures...`);
    await yieldToRender();

    try {
      let rows: BulkMinifigLookupRow[];
      try {
        rows = await bulkLookupMinifigs(figIds);
      } catch {
        rows = [];
      }
      if (rows.length === 0) {
        const fallbackRows = await Promise.all(
          figIds.map(async (figNumber): Promise<BulkMinifigLookupRow> => {
            try {
              const result = await lookupSet(figNumber, "minifig");
              return result.item_type === "minifig"
                ? { figNumber, result, error: null }
                : { figNumber, result: null, error: "not_found" };
            } catch {
              return { figNumber, result: null, error: "not_found" };
            }
          })
        );
        rows = fallbackRows;
      }
      const pricedResults = rows
        .map((row) => row.result)
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (pricedResults.length === 0) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        warn();
        setErrorMessage("We found the minifigures, but couldn't fetch market prices. Try again in a moment.");
        setStatus("idle");
        return;
      }

      if (pendingGuestScan.current) {
        const latestGuestScansUsed = await syncGuestScansUsed();
        await commitGuestScansUsed(latestGuestScansUsed + 1);
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;

      const [firstResult, ...remainingResults] = pricedResults;
      setBulkMinifigQueue([]);
      setBulkMinifigResultQueue(remainingResults);
      setResult(firstResult);
      setLatestLookupResult(firstResult);
      setAddedResultKey(null);
      promptedOnCurrentResult.current = false;
      setStatus("result");
    } catch {
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("We found the minifigures, but couldn't fetch market prices. Try again in a moment.");
      setStatus("idle");
    }
  };

  const advanceBulkMinifigQueue = async () => {
    const [nextResult, ...remainingResults] = bulkMinifigResultQueue;
    if (nextResult) {
      promptedOnCurrentResult.current = false;
      setResult(nextResult);
      setLatestLookupResult(nextResult);
      setAddedResultKey(null);
      setBulkMinifigResultQueue(remainingResults);
      setStatus("result");
      return;
    }

    const [nextId, ...remainingIds] = bulkMinifigQueue;
    if (!nextId) {
      promptedOnCurrentResult.current = false;
      setResult(null);
      setStatus("idle");
      return;
    }

    promptedOnCurrentResult.current = false;
    setResult(null);
    setAddedResultKey(null);
    setBulkMinifigQueue(remainingIds);
    await priceMinifigDetection(nextId, { preserveReview: true });
  };

  const handlePartColorPick = async (color: PartColorOption) => {
    if (!selectedPart) return;
    setDetections([]);
    setStatus("loading");
    setLoadingMsg(`Found part #${selectedPart.id}`);
    await yieldToRender();
    try {
      await beginLookup(selectedPart.id, "part", { colorId: color.color_id });
      setSelectedPart(null);
    } catch (e) {
      if (e instanceof Error && e.message.includes("404")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        warn();
        setErrorMessage("We couldn't find market data for that part and color. Try a different color.");
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("We found the part, but couldn't fetch market prices. Try again in a moment.");
      setStatus("idle");
    }
  };

  const handleCapture = async (photoUri: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setDetections([]);
    setSelectedPart(null);
    setSelectedBulkMinifigIds([]);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    setCapturedPhotoUri(photoUri);
    if (mode === "set") {
      manualRef.current?.open();
      return;
    }
    setStatus("loading");
    setLoadingMsg("Finding minifigures and parts...");
    try {
      const access = await prepareLookupAccess();
      if (!access.allowed) {
        setStatus("idle");
        openAccountForUpgrade();
        return;
      }

      const identification = await identifySet(photoUri, mode);
      if (typeof identification.scansUsed === "number") {
        pendingServerScansUsed.current = identification.scansUsed;
      }

      if (!identification.detections.length) {
        warn();
        pendingServerScansUsed.current = null;
        setErrorMessage("We couldn't identify the minifigure or part. Try a clearer front-facing shot.");
        setStatus("idle");
        return;
      }
      if (!shouldPauseForDetectionChoice(identification.detections, LOW_CONFIDENCE_THRESHOLD)) {
        const consume = await prepareLookupAccess();
        if (!consume.allowed) {
          setStatus("idle");
          openAccountForUpgrade();
          return;
        }
        if (!consume.hasToken) {
          pendingGuestScan.current = true;
        }

        await handleDetectionPick(identification.detections[0]);
        return;
      }
      await openDetectionSheet(
        identification.detections,
        getDetectionChoiceMessage(identification.detections, LOW_CONFIDENCE_THRESHOLD)
      );
      return;
    } catch (e) {
      if (e instanceof Error && e.message.includes("402")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        triggerUpgrade();
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage(
        mode === "minifig"
          ? "Something went wrong reading the photo. Try again in a moment."
          : "Something went wrong reading the photo. Try again in a moment or enter it manually."
      );
      setStatus("idle");
      return;
    }
  };

  const handlePhotoPress = async () => {
    if (status !== "idle") return;
    if (mode === "set") {
      manualRef.current?.open();
      return;
    }
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      warn();
      Alert.alert("Photo access needed", "Allow photo library access to use an existing image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    success();
    await handleCapture(result.assets[0].uri);
  };

  const handleManualSubmit = async (identifier: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setDetections([]);
    setSelectedBulkMinifigIds([]);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    try {
      const access = await prepareLookupAccess();
      if (!access.allowed) {
        openAccountForUpgrade();
        return;
      }
      if (!access.hasToken) {
        pendingGuestScan.current = true;
      }
      setStatus("loading");
      setLoadingMsg(`Looking up set #${identifier}`);
      await yieldToRender();
      await beginLookup(identifier);
    } catch (e) {
      if (e instanceof Error && e.message.includes("401")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("404")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
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
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        triggerUpgrade();
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("We found the item number, but couldn't fetch market prices. Try again in a moment.");
      setStatus("idle");
    }
  };

  const handleCandidatePick = async (identifier: string) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setDetections([]);
    setSelectedBulkMinifigIds([]);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    setStatus("loading");
    try {
      await beginLookup(identifier);
    } catch (e) {
      if (e instanceof Error && e.message.includes("401")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (e instanceof Error && e.message.includes("404")) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
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
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        triggerUpgrade();
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
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
    if (bulkMinifigResultQueue.length > 0 || bulkMinifigQueue.length > 0) {
      void advanceBulkMinifigQueue();
      return;
    }
    promptedOnCurrentResult.current = false;
    setResult(null);
    setStatus("idle");
  };

  const showPreviewResult = () => {
    setErrorMessage(null);
    promptedOnCurrentResult.current = false;
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    const preview = mode === "minifig" ? previewMinifigResult : previewResult;
    setResult(preview);
    setLatestLookupResult(preview);
    setAddedResultKey(null);
    setStatus("result");
  };

  const handleAddToCollection = async (
    item: LookupDetailResult,
    options: { quantity: number; condition: CollectionCondition }
  ) => {
    const existing = await getCollection();
    const currentCollectionQuantity = existing.reduce((total, entry) => total + (entry.quantity ?? 1), 0);
    const isPro = Boolean(await getNativeProStatus());

    if (
      shouldBlockCollectionAdd({
        currentQuantity: currentCollectionQuantity,
        addQuantity: options.quantity,
        isPro,
        limit: FREE_COLLECTION_LIMIT,
      })
    ) {
      showCollectionLimitPrompt();
      return;
    }

    await addToCollection(item, options);
    setAddedResultKey(getResultKey(item));
    success();

    if (item.item_type === "minifig" && (bulkMinifigResultQueue.length > 0 || bulkMinifigQueue.length > 0)) {
      setTimeout(() => {
        void advanceBulkMinifigQueue();
      }, 450);
    }
  };

  const errorTranslateY = errorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });
  const collectionLimitTranslateY = collectionLimitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const groupedDetections = {
    minifigs: detections.filter((item) => item.item_type === "minifig"),
    parts: detections.filter((item) => item.item_type === "part"),
  };
  const batchableMinifigCount = groupedDetections.minifigs.length;
  const detectionReviewTitle = getDetectionReviewTitle(detections);
  const detectionReviewSummary = getDetectionReviewSummary(detections);
  const filteredPartColors = partColors.filter((color) =>
    color.color_name.toLowerCase().includes(partColorQuery.trim().toLowerCase())
  );
  const canReturnToDetectionSheet = detections.length > 1;

  return (
    <View style={s.root}>
      <CameraScanner
        enabled={status === "idle"}
        mode={mode}
        smartAutoScanEnabled={smartAutoScanEnabled}
        onModeChange={setMode}
        onCapture={handleCapture}
        onPhotoPress={handlePhotoPress}
        onManualPress={() => {
          setErrorMessage(null);
          manualRef.current?.open();
        }}
        showModeSwitch={false}
      />

      <TopBar onAccountPress={openAccountForSignIn} />

      <View pointerEvents="box-none" style={[s.modeHeader, { top: insets.top + 66 }]}>
        <View style={s.modeSegment}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "minifig" }}
            accessibilityLabel="Scan minifigures and parts"
            style={[s.modeSegmentBtn, mode === "minifig" && s.modeSegmentBtnActive]}
            onPress={() => setMode("minifig")}
          >
            <Text style={[s.modeSegmentText, mode === "minifig" && s.modeSegmentTextActive]}>
              Minifigures
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "set" }}
            accessibilityLabel="Enter set number"
            style={[s.modeSegmentBtn, mode === "set" && s.modeSegmentBtnActive]}
            onPress={() => {
              setMode("set");
              setTimeout(() => manualRef.current?.open(), 200);
            }}
          >
            <Text style={[s.modeSegmentText, mode === "set" && s.modeSegmentTextActive]}>
              Sets
            </Text>
          </Pressable>
        </View>
      </View>

      {__DEV__ && status === "idle" && (
        <Pressable style={s.previewBtn} onPress={showPreviewResult}>
          <Text style={s.previewText}>Preview result</Text>
        </Pressable>
      )}

      {status === "loading" && <LegoLoaderNative message={loadingMsg} />}

      {status === "detections" && detections.length > 0 ? (
        <Animated.View
          style={[
            s.candidateSheet,
            s.detectionSheet,
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
          {capturedPhotoUri ? (
            <Animated.View
              style={[
                s.photoPreview,
                {
                  opacity: candidateProgress,
                },
              ]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setPhotoLayout({ width, height });
              }}
            >
              <Image source={{ uri: capturedPhotoUri }} style={s.photoImage} resizeMode="contain" />
              {photoLayout.width > 0 ? (
                <DetectionOverlay
                  detections={detections.map((d) => {
                    const priced = bulkMinifigResultQueue.find(
                      (r) => r.item_type === "minifig" && r.set_number === d.id
                    );
                    return { detection: d, result: priced ?? null };
                  })}
                  imageWidth={photoLayout.width}
                  imageHeight={photoLayout.height}
                />
              ) : null}
            </Animated.View>
          ) : null}
          <View style={s.bulkReviewHeader}>
            <View style={s.bulkReviewCopy}>
              <Text style={s.candidateTitle}>{detectionReviewTitle}</Text>
              <Text style={s.bulkReviewSummary}>{detectionReviewSummary}</Text>
            </View>
            <View style={s.bulkReviewBadge}>
              <Text style={s.bulkReviewBadgeText}>{detections.length}</Text>
            </View>
          </View>
          <Text style={s.candidateBody}>{detectionMessage}</Text>
          <ScrollView style={s.detectionScroll} contentContainerStyle={s.detectionScrollContent} showsVerticalScrollIndicator={false}>
            {groupedDetections.minifigs.length > 0 ? (
              <View style={s.detectionSection}>
                <Text style={s.detectionSectionTitle}>Minifigures</Text>
                {groupedDetections.minifigs.map((candidate) => {
                  const selected = selectedBulkMinifigIds.includes(candidate.id);
                  return (
                    <Pressable
                      key={`minifig-${candidate.id}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      style={[s.candidateRow, selected && s.candidateRowSelected]}
                      onPress={() => handleBulkMinifigToggle(candidate.id)}
                    >
                      <View style={s.candidateThumb}>
                        <Image source={{ uri: getBrickLinkPreviewImageUrl("minifig", candidate.id) }} style={s.candidateThumbImage} />
                      </View>
                      <View style={s.candidateCopy}>
                        <Text style={s.candidateId}>Minifig #{candidate.id}</Text>
                        <Text style={s.candidateScore}>{Math.round(candidate.score * 100)}% match</Text>
                      </View>
                      <View style={[s.bulkCheck, selected && s.bulkCheckSelected]}>
                        <Text style={[s.bulkCheckText, selected && s.bulkCheckTextSelected]}>{selected ? "✓" : ""}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {groupedDetections.parts.length > 0 ? (
              <View style={s.detectionSection}>
                <Text style={s.detectionSectionTitle}>Parts</Text>
                {groupedDetections.parts.map((candidate) => (
                  <Pressable
                    key={`part-${candidate.id}`}
                    accessibilityRole="button"
                    style={s.candidateRow}
                    onPress={() => handleDetectionPick(candidate)}
                  >
                    <View style={s.candidateThumb}>
                      <Image source={{ uri: getBrickLinkPreviewImageUrl("part", candidate.id) }} style={s.candidateThumbImage} />
                    </View>
                    <View style={s.candidateCopy}>
                      <Text style={s.candidateId}>Part #{candidate.id}</Text>
                      <Text style={s.candidateScore}>{Math.round(candidate.score * 100)}% match</Text>
                    </View>
                    <Text style={s.priceThisText}>Price</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <View style={s.candidateActions}>
            <Pressable
              accessibilityRole="button"
              style={s.candidateSecondary}
              onPress={() => {
                setDetections([]);
                setSelectedPart(null);
                setSelectedBulkMinifigIds([]);
                setBulkMinifigQueue([]);
                setBulkMinifigResultQueue([]);
                setStatus("idle");
              }}
            >
              <Text style={s.candidateSecondaryText}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: batchableMinifigCount > 0 && selectedBulkMinifigIds.length === 0 }}
              style={[
                s.candidatePrimary,
                batchableMinifigCount > 0 && selectedBulkMinifigIds.length === 0 && s.candidatePrimaryDisabled,
              ]}
              disabled={batchableMinifigCount > 0 && selectedBulkMinifigIds.length === 0}
              onPress={() => {
                if (batchableMinifigCount > 0) {
                  void handleBulkMinifigPricing();
                  return;
                }
                setDetections([]);
                setSelectedPart(null);
                setSelectedBulkMinifigIds([]);
                setBulkMinifigQueue([]);
                setBulkMinifigResultQueue([]);
                setStatus("idle");
              }}
            >
              <Text style={s.candidatePrimaryText}>
                {batchableMinifigCount > 0
                  ? `Price ${selectedBulkMinifigIds.length} selected`
                  : "Close"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {status === "candidates" && candidateOptions.length > 0 ? (
        <Animated.View
          style={[
            s.candidateSheet,
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
          <Text style={s.candidateTitle}>Low confidence scan</Text>
          <Text style={s.candidateBody}>{candidateMessage}</Text>
          <View style={s.candidateList}>
            {candidateOptions.map((candidate, index) => (
              <Pressable
                key={`${candidate.id}-${index}`}
                accessibilityRole="button"
                style={s.candidateRow}
                onPress={() => handleCandidatePick(candidate.id)}
              >
                <View style={s.candidateRank}>
                  <Text style={s.candidateRankText}>{index + 1}</Text>
                </View>
                <View style={s.candidateCopy}>
                  <Text style={s.candidateId}>#{candidate.id}</Text>
                  <Text style={s.candidateScore}>
                    {Math.round(candidate.score * 100)}% match
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={s.candidateActions}>
            <Pressable
              accessibilityRole="button"
              style={s.candidateSecondary}
              onPress={() => {
                setCandidateOptions([]);
                setStatus("idle");
              }}
            >
              <Text style={s.candidateSecondaryText}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={s.candidatePrimary}
              onPress={() => {
                setCandidateOptions([]);
                setStatus("idle");
                manualRef.current?.open();
              }}
            >
              <Text style={s.candidatePrimaryText}>Enter manually</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {status === "partColor" && selectedPart ? (
        <Animated.View
          style={[
            s.candidateSheet,
            s.colorSheet,
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
          <Text style={s.candidateTitle}>Pick part color</Text>
          <Text style={s.candidateBody}>Part #{selectedPart.id} needs a color before BrickVal can price it.</Text>
          <TextInput
            value={partColorQuery}
            onChangeText={setPartColorQuery}
            placeholder="Search colors"
            placeholderTextColor={activeColors.textDisabled}
            style={s.colorSearch}
            autoCorrect={false}
            autoCapitalize="words"
          />
          <ScrollView style={s.colorScroll} contentContainerStyle={s.detectionScrollContent} showsVerticalScrollIndicator={false}>
            {filteredPartColors.map((color) => (
              <Pressable
                key={color.color_id}
                accessibilityRole="button"
                style={s.colorRow}
                onPress={() => handlePartColorPick(color)}
              >
                <Text style={s.colorName}>{color.color_name}</Text>
                <Text style={s.colorMeta}>Color #{color.color_id}</Text>
              </Pressable>
            ))}
            {filteredPartColors.length === 0 ? (
              <Text style={s.colorEmpty}>No colors match that search.</Text>
            ) : null}
          </ScrollView>
          <View style={s.candidateActions}>
            <Pressable
              accessibilityRole="button"
              style={s.candidateSecondary}
              onPress={() => {
                setSelectedPart(null);
                setPartColorQuery("");
                if (canReturnToDetectionSheet) {
                  setStatus("detections");
                } else {
                  setDetections([]);
                  setStatus("idle");
                }
              }}
            >
              <Text style={s.candidateSecondaryText}>{canReturnToDetectionSheet ? "Back" : "Cancel"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={s.candidatePrimary}
              onPress={() => {
                setSelectedPart(null);
                setPartColorQuery("");
                setStatus("idle");
              }}
            >
              <Text style={s.candidatePrimaryText}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {status === "idle" && errorMessage ? (
        <Animated.View
          accessibilityRole="alert"
          style={[
            s.errorBanner,
            {
              opacity: errorProgress,
              transform: [{ translateY: errorTranslateY }],
            },
          ]}
        >
          <Text style={s.errorTitle}>Scan issue</Text>
          <Text style={s.errorBody}>{errorMessage}</Text>
          <View style={s.errorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === "minifig" ? "Dismiss scan issue" : "Enter set number manually"}
              style={s.errorPrimary}
              onPress={() => {
                setErrorMessage(null);
                if (mode === "set") {
                  manualRef.current?.open();
                }
              }}
            >
              <Text style={s.errorPrimaryText}>{mode === "minifig" ? "Try again" : "Enter manually"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss scan issue"
              style={s.errorSecondary}
              onPress={() => setErrorMessage(null)}
            >
              <Text style={s.errorSecondaryText}>Dismiss</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      <ResultCard
        result={status === "result" ? result : null}
        onDismiss={dismissResult}
        onAddToCollection={handleAddToCollection}
        addedToCollection={!!result && addedResultKey === getResultKey(result)}
        onViewDetails={() => {
          if (!result) return;
          setLatestLookupResult(result);
          router.push("/detail/live");
        }}
      />

      <Modal visible={collectionLimitPromptVisible} transparent animationType="none" onRequestClose={hideCollectionLimitPrompt}>
        <View style={s.collectionLimitModal} pointerEvents="box-none">
          <Animated.View
            accessibilityRole="alert"
            style={[
              s.collectionLimitPrompt,
              {
                opacity: collectionLimitProgress,
                transform: [{ translateY: collectionLimitTranslateY }],
              },
            ]}
          >
            <View style={s.collectionLimitAccent} />
            <View style={s.collectionLimitCopy}>
              <Text style={s.collectionLimitTitle}>Collection limit reached</Text>
              <Text style={s.collectionLimitBody}>
                You have saved the maximum 10 free items. Upgrade to Pro to add unlimited LEGO sets, minifigures, and parts.
              </Text>
            </View>
            <View style={s.collectionLimitActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in to BrickVal"
                style={s.collectionLimitSecondary}
                onPress={handleCollectionLimitSignIn}
              >
                <Text style={s.collectionLimitSecondaryText}>Sign in</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upgrade to BrickVal Pro"
                style={s.collectionLimitPrimary}
                onPress={handleCollectionLimitUpgrade}
              >
                <Text style={s.collectionLimitPrimaryText}>Upgrade Pro</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ManualEntrySheet ref={manualRef} mode={mode} onSubmit={handleManualSubmit} />
      <PrePurchaseDisclosure
        visible={showDisclosure}
        onContinue={handleDisclosureContinue}
        onDismiss={handleDisclosureDismiss}
      />
    </View>
  );
}

function getStyles(c: ThemeColors, m: ModeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: m.background },
  modeHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 12,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modeSegment: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(13,13,15,0.84)",
    padding: 4,
    gap: 4,
    width: "100%",
    maxWidth: 320,
  },
  modeSegmentBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSegmentBtnActive: {
    backgroundColor: palette.lego.yellow,
  },
  modeSegmentText: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 14,
    fontWeight: "900",
  },
  modeSegmentTextActive: {
    color: "#0D0D0F",
  },
  previewBtn: {
    position: "absolute",
    top: 188,
    right: 18,
    zIndex: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.backgroundMuted,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewText: {
    color: m.text,
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
    borderColor: c.semantic.danger,
    backgroundColor: m.background,
    padding: 14,
    gap: 10,
  },
  errorTitle: {
    color: c.semantic.danger,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  errorBody: {
    color: m.text,
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
    backgroundColor: c.lego.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  errorPrimaryText: {
    color: m.textInverse,
    fontSize: 12,
    fontWeight: "900",
  },
  errorSecondary: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: m.border,
    alignItems: "center",
    justifyContent: "center",
  },
  errorSecondaryText: {
    color: m.text,
    fontSize: 12,
    fontWeight: "900",
  },
  collectionLimitModal: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  collectionLimitPrompt: {
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(242,205,55,0.42)",
    backgroundColor: m.backgroundElevated,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  collectionLimitAccent: {
    height: 4,
    backgroundColor: c.lego.yellow,
  },
  collectionLimitCopy: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 6,
  },
  collectionLimitTitle: {
    color: c.lego.yellow,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  collectionLimitBody: {
    color: m.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  collectionLimitActions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 14,
  },
  collectionLimitSecondary: {
    minHeight: 44,
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: m.border,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionLimitSecondaryText: {
    color: m.text,
    fontSize: 12,
    fontWeight: "900",
  },
  collectionLimitPrimary: {
    minHeight: 44,
    flex: 1,
    borderRadius: 999,
    backgroundColor: c.lego.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionLimitPrimaryText: {
    color: m.textInverse,
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
    borderColor: m.border,
    backgroundColor: m.surface,
    padding: 16,
    gap: 10,
  },
  detectionSheet: {
    maxHeight: 360,
  },
  photoPreview: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: m.border,
    overflow: "hidden",
    minHeight: 160,
    marginBottom: 4,
  },
  photoImage: {
    width: "100%",
    height: 220,
    borderRadius: 13,
  },
  colorSheet: {
    maxHeight: 520,
  },
  candidateTitle: {
    color: m.text,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  candidateBody: {
    color: m.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  bulkReviewHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bulkReviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  bulkReviewSummary: {
    color: m.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  bulkReviewBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.lego.yellow,
    backgroundColor: m.backgroundMuted,
  },
  bulkReviewBadgeText: {
    color: c.lego.yellow,
    fontSize: 14,
    fontWeight: "900",
  },
  candidateList: {
    gap: 8,
  },
  detectionScroll: {
    maxHeight: 280,
  },
  colorScroll: {
    maxHeight: 320,
  },
  detectionScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  detectionSection: {
    gap: 8,
  },
  detectionSectionTitle: {
    color: m.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  candidateRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  candidateRowSelected: {
    borderColor: c.lego.yellow,
    backgroundColor: m.backgroundMuted,
  },
  candidateThumb: {
    width: 42,
    height: 42,
    borderRadius: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
  },
  candidateThumbImage: {
    width: "100%",
    height: "100%",
  },
  candidateRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.lego.yellow,
  },
  candidateRankText: {
    color: m.textInverse,
    fontSize: 12,
    fontWeight: "900",
  },
  candidateCopy: {
    flex: 1,
    gap: 2,
  },
  candidateId: {
    color: m.text,
    fontSize: 14,
    fontWeight: "900",
  },
  candidateScore: {
    color: m.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  priceThisText: {
    minWidth: 44,
    color: c.lego.yellow,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  bulkCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: m.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: m.surface,
  },
  bulkCheckSelected: {
    borderColor: c.lego.yellow,
    backgroundColor: c.lego.yellow,
  },
  bulkCheckText: {
    color: "transparent",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  bulkCheckTextSelected: {
    color: m.textInverse,
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
    borderColor: m.border,
    alignItems: "center",
    justifyContent: "center",
  },
  candidateSecondaryText: {
    color: m.text,
    fontSize: 12,
    fontWeight: "900",
  },
  candidatePrimary: {
    minHeight: 40,
    flex: 1,
    borderRadius: 999,
    backgroundColor: c.lego.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  candidatePrimaryDisabled: {
    opacity: 0.45,
  },
  candidatePrimaryText: {
    color: m.textInverse,
    fontSize: 12,
    fontWeight: "900",
  },
  colorSearch: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
    color: m.text,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  colorRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: m.border,
    backgroundColor: m.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 2,
  },
  colorName: {
    color: m.text,
    fontSize: 14,
    fontWeight: "900",
  },
  colorMeta: {
    color: m.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  colorEmpty: {
    color: m.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 18,
  },
  });
}
