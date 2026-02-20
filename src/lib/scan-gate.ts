export interface ScanGateResult {
  allowed: boolean;
  scansUsed: number;
  isPro: boolean;
  paywallHit: boolean;
}

/**
 * MVP: No paywall. All scans are allowed.
 * Phase 2: Re-enable Stripe + Supabase scan counter.
 */
export async function checkAndIncrementScan(
  _userId: string
): Promise<ScanGateResult> {
  return {
    allowed: true,
    scansUsed: 0,
    isPro: false,
    paywallHit: false,
  };
}
