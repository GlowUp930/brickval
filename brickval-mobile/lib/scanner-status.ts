export type AutoScanPreviewState = "scanning" | "holdSteady" | "processing" | "matchFound";

export function getScannerPillText({
  enabled,
  isSingleScan,
  cameraReady,
  isProcessing,
  pulse,
  showMoveCloser,
  previewState,
}: {
  enabled: boolean;
  isSingleScan: boolean;
  cameraReady: boolean;
  isProcessing: boolean;
  pulse: number;
  showMoveCloser: boolean;
  previewState?: AutoScanPreviewState;
}) {
  if (!isSingleScan) return isProcessing || !enabled ? "Counting value..." : "Frame bulk minifigs, then capture";
  if (previewState === "matchFound") return "Match found";
  if (!enabled || isProcessing) return "Checking photo...";
  if (!cameraReady) return "Starting camera...";
  if (pulse > 0.25) return "Hold steady";
  if (showMoveCloser) return "Move closer";
  return "Scanning...";
}
