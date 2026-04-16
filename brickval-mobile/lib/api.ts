import { getClerkAuthToken } from "./clerk";

/**
 * Thin client for the Brickvalue.live REST API.
 * Auth: a Clerk-issued JWT fetched directly from the native Clerk session.
 */

export const API_BASE = "https://brickvalue.live";

export async function getAuthToken(): Promise<string | null> {
  return getClerkAuthToken();
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST a captured photo to /api/identify and get back a set number.
 */
export type ScanMode = "set" | "minifig";
export type LookupDataSource = "sold" | "listing" | null;

export interface IdentificationCandidate {
  id: string;
  score: number;
}

export interface IdentificationResult {
  set_number: string | null;
  confidence: number | null;
  candidates: IdentificationCandidate[];
}

export async function identifySet(photoUri: string, mode: ScanMode = "set"): Promise<IdentificationResult> {
  const form = new FormData();
  form.append("image", {
    uri: photoUri,
    name: "scan.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/api/identify?mode=${mode}`, {
    method: "POST",
    headers: { ...(await authHeader()) },
    body: form,
  });

  if (!res.ok) throw new Error(`identify failed: ${res.status}`);
  const data = (await res.json()) as {
    set_number: string | null;
    confidence?: number | null;
    candidates?: IdentificationCandidate[];
  };
  return {
    set_number: data.set_number ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : null,
    candidates: (data.candidates ?? []).slice(0, 4),
  };
}

/**
 * Look up market data for a set number. Returns the same shape the web
 * /result page consumes (ComputedPricing).
 */
export async function lookupSet(setNumber: string, mode: ScanMode = "set"): Promise<LookupDetailResult> {
  const res = await fetch(`${API_BASE}/api/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ setNumber, mode }),
  });

  if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
  const data = await res.json();
  return mode === "minifig" ? normalizeMinifigResult(data) : normalizeSetResult(data);
}

export interface LookupSummaryPricing {
  hero_new_avg_usd: number | null;
  hero_used_avg_usd: number | null;
  rrp_usd: number | null;
  gain_pct: number | null;
  bricklink_new_qty: number | null;
  data_source: LookupDataSource;
}

export interface LookupSummaryResult {
  set_number: string;
  item_type: ScanMode;
  name: string;
  theme: string;
  pieces: number | null;
  image_url: string | null;
  market_history: MarketHistoryPoint[];
  pricing: LookupSummaryPricing;
}

export interface MarketHistoryPoint {
  date: string;
  price_usd: number;
  source: "bricklink" | "ebay";
}

export interface BrickLinkDetail {
  price_usd: number;
  quantity: number;
  date?: string;
  country?: string;
}

export interface EbaySale {
  title: string;
  price_usd: number;
  sold_date: string;
  condition: string;
  item_url: string;
  marketplace?: string;
}

export interface SetDetailPricing extends LookupSummaryPricing {
  exchange_rate_stale: boolean;
  ebay_new_sales: EbaySale[];
  ebay_used_sales: EbaySale[];
  ebay_new_avg_usd: number | null;
  ebay_used_avg_usd: number | null;
  bricklink_new_avg_usd: number | null;
  bricklink_new_min_usd: number | null;
  bricklink_new_max_usd: number | null;
  bricklink_used_avg_usd: number | null;
  bricklink_used_min_usd: number | null;
  bricklink_used_max_usd: number | null;
  bricklink_used_qty: number | null;
  bricklink_stock_new_avg_usd: number | null;
  bricklink_stock_new_qty: number | null;
  bricklink_stock_used_avg_usd: number | null;
  bricklink_stock_used_qty: number | null;
  bricklink_sold_new_details: BrickLinkDetail[];
  bricklink_sold_used_details: BrickLinkDetail[];
  bricklink_stock_new_details: BrickLinkDetail[];
  bricklink_stock_used_details: BrickLinkDetail[];
}

export interface SetLookupDetailResult extends Omit<LookupSummaryResult, "item_type" | "pricing"> {
  item_type: "set";
  set_info: {
    year_released: number | null;
    is_obsolete: boolean;
  };
  pricing: SetDetailPricing;
}

export interface MinifigDetailPricing extends LookupSummaryPricing {
  used_sold_avg_usd: number | null;
  used_sold_min_usd: number | null;
  used_sold_max_usd: number | null;
  used_sold_qty: number | null;
  used_stock_avg_usd: number | null;
  used_stock_qty: number | null;
  new_sold_avg_usd: number | null;
  new_sold_min_usd: number | null;
  new_sold_max_usd: number | null;
  new_sold_qty: number | null;
  new_stock_avg_usd: number | null;
  new_stock_qty: number | null;
  sold_details: BrickLinkDetail[];
  stock_details: BrickLinkDetail[];
  sold_new_details: BrickLinkDetail[];
  stock_new_details: BrickLinkDetail[];
}

export interface MinifigLookupDetailResult extends Omit<LookupSummaryResult, "item_type" | "pricing"> {
  item_type: "minifig";
  fig_info: {
    fig_number: string;
    year_released: number | null;
  };
  pricing: MinifigDetailPricing;
}

export type LookupDetailResult = SetLookupDetailResult | MinifigLookupDetailResult;

interface MinifigLookupResponse {
  figInfo: {
    name: string;
    image_url: string | null;
    fig_number: string;
    year_released: number | null;
  };
  pricing: {
    used_sold_avg_usd: number | null;
    used_sold_min_usd?: number | null;
    used_sold_max_usd?: number | null;
    used_sold_qty: number | null;
    used_stock_avg_usd: number | null;
    used_stock_qty: number | null;
    new_sold_avg_usd: number | null;
    new_sold_min_usd?: number | null;
    new_sold_max_usd?: number | null;
    new_sold_qty: number | null;
    new_stock_avg_usd: number | null;
    new_stock_qty: number | null;
    sold_details?: BrickLinkDetail[];
    stock_details?: BrickLinkDetail[];
    sold_new_details?: BrickLinkDetail[];
    stock_new_details?: BrickLinkDetail[];
  };
}

function cleanHistory(points: MarketHistoryPoint[]): MarketHistoryPoint[] {
  return points
    .filter((point) => point.date && Number.isFinite(point.price_usd) && point.price_usd > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-120);
}

function getSetMarketHistory(pricing: any): MarketHistoryPoint[] {
  const bricklinkRows: BrickLinkDetail[] = [
    ...(pricing?.bricklink_sold_new_details ?? []),
    ...(pricing?.bricklink_sold_used_details ?? []),
  ];
  const ebayRows: EbaySale[] = [
    ...(pricing?.ebay_new_sales ?? []),
    ...(pricing?.ebay_used_sales ?? []),
  ];
  return cleanHistory([
    ...bricklinkRows.map((row) => ({
      date: row.date ?? "",
      price_usd: row.price_usd,
      source: "bricklink" as const,
    })),
    ...ebayRows.map((row) => ({
      date: row.sold_date ?? "",
      price_usd: row.price_usd,
      source: "ebay" as const,
    })),
  ]);
}

function getMinifigMarketHistory(pricing: MinifigLookupResponse["pricing"]): MarketHistoryPoint[] {
  const rows: BrickLinkDetail[] = [
    ...(pricing.sold_new_details ?? []),
    ...(pricing.sold_details ?? []),
  ];
  return cleanHistory(rows.map((row) => ({
    date: row.date ?? "",
    price_usd: row.price_usd,
    source: "bricklink",
  })));
}

function normalizeSetResult(data: any): SetLookupDetailResult {
  const setInfo = data.setInfo ?? data;
  const summaryPricing: LookupSummaryPricing = {
    hero_new_avg_usd:
      data.pricing?.hero_new_avg_usd ??
      data.pricing?.bricklink_new_avg_usd ??
      data.pricing?.ebay_new_avg_usd ??
      data.pricing?.bricklink_stock_new_avg_usd ??
      null,
    hero_used_avg_usd:
      data.pricing?.bricklink_used_avg_usd ??
      data.pricing?.ebay_used_avg_usd ??
      data.pricing?.bricklink_stock_used_avg_usd ??
      null,
    rrp_usd: data.pricing?.rrp_usd ?? null,
    gain_pct: data.pricing?.gain_pct ?? null,
    bricklink_new_qty:
      data.pricing?.bricklink_new_qty ??
      data.pricing?.bricklink_stock_new_qty ??
      null,
    data_source: data.pricing?.data_source ?? null,
  };
  return {
    set_number: setInfo.set_number ?? data.set_number,
    item_type: "set",
    name: setInfo.name ?? data.name ?? "Unknown LEGO set",
    theme: data.theme ?? "LEGO set",
    pieces: data.pieces ?? null,
    image_url: setInfo.image_url ?? data.image_url ?? null,
    market_history: getSetMarketHistory(data.pricing),
    set_info: {
      year_released: setInfo.year_released ?? null,
      is_obsolete: Boolean(setInfo.is_obsolete),
    },
    pricing: {
      ...summaryPricing,
      exchange_rate_stale: Boolean(data.pricing?.exchange_rate_stale),
      ebay_new_sales: data.pricing?.ebay_new_sales ?? [],
      ebay_used_sales: data.pricing?.ebay_used_sales ?? [],
      ebay_new_avg_usd: data.pricing?.ebay_new_avg_usd ?? null,
      ebay_used_avg_usd: data.pricing?.ebay_used_avg_usd ?? null,
      bricklink_new_avg_usd: data.pricing?.bricklink_new_avg_usd ?? null,
      bricklink_new_min_usd: data.pricing?.bricklink_new_min_usd ?? null,
      bricklink_new_max_usd: data.pricing?.bricklink_new_max_usd ?? null,
      bricklink_used_avg_usd: data.pricing?.bricklink_used_avg_usd ?? null,
      bricklink_used_min_usd: data.pricing?.bricklink_used_min_usd ?? null,
      bricklink_used_max_usd: data.pricing?.bricklink_used_max_usd ?? null,
      bricklink_used_qty: data.pricing?.bricklink_used_qty ?? null,
      bricklink_stock_new_avg_usd: data.pricing?.bricklink_stock_new_avg_usd ?? null,
      bricklink_stock_new_qty: data.pricing?.bricklink_stock_new_qty ?? null,
      bricklink_stock_used_avg_usd: data.pricing?.bricklink_stock_used_avg_usd ?? null,
      bricklink_stock_used_qty: data.pricing?.bricklink_stock_used_qty ?? null,
      bricklink_sold_new_details: data.pricing?.bricklink_sold_new_details ?? [],
      bricklink_sold_used_details: data.pricing?.bricklink_sold_used_details ?? [],
      bricklink_stock_new_details: data.pricing?.bricklink_stock_new_details ?? [],
      bricklink_stock_used_details: data.pricing?.bricklink_stock_used_details ?? [],
    },
  };
}

function normalizeMinifigResult(data: MinifigLookupResponse): MinifigLookupDetailResult {
  const soldAverage = data.pricing.new_sold_avg_usd ?? data.pricing.used_sold_avg_usd;
  const stockAverage = data.pricing.new_stock_avg_usd ?? data.pricing.used_stock_avg_usd;
  const soldQty = data.pricing.new_sold_qty ?? data.pricing.used_sold_qty;
  const stockQty = data.pricing.new_stock_qty ?? data.pricing.used_stock_qty;
  const summaryPricing: LookupSummaryPricing = {
    hero_new_avg_usd: soldAverage ?? stockAverage ?? null,
    hero_used_avg_usd: data.pricing.used_sold_avg_usd ?? data.pricing.used_stock_avg_usd ?? null,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: soldQty ?? stockQty ?? null,
    data_source:
      soldAverage !== null && soldAverage !== undefined
        ? "sold"
        : stockAverage !== null && stockAverage !== undefined
          ? "listing"
          : null,
  };
  return {
    set_number: data.figInfo.fig_number,
    item_type: "minifig",
    name: data.figInfo.name,
    theme: data.figInfo.year_released ? `Minifigure · ${data.figInfo.year_released}` : "Minifigure",
    pieces: null,
    image_url: data.figInfo.image_url,
    market_history: getMinifigMarketHistory(data.pricing),
    fig_info: {
      fig_number: data.figInfo.fig_number,
      year_released: data.figInfo.year_released,
    },
    pricing: {
      ...summaryPricing,
      used_sold_avg_usd: data.pricing.used_sold_avg_usd,
      used_sold_min_usd: data.pricing.used_sold_min_usd ?? null,
      used_sold_max_usd: data.pricing.used_sold_max_usd ?? null,
      used_sold_qty: data.pricing.used_sold_qty,
      used_stock_avg_usd: data.pricing.used_stock_avg_usd,
      used_stock_qty: data.pricing.used_stock_qty,
      new_sold_avg_usd: data.pricing.new_sold_avg_usd,
      new_sold_min_usd: data.pricing.new_sold_min_usd ?? null,
      new_sold_max_usd: data.pricing.new_sold_max_usd ?? null,
      new_sold_qty: data.pricing.new_sold_qty,
      new_stock_avg_usd: data.pricing.new_stock_avg_usd,
      new_stock_qty: data.pricing.new_stock_qty,
      sold_details: data.pricing.sold_details ?? [],
      stock_details: data.pricing.stock_details ?? [],
      sold_new_details: data.pricing.sold_new_details ?? [],
      stock_new_details: data.pricing.stock_new_details ?? [],
    },
  };
}
