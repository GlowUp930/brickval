// Raw shape returned by the RapidAPI bulk dataset
export interface RapidApiSetPrice {
  set_number: string;
  set_name: string;
  set_year: number;
  price_new: string; // EUR string, or "none"
  sold_sets_new: number;
  price_used: string; // EUR string, or "none"
  sold_sets_used: number;
}

// Parsed/normalised market price for a single set
export interface MarketPrice {
  price_new_eur: number | null;
  price_used_eur: number | null;
  sold_sets_new: number | null;
  sold_sets_used: number | null;
}

export interface ComputedPricing {
  // Source values
  rrp_usd: number | null;
  market_avg_eur: number | null;
  exchange_rate_eur_aud: number | null;
  exchange_rate_usd_aud: number | null;
  // Converted to AUD
  rrp_aud: number | null;
  market_avg_aud: number | null; // = market_new_aud (hero price)
  market_min_aud: number | null;
  // New/used split
  market_new_aud: number | null;
  market_used_aud: number | null;
  market_new_qty: number | null;
  market_used_qty: number | null;
  // Derived
  gain_pct: number | null; // ((market_new_aud - rrp_aud) / rrp_aud) * 100
  exchange_rate_stale: boolean;
}
