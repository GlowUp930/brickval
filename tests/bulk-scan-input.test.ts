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

test("camera bulk scans accept more than ten regions", () => {
  assert.equal(parseBulkScanInput(formDataFor(10, "camera")).ok, true);
  assert.equal(parseBulkScanInput(formDataFor(60, "camera")).ok, true);
});

test("photo-library bulk scans accept eleven and forty regions", () => {
  assert.equal(parseBulkScanInput(formDataFor(11)).ok, true);
  const result = parseBulkScanInput(formDataFor(40));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.regions.length, 40);
});

test("photo-library bulk scans accept more than forty regions", () => {
  const result = parseBulkScanInput(formDataFor(60));
  assert.equal(result.ok, true);
});

test("bulk scans reject a missing image with a structured error", () => {
  const formData = formDataFor(1);
  formData.delete("image");

  const result = parseBulkScanInput(formData);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_image");
});
