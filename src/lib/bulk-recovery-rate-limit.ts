import { createHash } from "node:crypto";

export const BULK_RECOVERY_RATE_LIMIT = {
  maxCalls: 20,
  windowSeconds: 10 * 60,
} as const;

export function bulkRecoveryRateLimitKey(token: string): string {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `bulk-recovery-token:${tokenHash}`;
}
