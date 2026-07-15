import assert from "node:assert/strict";
import test from "node:test";

import {
  getDetectionSamplePlan,
  getDetectionSampleResize,
  getScanImageResize,
  mapDetectionSampleBoundingBox,
} from "../lib/scan-image";

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

test("single detector samples crop a portrait camera frame to a centered square", () => {
  assert.deepEqual(getDetectionSamplePlan(1170, 2532, "single"), {
    sourceWidth: 1170,
    sourceHeight: 2532,
    crop: { originX: 0, originY: 681, width: 1170, height: 1170 },
    resize: { width: 416, height: 416 },
  });
});

test("bulk detector samples preserve the complete camera frame", () => {
  assert.deepEqual(getDetectionSamplePlan(1170, 2532, "bulk"), {
    sourceWidth: 1170,
    sourceHeight: 2532,
    crop: null,
    resize: { width: null, height: 416 },
  });
});

test("detector boxes from a center crop map back to full-frame coordinates", () => {
  const plan = getDetectionSamplePlan(1170, 2532, "single");
  assert.deepEqual(
    mapDetectionSampleBoundingBox({ x: 0.25, y: 0.2, width: 0.5, height: 0.6 }, plan),
    { x: 0.25, y: 0.3614, width: 0.5, height: 0.2773 }
  );
});
