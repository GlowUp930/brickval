import type { LookupDetailResult } from "./api";

let latestLookupResult: LookupDetailResult | null = null;

export function setLatestLookupResult(result: LookupDetailResult | null) {
  latestLookupResult = result;
}

export function getLatestLookupResult(): LookupDetailResult | null {
  return latestLookupResult;
}
