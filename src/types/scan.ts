export interface IdentifyResponse {
  set_number: string | null;
}

export interface LookupResponse {
  set: import("./brickset").BricksetSet;
  market: import("./market").MarketPrice | null;
  pricing: import("./market").ComputedPricing;
  scansUsed: number;
  isPro: boolean;
}

export interface LookupErrorResponse {
  error: string;
  message?: string;
  scansUsed?: number;
}
