import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, AppState, Easing, View, StyleSheet, Pressable, Text, ScrollView, TextInput, Image, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { router, useFocusEffect } from "expo-router";
import { CameraScanner, type CameraCaptureContext } from "../../components/CameraScanner";
import { ResultCard } from "../../components/ResultCard";
import { DetectionOverlay } from "../../components/DetectionOverlay";
import { LegoLoaderNative } from "../../components/LegoLoaderNative";
import { ScanIntentPicker, type ScanIntent } from "../../components/ScanIntentPicker";
import {
  bulkLookupMinifigs,
  fetchPartColors,
  getAuthToken,
  identifySet,
  identifyGuidedBulkMinifigs,
  isApiRequestError,
  lookupSet,
  scanMinifigure,
  submitMinifigFeedback,
  type IdentificationCandidate,
  type IdentificationDetection,
  type IdentificationResult,
  type BulkMinifigLookupRow,
  type LookupDetailResult,
  type LookupItemType,
  type PartColorOption,
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
import { useUpgrade } from "../../lib/useUpgrade";
import { PrePurchaseDisclosure } from "../../components/PrePurchaseDisclosure";
import { useTheme, type ModeColors } from "../../lib/ThemeProvider";
import type { ThemeColors } from "../../lib/theme";
import { buildMarketSnapshot } from "../../lib/market-snapshot";
import { sanitizeBulkMinifigNumbers } from "../../lib/minifig-lookup";
import { runMinifigScanSession, ScanSessionError } from "../../lib/scan-session";
import { captureScanError, recordScanTimings } from "../../lib/sentry";
import { getScanImprovementConsent, getSmartAutoScanPreference } from "../../lib/preferences";
import { getPhysicalMinifigQuantities } from "../../lib/bulk-result";
import { prepareBulkCapture, type PreparedBulkCapture } from "../../lib/bulk-capture";
import { shouldRunCamera } from "../../lib/camera-lifecycle";

/**
 * Native scan screen — fullscreen camera, manual capture, result sheet over
 * the dimmed camera background, and native detail drill-down when needed.
 */

type Status = "idle" | "loading" | "result" | "bulkResult" | "candidates" | "detections" | "partColor";
type BulkSelectionState = Record<string, { selected: boolean; condition: CollectionCondition }>;
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
  const [scanIntent, setScanIntent] = useState<ScanIntent>("single");
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
  const [bulkResults, setBulkResults] = useState<LookupDetailResult[]>([]);
  const [bulkSelections, setBulkSelections] = useState<BulkSelectionState>({});
  const [bulkAdded, setBulkAdded] = useState(false);
  const [guestScansUsed, setGuestScansUsedState] = useState(0);
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
  const singleScanCooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGuestScan = useRef(false);
  const pendingServerScansUsed = useRef<number | null>(null);
  const promptedOnCurrentResult = useRef(false);
  const [singleAutoScanCoolingDown, setSingleAutoScanCoolingDown] = useState(false);
  const [smartAutoScanEnabled, setSmartAutoScanEnabled] = useState(true);
  const [bulkOverflowCount, setBulkOverflowCount] = useState(0);
  const [screenFocused, setScreenFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
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

  useFocusEffect(useCallback(() => {
    void getSmartAutoScanPreference().then(setSmartAutoScanEnabled);
  }, []));

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (collectionLimitPromptTimer.current) {
        clearTimeout(collectionLimitPromptTimer.current);
      }
      if (singleScanCooldownTimer.current) {
        clearTimeout(singleScanCooldownTimer.current);
      }
    };
  }, []);

  const startSingleScanCooldown = useCallback(() => {
    if (singleScanCooldownTimer.current) {
      clearTimeout(singleScanCooldownTimer.current);
    }
    setSingleAutoScanCoolingDown(true);
    singleScanCooldownTimer.current = setTimeout(() => {
      singleScanCooldownTimer.current = null;
      setSingleAutoScanCoolingDown(false);
    }, 1800);
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

  const completeLookup = async (data: LookupDetailResult) => {
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

  const beginLookup = async (
    identifier: string,
    itemType: LookupItemType = "set",
    options?: { colorId?: number }
  ) => {
    setLoadingMsg("Fetching market prices...");
    const data = await lookupSet(identifier, itemType, options);
    await completeLookup(data);
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
    setCandidateMessage("We found a few possible minifigures. Pick the closest match.");
    setStatus("candidates");
    return true;
  };

  const openDetectionSheet = async (
    nextDetections: IdentificationDetection[],
    message: string,
    preparedAccess?: { allowed: boolean; hasToken: boolean }
  ) => {
    const access = preparedAccess ?? await prepareLookupAccess();
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
      if (isApiRequestError(e) && e.status === 404) {
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
    setBulkResults([]);
    setBulkSelections({});
    setBulkAdded(false);
    if (detection.item_type === "part") {
      await openPartColorPicker(detection);
      return;
    }

    await priceMinifigDetection(detection.id);
  };

  const handleBulkMinifigToggle = (id: string) => {
    setSelectedBulkMinifigIds((current) => toggleBulkMinifigSelection(current, id));
  };

  const fetchBulkMinifigResults = async (figIds: string[]) => {
    let rows: BulkMinifigLookupRow[];
    try {
      rows = await bulkLookupMinifigs(figIds);
    } catch {
      rows = [];
    }

    if (rows.length === 0) {
      rows = await Promise.all(
        figIds.map(async (figNumber): Promise<BulkMinifigLookupRow> => {
          try {
            const data = await lookupSet(figNumber, "minifig");
            return data.item_type === "minifig"
              ? { figNumber, result: data, error: null }
              : { figNumber, result: null, error: "not_found" };
          } catch {
            return { figNumber, result: null, error: "not_found" };
          }
        })
      );
    }

    return rows
      .map((row) => row.result)
      .filter((row): row is NonNullable<BulkMinifigLookupRow["result"]> => row !== null);
  };

  const handleBulkMinifigPricing = async (ids = selectedBulkMinifigIds) => {
    if (ids.length === 0) return;
    const figIds = sanitizeBulkMinifigNumbers(ids);
    if (figIds.length === 0) return;

    setStatus("loading");
    setLoadingMsg(`Counting value for ${figIds.length} minifigures...`);
    await yieldToRender();

    try {
      const pricedResults = await fetchBulkMinifigResults(figIds);

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

      setBulkMinifigQueue([]);
      setBulkMinifigResultQueue([]);
      setBulkResults(pricedResults);
      const nextSelections: BulkSelectionState = {};
      for (const item of pricedResults) {
        nextSelections[getResultKey(item)] = { selected: true, condition: "new_sealed" };
      }
      setBulkSelections(nextSelections);
      setBulkAdded(false);
      setResult(null);
      setLatestLookupResult(pricedResults[0]);
      setAddedResultKey(null);
      promptedOnCurrentResult.current = false;
      setStatus("bulkResult");
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
      if (isApiRequestError(e) && e.status === 404) {
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

  const handleCapture = async (photoUri: string, captureContext?: CameraCaptureContext) => {
    setErrorMessage(null);
    setCandidateOptions([]);
    setDetections([]);
    setSelectedPart(null);
    setSelectedBulkMinifigIds([]);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    setBulkResults([]);
    setBulkSelections({});
    setBulkAdded(false);
    setCapturedPhotoUri(photoUri);
    setStatus("loading");
    setLoadingMsg(scanIntent === "bulk" ? "Finding minifigures..." : "Finding minifigure...");
    let guidedBulkCapture: PreparedBulkCapture | null = null;
    const guidedSingleCapture =
      scanIntent === "single" && captureContext?.observations.length === 1;
    try {
      if (scanIntent === "bulk" && captureContext?.observations.length) {
        guidedBulkCapture = await prepareBulkCapture(
          photoUri,
          captureContext.observations.map((observation) => ({
            regionId: observation.regionId,
            confidence: observation.confidence,
            boundingBox: observation.boundingBox,
          }))
        );
        setBulkOverflowCount(guidedBulkCapture.overflowRegionIds.length);
      } else {
        setBulkOverflowCount(0);
      }
      const outcome = await runMinifigScanSession(photoUri, scanIntent, {
        prepareAccess: prepareLookupAccess,
        identify: guidedBulkCapture
          ? async () => identifyGuidedBulkMinifigs(guidedBulkCapture!)
          : (uri, mode, options) => identifySet(uri, mode, { ...options, guided: guidedSingleCapture }),
        bulkLookup: bulkLookupMinifigs,
        lookup: (identifier, mode) => lookupSet(identifier, mode),
        scanSingle: scanMinifigure,
        now: () => performance.now(),
      });
      recordScanTimings({ intent: scanIntent, outcome: outcome.kind, ...outcome.timings });

      if (outcome.kind === "access-denied") {
        setStatus("idle");
        openAccountForUpgrade();
        return;
      }

      const identification = outcome.identification;
      if (typeof identification.scansUsed === "number") {
        pendingServerScansUsed.current = identification.scansUsed;
      }

      if (outcome.kind === "not-found") {
        const consent = await getScanImprovementConsent();
        void submitMinifigFeedback({
          outcome: "brickognize-rejected",
          consent,
          photoUri: captureContext?.autoCaptured ? photoUri : undefined,
          detectorModelVersion: captureContext?.detectorModelVersion,
          detectorConfidence: captureContext?.observations[0]?.confidence,
          detectMs: captureContext?.detectMs,
          identifyMs: outcome.timings.identifyMs,
          totalMs: outcome.timings.totalMs,
        }).catch(() => undefined);
        warn();
        pendingServerScansUsed.current = null;
        setErrorMessage("We couldn't identify the minifigure or part. Try a clearer front-facing shot.");
        if (scanIntent === "single") startSingleScanCooldown();
        setStatus("idle");
        return;
      }

      if (outcome.kind === "bulk-results") {
        if (outcome.detections.length === 0) {
          warn();
          pendingServerScansUsed.current = null;
          setErrorMessage("We couldn't find any minifigures in this frame. Try spreading them out with the front side visible.");
          setStatus("idle");
          return;
        }

        if (!outcome.access.hasToken) {
          pendingGuestScan.current = true;
        }
        if (outcome.results.length === 0) {
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
        setDetections(outcome.detections);
        setSelectedBulkMinifigIds(getBatchableMinifigIds(outcome.detections));
        setBulkResults(outcome.results);
        const nextSelections: BulkSelectionState = {};
        for (const item of outcome.results) {
          nextSelections[getResultKey(item)] = { selected: true, condition: "new_sealed" };
        }
        setBulkSelections(nextSelections);
        setLatestLookupResult(outcome.results[0]);
        setStatus("bulkResult");
        return;
      }

      if (outcome.kind === "single-match") {
        const consent = await getScanImprovementConsent();
        void submitMinifigFeedback({
          outcome: outcome.identification.confidence !== null && outcome.identification.confidence < 0.85
            ? "low-confidence"
            : "matched",
          consent,
          photoUri: captureContext?.autoCaptured ? photoUri : undefined,
          detectorModelVersion: captureContext?.detectorModelVersion,
          detectorConfidence: captureContext?.observations[0]?.confidence,
          brickognizeId: outcome.identification.set_number ?? undefined,
          brickognizeScore: outcome.identification.confidence ?? undefined,
          detectMs: captureContext?.detectMs,
          identifyMs: outcome.timings.identifyMs,
          pricingMs: outcome.timings.priceMs,
          totalMs: outcome.timings.totalMs,
        }).catch(() => undefined);
        pendingGuestScan.current = !outcome.access.hasToken;
        await completeLookup(outcome.result);
        return;
      }

      await openDetectionSheet(
        identification.detections,
        getDetectionChoiceMessage(identification.detections, LOW_CONFIDENCE_THRESHOLD),
        outcome.access
      );
      return;
    } catch (e) {
      const stage = e instanceof ScanSessionError ? e.stage : "unknown";
      const rootError = e instanceof ScanSessionError ? e.cause : e;
      captureScanError(stage, rootError, {
        intent: scanIntent,
        ...(e instanceof ScanSessionError ? e.timings : {}),
      });
      if (isApiRequestError(rootError) && rootError.status === 402) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        triggerUpgrade();
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("Something went wrong reading the photo. Try again in a moment.");
      if (scanIntent === "single") startSingleScanCooldown();
      setStatus("idle");
      return;
    }
  };

  const handlePhotoPress = async () => {
    if (status !== "idle") return;
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
    setBulkResults([]);
    setBulkSelections({});
    setBulkAdded(false);
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
      await beginLookup(identifier, "set");
    } catch (e) {
      if (isApiRequestError(e) && e.status === 401) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (isApiRequestError(e) && e.status === 404) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        warn();
        setErrorMessage("We don't have data for that set number. Double-check it and try again.");
        setStatus("idle");
        return;
      }
      if (isApiRequestError(e) && e.status === 402) {
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
    setBulkResults([]);
    setBulkSelections({});
    setBulkAdded(false);
    setStatus("loading");
    try {
      await beginLookup(identifier, "minifig");
    } catch (e) {
      if (isApiRequestError(e) && e.status === 401) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        openAccountForSignIn();
        setStatus("idle");
        return;
      }
      if (isApiRequestError(e) && e.status === 404) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        warn();
        setErrorMessage("We couldn't find market data for that minifigure. Try a different ID.");
        setStatus("idle");
        return;
      }
      if (isApiRequestError(e) && e.status === 402) {
        pendingGuestScan.current = false;
        pendingServerScansUsed.current = null;
        triggerUpgrade();
        setStatus("idle");
        return;
      }
      pendingGuestScan.current = false;
      pendingServerScansUsed.current = null;
      warn();
      setErrorMessage("We couldn't find market data for that minifigure. Try a clearer scan.");
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
    if (scanIntent === "single") startSingleScanCooldown();
    setStatus("idle");
  };

  const showPreviewResult = () => {
    setErrorMessage(null);
    promptedOnCurrentResult.current = false;
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    setDetections([]);
    const preview = previewMinifigResult;
    if (scanIntent === "bulk") {
      setBulkResults([preview]);
      setBulkSelections({ [getResultKey(preview)]: { selected: true, condition: "new_sealed" } });
      setBulkAdded(false);
      setResult(null);
      setLatestLookupResult(preview);
      setStatus("bulkResult");
      return;
    }
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

  const handleAddBulkToCollection = async () => {
    const physicalQuantities = getPhysicalMinifigQuantities(detections);
    const selectedEntries = bulkResults
      .map((item) => ({
        item,
        quantity: physicalQuantities[item.set_number.toLowerCase()] ?? 1,
        selection: bulkSelections[getResultKey(item)] ?? { selected: true, condition: "new_sealed" as const },
      }))
      .filter((entry) => entry.selection.selected);

    if (selectedEntries.length === 0 || bulkAdded) return;
    const existing = await getCollection();
    const currentCollectionQuantity = existing.reduce((total, entry) => total + (entry.quantity ?? 1), 0);
    const isPro = Boolean(await getNativeProStatus());

    if (
      shouldBlockCollectionAdd({
        currentQuantity: currentCollectionQuantity,
        addQuantity: selectedEntries.reduce((total, entry) => total + entry.quantity, 0),
        isPro,
        limit: FREE_COLLECTION_LIMIT,
      })
    ) {
      showCollectionLimitPrompt();
      return;
    }

    for (const entry of selectedEntries) {
      await addToCollection(entry.item, { quantity: entry.quantity, condition: entry.selection.condition });
    }
    setBulkAdded(true);
    success();
  };

  const dismissBulkResult = () => {
    promptedOnCurrentResult.current = false;
    setBulkResults([]);
    setBulkSelections({});
    setBulkAdded(false);
    setBulkOverflowCount(0);
    setDetections([]);
    setSelectedBulkMinifigIds([]);
    setBulkMinifigQueue([]);
    setBulkMinifigResultQueue([]);
    setStatus("idle");
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
  const formatMoney = (value: number | null) =>
    value === null
      ? "N/A"
      : `$${value.toLocaleString(undefined, {
          minimumFractionDigits: value < 100 ? 2 : 0,
          maximumFractionDigits: value < 100 ? 2 : 0,
        })}`;
  const physicalMinifigQuantities = getPhysicalMinifigQuantities(detections);
  const bulkEntries = bulkResults.map((item) => {
    const key = getResultKey(item);
    const selection = bulkSelections[key] ?? { selected: true, condition: "new_sealed" as const };
    return {
      key,
      item,
      selection,
      quantity: physicalMinifigQuantities[item.set_number.toLowerCase()] ?? 1,
      snapshot: buildMarketSnapshot(item, selection.condition),
    };
  });
  const selectedBulkEntries = bulkEntries.filter((entry) => entry.selection.selected);
  const cameraEnabled = shouldRunCamera({
    enabled: status === "idle",
    screenFocused,
    appState,
  });
  const selectedPhysicalMinifigCount = selectedBulkEntries.reduce((total, entry) => total + entry.quantity, 0);
  const bulkTotalValue = selectedBulkEntries.reduce(
    (total, entry) => total + (entry.snapshot.price_usd ?? 0) * entry.quantity,
    0
  );
  const bulkOverlayDetections = detections
    .filter((detection) => detection.item_type === "minifig")
    .map((detection) => ({
      detection,
      result:
        bulkResults.find(
          (item) => item.item_type === "minifig" && item.set_number.toLowerCase() === detection.id.toLowerCase()
        ) ?? null,
    }));
  const updateBulkSelection = (key: string, updates: Partial<BulkSelectionState[string]>) => {
    setBulkSelections((current) => {
      const existing = current[key] ?? { selected: true, condition: "new_sealed" as const };
      return { ...current, [key]: { ...existing, ...updates } };
    });
    setBulkAdded(false);
  };

  return (
    <View style={s.root}>
      <CameraScanner
        enabled={cameraEnabled}
        autoCaptureEnabled={
          smartAutoScanEnabled &&
          status === "idle" &&
          scanIntent === "single" &&
          !singleAutoScanCoolingDown
        }
        scanIntent={scanIntent}
        onCapture={handleCapture}
        onPhotoPress={handlePhotoPress}
      />

      <View pointerEvents="box-none" style={[s.scanIntentHeader, { top: insets.top + 30 }]}>
        <ScanIntentPicker value={scanIntent} onChange={setScanIntent} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        style={[s.profileButton, { top: insets.top + 22 }]}
        onPress={() => router.push("/account")}
        hitSlop={12}
      >
        <SymbolView
          name={{ ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" }}
          size={25}
          type="hierarchical"
          tintColor="#F7F4EA"
          fallback={<Text style={s.profileFallback}>●</Text>}
        />
      </Pressable>

      {__DEV__ && status === "idle" && (
        <Pressable style={s.previewBtn} onPress={showPreviewResult}>
          <Text style={s.previewText}>Preview result</Text>
        </Pressable>
      )}

      {status === "loading" && capturedPhotoUri ? (
        <View style={s.processingOverlay}>
          <Image source={{ uri: capturedPhotoUri }} style={s.processingImage} resizeMode="cover" />
          <View style={s.processingScrim} />
          <View style={s.processingPill}>
            <ActivityIndicator size="small" color={activeColors.primary} />
            <View style={s.processingCopy}>
              <Text style={s.processingText}>
                {scanIntent === "bulk" ? "Scanning minifigures..." : loadingMsg}
              </Text>
              {scanIntent === "bulk" ? (
                <Text style={s.processingSubtext}>Finding matches and market values.</Text>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {status === "loading" && !capturedPhotoUri && <LegoLoaderNative message={loadingMsg} />}

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
              accessibilityLabel="Dismiss scan issue"
              style={s.errorPrimary}
              onPress={() => {
                setErrorMessage(null);
              }}
            >
              <Text style={s.errorPrimaryText}>Try again</Text>
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

      {status === "bulkResult" && bulkResults.length > 0 ? (
        <View style={s.bulkResultOverlay}>
          <View style={[s.bulkResultSheet, { paddingBottom: Math.max(22, insets.bottom + 12) }]}>
            <View style={s.bulkResultHeader}>
              <View>
                <Text style={s.bulkResultEyebrow}>Bulk minifig scan</Text>
                <Text style={s.bulkResultTitle}>
                  {bulkResults.length} minifig{bulkResults.length === 1 ? "" : "ures"} found
                </Text>
                <Text style={s.bulkResultSummary}>Estimated total {formatMoney(bulkTotalValue)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retake bulk minifig scan"
                onPress={dismissBulkResult}
                style={s.bulkCloseButton}
                hitSlop={8}
              >
                <Text style={s.bulkCloseText}>X</Text>
              </Pressable>
            </View>

            <View
              style={s.bulkPhotoFrame}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setPhotoLayout({ width, height });
              }}
            >
              {capturedPhotoUri ? (
                <Image source={{ uri: capturedPhotoUri }} style={s.bulkPhotoImage} resizeMode="cover" />
              ) : (
                <View style={s.bulkPhotoFallback}>
                  <Text style={s.bulkPhotoFallbackText}>Bulk scan preview</Text>
                </View>
              )}
              <View style={s.bulkValuePill}>
                <Text style={s.bulkValueText}>{formatMoney(bulkTotalValue)}</Text>
                <Text style={s.bulkValueMeta}>· {selectedPhysicalMinifigCount} selected</Text>
              </View>
              {photoLayout.width > 0 && bulkOverlayDetections.length > 0 ? (
                <DetectionOverlay
                  detections={bulkOverlayDetections}
                  imageWidth={photoLayout.width}
                  imageHeight={photoLayout.height}
                  resizeMode="cover"
                />
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.bulkChipTrack}
            >
              {bulkEntries.map(({ key, item, snapshot, selection, quantity }) => (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selection.selected }}
                  style={[s.bulkChip, !selection.selected && s.bulkChipOff]}
                  onPress={() => updateBulkSelection(key, { selected: !selection.selected })}
                >
                  <View style={[s.bulkChipImageWrap, !selection.selected && s.bulkChipImageWrapOff]}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={s.bulkChipImage} resizeMode="contain" />
                    ) : (
                      <View style={s.bulkChipImageFallback} />
                    )}
                    {selection.selected ? (
                      <View style={s.bulkChipCheck}>
                        <Text style={s.bulkChipCheckText}>✓</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.bulkChipPrice}>
                    {formatMoney(snapshot.price_usd)}{quantity > 1 ? ` ×${quantity}` : ""}
                  </Text>
                  <View style={s.bulkConditionToggle}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selection.condition === "new_sealed" }}
                      style={[s.bulkConditionOption, selection.condition === "new_sealed" && s.bulkConditionOptionActive]}
                      onPress={(event) => {
                        event.stopPropagation();
                        updateBulkSelection(key, { condition: "new_sealed", selected: true });
                      }}
                    >
                      <Text
                        style={[
                          s.bulkConditionText,
                          selection.condition === "new_sealed" && s.bulkConditionTextActive,
                        ]}
                      >
                        New
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selection.condition === "used" }}
                      style={[s.bulkConditionOption, selection.condition === "used" && s.bulkConditionOptionActive]}
                      onPress={(event) => {
                        event.stopPropagation();
                        updateBulkSelection(key, { condition: "used", selected: true });
                      }}
                    >
                      <Text
                        style={[
                          s.bulkConditionText,
                          selection.condition === "used" && s.bulkConditionTextActive,
                        ]}
                      >
                        Used
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={bulkAdded ? "Bulk minifigures added to collection" : `Add ${selectedPhysicalMinifigCount} minifigures to collection`}
              accessibilityState={{ disabled: selectedBulkEntries.length === 0 || bulkAdded }}
              style={[
                s.bulkPrimaryButton,
                selectedBulkEntries.length === 0 && s.bulkPrimaryButtonDisabled,
                bulkAdded && s.bulkPrimaryButtonAdded,
              ]}
              disabled={selectedBulkEntries.length === 0 || bulkAdded}
              onPress={() => {
                void handleAddBulkToCollection();
              }}
            >
              <Text style={[s.bulkPrimaryText, bulkAdded && s.bulkPrimaryTextAdded]}>
                {bulkAdded
                  ? "Added"
                  : selectedBulkEntries.length > 0
                    ? `Add ${selectedPhysicalMinifigCount} to Collection`
                    : "Select items to add"}
              </Text>
            </Pressable>

            {bulkOverflowCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Scan ${bulkOverflowCount} remaining minifigures`}
                style={s.bulkSecondaryButton}
                onPress={dismissBulkResult}
              >
                <Text style={s.bulkSecondaryText}>Scan remaining ({bulkOverflowCount})</Text>
                <Text style={s.bulkRemainingHint}>Move processed figures aside first</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retake bulk minifig scan"
              style={s.bulkSecondaryButton}
              onPress={dismissBulkResult}
            >
              <Text style={s.bulkSecondaryText}>Retake</Text>
            </Pressable>
          </View>
        </View>
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
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050605",
  },
  processingImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  processingScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  processingPill: {
    position: "absolute",
    minHeight: 76,
    maxWidth: 320,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(247,244,234,0.96)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  processingCopy: {
    flexShrink: 1,
    gap: 3,
  },
  processingText: {
    color: "#101012",
    fontSize: 15,
    fontWeight: "900",
  },
  processingSubtext: {
    color: "rgba(16,16,18,0.62)",
    fontSize: 12,
    fontWeight: "800",
  },
  scanIntentHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 12,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileButton: {
    position: "absolute",
    right: 22,
    zIndex: 13,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(16,16,18,0.74)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileFallback: {
    color: "#F7F4EA",
    fontSize: 20,
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
    backgroundColor: m.primary,
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
  bulkResultOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 34,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  bulkResultSheet: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 28,
    backgroundColor: "#070807",
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.12)",
  },
  bulkResultHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  bulkResultEyebrow: {
    color: "rgba(247,244,234,0.56)",
    fontSize: 12,
    fontWeight: "900",
  },
  bulkResultTitle: {
    color: "#F7F4EA",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
  },
  bulkResultSummary: {
    color: "rgba(247,244,234,0.62)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  bulkCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(247,244,234,0.16)",
    backgroundColor: "rgba(247,244,234,0.08)",
  },
  bulkCloseText: {
    color: "#F7F4EA",
    fontSize: 26,
    lineHeight: 29,
    fontWeight: "600",
  },
  bulkPhotoFrame: {
    height: 420,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#111411",
  },
  bulkPhotoImage: {
    width: "100%",
    height: "100%",
  },
  bulkPhotoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111411",
  },
  bulkPhotoFallbackText: {
    color: "rgba(247,244,234,0.62)",
    fontSize: 13,
    fontWeight: "800",
  },
  bulkValuePill: {
    position: "absolute",
    top: 18,
    alignSelf: "center",
    minHeight: 58,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(247,244,234,0.96)",
    gap: 8,
  },
  bulkValueText: {
    color: m.primary,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  bulkValueMeta: {
    color: "rgba(16,16,18,0.58)",
    fontSize: 18,
    fontWeight: "900",
  },
  bulkChipTrack: {
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  bulkChip: {
    width: 100,
    alignItems: "center",
    gap: 7,
  },
  bulkChipOff: {
    opacity: 0.52,
  },
  bulkChipImageWrap: {
    width: 74,
    height: 74,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: m.primary,
    backgroundColor: "#F7F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  bulkChipImageWrapOff: {
    borderColor: "rgba(247,244,234,0.22)",
  },
  bulkChipImage: {
    width: 58,
    height: 58,
  },
  bulkChipImageFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16,16,18,0.1)",
  },
  bulkChipCheck: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: m.primary,
    borderWidth: 2,
    borderColor: "#F7F4EA",
  },
  bulkChipCheckText: {
    color: "#101012",
    fontSize: 14,
    fontWeight: "900",
  },
  bulkChipPrice: {
    color: "#F7F4EA",
    fontSize: 13,
    fontWeight: "900",
  },
  bulkConditionToggle: {
    minHeight: 28,
    width: 96,
    borderRadius: 999,
    backgroundColor: "rgba(247,244,234,0.12)",
    flexDirection: "row",
    padding: 3,
  },
  bulkConditionOption: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  bulkConditionOptionActive: {
    backgroundColor: m.primary,
  },
  bulkConditionText: {
    color: "rgba(247,244,234,0.62)",
    fontSize: 10,
    fontWeight: "900",
  },
  bulkConditionTextActive: {
    color: "#101012",
  },
  bulkPrimaryButton: {
    minHeight: 66,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: m.primary,
  },
  bulkPrimaryButtonDisabled: {
    opacity: 0.42,
  },
  bulkPrimaryButtonAdded: {
    backgroundColor: "rgba(242,205,55,0.18)",
    borderWidth: 1,
    borderColor: "rgba(242,205,55,0.62)",
  },
  bulkPrimaryText: {
    color: "#101012",
    fontSize: 20,
    fontWeight: "900",
  },
  bulkPrimaryTextAdded: {
    color: m.primary,
  },
  bulkSecondaryButton: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,244,234,0.1)",
  },
  bulkSecondaryText: {
    color: "#F7F4EA",
    fontSize: 17,
    fontWeight: "900",
  },
  bulkRemainingHint: {
    color: m.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
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
    backgroundColor: m.primary,
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
