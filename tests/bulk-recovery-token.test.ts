import assert from "node:assert/strict";
import test from "node:test";

import { issueBulkRecoveryToken, verifyBulkRecoveryToken } from "../src/lib/bulk-recovery-token";

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
