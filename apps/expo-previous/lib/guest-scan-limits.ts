import * as SecureStore from "expo-secure-store";
import { getAuthToken, INTERNAL_TESTING_UNLIMITED_SCANS } from "./api";

const GUEST_SCAN_LIMIT = 5;
const GUEST_SCAN_KEY = "guest_scan_lookups_used";
let fallbackGuestScansUsed = 0;

export type ScanAccessResult = { allowed: boolean; hasToken: boolean };

export async function getGuestScansUsed(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(GUEST_SCAN_KEY);
    const parsed = Number(raw ?? 0);
    fallbackGuestScansUsed = Number.isFinite(parsed) ? parsed : 0;
    return fallbackGuestScansUsed;
  } catch (error) {
    console.warn("Guest scan counter unavailable; using session fallback.", error);
    return fallbackGuestScansUsed;
  }
}

export async function setGuestScansUsed(nextScansUsed: number): Promise<number> {
  fallbackGuestScansUsed = nextScansUsed;
  try {
    await SecureStore.setItemAsync(GUEST_SCAN_KEY, String(nextScansUsed));
  } catch (error) {
    console.warn("Guest scan counter could not be saved; keeping session fallback.", error);
  }
  return nextScansUsed;
}

export async function prepareLookupAccess(): Promise<ScanAccessResult> {
  if (INTERNAL_TESTING_UNLIMITED_SCANS) {
    return { allowed: true, hasToken: false };
  }

  const token = await getAuthToken();
  if (token) {
    return { allowed: true, hasToken: true };
  }

  const guestScansUsed = await getGuestScansUsed();
  return { allowed: guestScansUsed < GUEST_SCAN_LIMIT, hasToken: false };
}

export function isGuestScanLimitReached(guestScansUsed: number): boolean {
  return guestScansUsed >= GUEST_SCAN_LIMIT;
}

export function getGuestScanLimit(): number {
  return GUEST_SCAN_LIMIT;
}

export { GUEST_SCAN_LIMIT };
