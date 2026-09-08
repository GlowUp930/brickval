import { createHash } from "node:crypto";

export const BULK_RECOVERY_RATE_LIMIT = {
  maxCalls: 20,
  windowSeconds: 10 * 60,
} as const;

// Dense photo sessions can contain sixty regions and may spend one retry on
// each weak crop. Keep this budget separate from manual recovery's ten-figure
// limit so the two flows cannot change each other's allowance.
export const BULK_SCAN_RATE_LIMIT = {
  maxCalls: 120,
  windowSeconds: 10 * 60,
} as const;

export function bulkRecoveryRateLimitKey(token: string): string {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `bulk-recovery-token:${tokenHash}`;
}

export function bulkScanRateLimitKey(token: string): string {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `bulk-scan-rate:${tokenHash}`;
}

export function bulkScanUsageKey(token: string): string {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `bulk-scan-usage:${tokenHash}`;
}
