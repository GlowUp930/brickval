import assert from "node:assert/strict";
import test from "node:test";

import {
  BULK_RECOVERY_RATE_LIMIT,
  BULK_SCAN_RATE_LIMIT,
  bulkRecoveryRateLimitKey,
  bulkScanRateLimitKey,
  bulkScanUsageKey,
} from "../src/lib/bulk-recovery-rate-limit";

test("bulk recovery allows ten figures plus one retry each", () => {
  assert.equal(BULK_RECOVERY_RATE_LIMIT.maxCalls, 20);
  assert.equal(BULK_RECOVERY_RATE_LIMIT.windowSeconds, 600);
});

test("per-region bulk sessions allow forty figures plus one retry each", () => {
  assert.equal(BULK_SCAN_RATE_LIMIT.maxCalls, 80);
  assert.equal(BULK_SCAN_RATE_LIMIT.windowSeconds, 600);
});

test("recovery rate-limit keys are scoped to the signed token without exposing it", () => {
  const token = "signed-recovery-token";
  const key = bulkRecoveryRateLimitKey(token);

  assert.match(key, /^bulk-recovery-token:[a-f0-9]{64}$/);
  assert.equal(key.includes(token), false);
  assert.notEqual(key, bulkRecoveryRateLimitKey("another-token"));
});

test("scan usage locks are separate from recognition rate limits", () => {
  assert.match(bulkScanRateLimitKey("signed-recovery-token"), /^bulk-scan-rate:[a-f0-9]{64}$/);
  assert.match(bulkScanUsageKey("signed-recovery-token"), /^bulk-scan-usage:[a-f0-9]{64}$/);
  assert.notEqual(bulkScanRateLimitKey("signed-recovery-token"), bulkRecoveryRateLimitKey("signed-recovery-token"));
  assert.notEqual(bulkScanUsageKey("signed-recovery-token"), bulkRecoveryRateLimitKey("signed-recovery-token"));
});
