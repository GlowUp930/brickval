import assert from "node:assert/strict";
import test from "node:test";

import { getDetectionSampleResize, getScanImageResize } from "../lib/scan-image";

test("large portrait scans are reduced below the upload and pixel limits", () => {
  assert.deepEqual(getScanImageResize(1170, 2532, 8_700_000), { width: null, height: 1024 });
});

test("small scans are uploaded without unnecessary recompression", () => {
  assert.equal(getScanImageResize(900, 900, 900_000), null);
});

test("hosted detector samples use a 416px long edge", () => {
  assert.deepEqual(getDetectionSampleResize(3024, 4032), { width: null, height: 416 });
  assert.deepEqual(getDetectionSampleResize(4032, 3024), { width: 416, height: null });
});
