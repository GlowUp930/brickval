import assert from "node:assert/strict";
import test from "node:test";

import { parseBulkScanInput } from "../src/lib/bulk-scan-input";

function formDataFor(count: number, scanSource: "camera" | "photoLibrary" = "photoLibrary"): FormData {
  const formData = new FormData();
  formData.append("image", new File([Buffer.from("jpeg")], "scan.jpg", { type: "image/jpeg" }));
  formData.append("scanSource", scanSource);
  formData.append("regions", JSON.stringify(Array.from({ length: count }, (_, index) => ({
    regionId: `region-${index + 1}`,
    boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
  }))));
  return formData;
}

test("camera bulk scans accept sixty regions and reject sixty-one", () => {
  assert.equal(parseBulkScanInput(formDataFor(60, "camera")).ok, true);

  const result = parseBulkScanInput(formDataFor(61, "camera"));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "invalid_regions");
    assert.match(result.error.message, /60 figures/);
  }
});

test("photo-library bulk scans accept sixty regions", () => {
  const result = parseBulkScanInput(formDataFor(60));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.regions.length, 60);
});

test("photo-library bulk scans reject more than sixty regions", () => {
  const result = parseBulkScanInput(formDataFor(61));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "invalid_regions");
    assert.equal(result.error.regionCount, 61);
    assert.match(result.error.message, /60 figures/);
  }
});

test("bulk scans reject a missing image with a structured error", () => {
  const formData = formDataFor(1);
  formData.delete("image");

  const result = parseBulkScanInput(formData);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_image");
});
