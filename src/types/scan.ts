export interface IdentifyCandidate {
  id: string;
  confidence: number;
}

export interface IdentifyResponse {
  set_number: string | null;
  confidence: number;
  needs_confirmation: boolean;
  candidates: IdentifyCandidate[];
}

export interface CandidatePreview {
  id: string;
  name: string | null;
  image_url: string | null;
  year_released: number | null;
  is_obsolete: boolean | null; // null for minifigs
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
