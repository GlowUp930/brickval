export interface IdentifyResponse {
  set_number: string | null;
}

export interface LookupResponse {
  setInfo: import("./market").SetInfo | null;
  pricing: import("./market").ComputedPricing;
  scansUsed: number;
  isPro: boolean;
}

export interface LookupErrorResponse {
  error: string;
  message?: string;
  scansUsed?: number;
}
