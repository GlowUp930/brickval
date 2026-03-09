// A single BrickLink sold transaction or active store listing row
export interface BrickLinkDetail {
  price_usd: number;
  quantity: number;
  date?: string;    // date_ordered — present on sold, absent on stock
  country?: string; // seller_country_code
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

// Set metadata derived from BrickLink item API (replaces Brickset)
export interface SetInfo {
  name: string;
  image_url: string | null;
  year_released: number | null;
  is_obsolete: boolean;
  set_number: string;
}

// Minifigure info (from BrickLink MINIFIG item API)
export interface MinifigInfo {
  name: string;
  image_url: string | null;
  fig_number: string;
  year_released: number | null;
}

// Minifigure pricing (used condition only — minifigs are priced loose)
export interface MinifigPricing {
  used_sold_avg_usd: number | null;
  used_sold_min_usd: number | null;
  used_sold_max_usd: number | null;
  used_sold_qty: number | null;
  used_stock_avg_usd: number | null;
  used_stock_qty: number | null;
  sold_details: BrickLinkDetail[];
  stock_details: BrickLinkDetail[];
}

export interface ComputedPricing {
  // RRP — currently null (was from Brickset). Kept for future Supabase-based RRP table.
  rrp_usd: number | null;
  gain_pct: number | null;
  exchange_rate_stale: boolean;
  // eBay sold listings
  ebay_new_sales: EbaySale[];
  ebay_used_sales: EbaySale[];
  ebay_new_avg_usd: number | null;
  ebay_used_avg_usd: number | null;
  data_source: "sold" | "listing";
  // BrickLink sold price guide (last 6 months sold on BrickLink)
  bricklink_new_avg_usd: number | null;
  bricklink_new_min_usd: number | null;
  bricklink_new_max_usd: number | null;
  bricklink_new_qty: number | null;
  bricklink_used_avg_usd: number | null;
  bricklink_used_min_usd: number | null;
  bricklink_used_max_usd: number | null;
  bricklink_used_qty: number | null;
  // BrickLink current stock (active BrickLink store listings)
  bricklink_stock_new_avg_usd: number | null;
  bricklink_stock_new_qty: number | null;
  bricklink_stock_used_avg_usd: number | null;
  bricklink_stock_used_qty: number | null;
  // BrickLink individual row data for display
  bricklink_sold_new_details: BrickLinkDetail[];
  bricklink_sold_used_details: BrickLinkDetail[];
  bricklink_stock_new_details: BrickLinkDetail[];
  bricklink_stock_used_details: BrickLinkDetail[];
}
