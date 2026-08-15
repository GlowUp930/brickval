import assert from "node:assert/strict";
import test from "node:test";

import {
  BULK_RECOVERY_RATE_LIMIT,
  bulkRecoveryRateLimitKey,
} from "../src/lib/bulk-recovery-rate-limit";

test("bulk recovery allows ten figures plus one retry each", () => {
  assert.equal(BULK_RECOVERY_RATE_LIMIT.maxCalls, 20);
  assert.equal(BULK_RECOVERY_RATE_LIMIT.windowSeconds, 600);
});

test("recovery rate-limit keys are scoped to the signed token without exposing it", () => {
  const token = "signed-recovery-token";
  const key = bulkRecoveryRateLimitKey(token);

  assert.match(key, /^bulk-recovery-token:[a-f0-9]{64}$/);
  assert.equal(key.includes(token), false);
  assert.notEqual(key, bulkRecoveryRateLimitKey("another-token"));
});
