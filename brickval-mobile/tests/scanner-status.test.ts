import assert from "node:assert/strict";
import test from "node:test";

import { getScannerPillText } from "../lib/scanner-status";

const readySingleScan = {
  enabled: true,
  isSingleScan: true,
  cameraReady: true,
  isProcessing: false,
  pulse: 0,
  showMoveCloser: false,
};

test("scanner does not claim a match while a photo is still being checked", () => {
  assert.equal(
    getScannerPillText({ ...readySingleScan, enabled: false, isProcessing: true }),
    "Checking photo..."
  );
});

test("scanner only says match found after a confirmed match state", () => {
  assert.equal(
    getScannerPillText({ ...readySingleScan, previewState: "matchFound" }),
    "Match found"
  );
});
