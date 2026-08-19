import assert from "node:assert/strict";
import test from "node:test";

import { issueBulkRecoveryToken, verifyBulkRecoveryToken } from "../src/lib/bulk-recovery-token";
import { issueBulkScanSession, verifyBulkScanSession } from "../src/lib/bulk-scan-session";

test("bulk recovery tokens are scoped to the user and expire", () => {
  const issuedAt = 1_700_000_000_000;
  const token = issueBulkRecoveryToken("user-1", issuedAt);

  assert.equal(verifyBulkRecoveryToken(token, "user-1", issuedAt + 60_000), true);
  assert.equal(verifyBulkRecoveryToken(token, "user-2", issuedAt + 60_000), false);
  assert.equal(verifyBulkRecoveryToken(token, "user-1", issuedAt + 601_000), false);
});

test("bulk recovery tokens reject tampering", () => {
  const token = issueBulkRecoveryToken(null, 1_700_000_000_000);
  const [payload] = token.split(".");

  assert.equal(verifyBulkRecoveryToken(`${payload}.tampered`, null, 1_700_000_001_000), false);
});

test("bulk scan sessions scope each region to the authenticated scan", () => {
  const issuedAt = Date.UTC(2026, 7, 19);
  const token = issueBulkScanSession(
    "user-1",
    "photoLibrary",
    [
      { regionId: "figure-1", boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 } },
      { regionId: "figure-2", boundingBox: { x: 0.5, y: 0.1, width: 0.2, height: 0.3 } },
    ],
    issuedAt,
  );

  assert.equal(verifyBulkScanSession(token, "user-1", "figure-1", issuedAt)?.scanSource, "photoLibrary");
  assert.equal(verifyBulkScanSession(token, "user-1", "other-figure", issuedAt), null);
  assert.equal(verifyBulkScanSession(token, "user-2", "figure-1", issuedAt), null);
  assert.equal(verifyBulkScanSession(token, "user-1", "figure-1", issuedAt + 11 * 60 * 1000), null);
});
