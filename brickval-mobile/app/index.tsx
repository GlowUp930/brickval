import { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { TopBar } from "../components/TopBar";
import { CameraScanner } from "../components/CameraScanner";
import { ResultCard } from "../components/ResultCard";
import { LegoLoaderNative } from "../components/LegoLoaderNative";
import { ManualEntrySheet, type ManualEntryHandle } from "../components/ManualEntrySheet";
import { identifySet, lookupSet, type LookupResult } from "../lib/api";
import { warn } from "../lib/haptics";

/**
 * Native scan home screen — fullscreen camera, auto-capture on stability,
 * result slides up over the dimmed camera background. WebView is opened as
 * a modal route for /account, /upgrade, full /result/[setNumber], etc.
 */

type Status = "idle" | "loading" | "result";

export default function ScanHome() {
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMsg, setLoadingMsg] = useState("Reading set number...");
  const [result, setResult] = useState<LookupResult | null>(null);
  const manualRef = useRef<ManualEntryHandle>(null);

  const handleCapture = async (photoUri: string) => {
    setStatus("loading");
    setLoadingMsg("Reading set number...");
    try {
      const setNumber = await identifySet(photoUri);
      if (!setNumber) {
        warn();
        setStatus("idle");
        return;
      }
      setLoadingMsg("Fetching market prices...");
      const data = await lookupSet(setNumber);
      setResult(data);
      setStatus("result");
    } catch (e) {
      warn();
      setStatus("idle");
    }
  };

  const handleManualSubmit = async (setNumber: string) => {
    setStatus("loading");
    setLoadingMsg("Fetching market prices...");
    try {
      const data = await lookupSet(setNumber);
      setResult(data);
      setStatus("result");
    } catch (e) {
      warn();
      setStatus("idle");
    }
  };

  const dismissResult = () => {
    setResult(null);
    setStatus("idle");
  };

  const openWebView = (path: string) => {
    router.push({ pathname: "/webview-modal", params: { path } });
  };

  return (
    <View style={styles.root}>
      <CameraScanner
        enabled={status === "idle"}
        onCapture={handleCapture}
        onManualPress={() => manualRef.current?.open()}
      />

      <TopBar onAccountPress={() => openWebView("/account")} />

      {status === "loading" && <LegoLoaderNative message={loadingMsg} />}

      <ResultCard
        result={status === "result" ? result : null}
        onDismiss={dismissResult}
        onViewDetails={(setNumber) => openWebView(`/result/${setNumber}`)}
      />

      <ManualEntrySheet ref={manualRef} onSubmit={handleManualSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0d0f" },
});
