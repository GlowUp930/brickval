export interface MarketPrice {
  avg_price: number | null; // EUR
  min_price: number | null; // EUR
  max_price: number | null; // EUR
  qty_listed: number | null;
  currency: "EUR";
}

export interface ComputedPricing {
  // Source values
  rrp_usd: number | null;
  market_avg_eur: number | null;
  exchange_rate_eur_aud: number | null;
  exchange_rate_usd_aud: number | null;
  // Converted to AUD
  rrp_aud: number | null;
  market_avg_aud: number | null;
  market_min_aud: number | null;
  // Derived
  gain_pct: number | null; // ((market_avg_aud - rrp_aud) / rrp_aud) * 100
  exchange_rate_stale: boolean;
}
