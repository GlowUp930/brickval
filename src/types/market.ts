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

// A single eBay sold (or active) listing
export interface EbaySale {
  title: string;
  price_usd: number; // always stored in USD
  sold_date: string; // ISO date string — real date for sold, today for active listings
  condition: string; // "New / Sealed" | "Used"
  item_url: string;
  marketplace?: string; // e.g. "EBAY_US", "EBAY_AU", "EBAY_GB", "EBAY_DE"
}

// eBay market data for a set (new + used sales)
export interface EbayMarketData {
  new_sales: EbaySale[];
  used_sales: EbaySale[];
  data_source: "sold" | "listing"; // "sold" = real transactions, "listing" = active asking prices
}

export interface ComputedPricing {
  // Source values
  rrp_usd: number | null;
  market_avg_eur: number | null;
  exchange_rate_eur_aud: number | null;
  exchange_rate_usd_aud: number | null;
  // Converted to AUD (legacy RapidAPI fields — kept for compatibility)
  rrp_aud: number | null;
  market_avg_aud: number | null;
  market_min_aud: number | null;
  market_new_aud: number | null;
  market_used_aud: number | null;
  market_new_qty: number | null;
  market_used_qty: number | null;
  // Derived
  gain_pct: number | null; // ((ebay_new_avg_usd - rrp_usd) / rrp_usd) * 100
  exchange_rate_stale: boolean;
  // eBay sold listings (primary market data source)
  ebay_new_sales: EbaySale[];
  ebay_used_sales: EbaySale[];
  ebay_new_avg_usd: number | null; // avg of shown new sales → hero price
  ebay_used_avg_usd: number | null; // avg of shown used sales
  data_source: "sold" | "listing"; // "sold" = real transactions, "listing" = active asking prices
  // BrickLink price guide data (last 6 months sold on BrickLink)
  bricklink_new_avg_usd: number | null;
  bricklink_new_min_usd: number | null;
  bricklink_new_max_usd: number | null;
  bricklink_new_qty: number | null;
  bricklink_used_avg_usd: number | null;
  bricklink_used_min_usd: number | null;
  bricklink_used_max_usd: number | null;
  bricklink_used_qty: number | null;
}
