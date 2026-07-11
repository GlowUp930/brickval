import assert from "node:assert/strict";
import test from "node:test";

import { getScanImageResize } from "../lib/scan-image";

test("large portrait scans are reduced below the upload and pixel limits", () => {
  assert.deepEqual(getScanImageResize(1170, 2532, 8_700_000), { width: null, height: 1024 });
});

test("small scans are uploaded without unnecessary recompression", () => {
  assert.equal(getScanImageResize(900, 900, 900_000), null);
});
