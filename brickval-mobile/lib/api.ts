import * as SecureStore from "expo-secure-store";

/**
 * Thin client for the Brickvalue.live REST API.
 * Auth: a Clerk-issued JWT stored in expo-secure-store as "auth_token".
 * The hosted /account page sends this token back into the native WebView after
 * the user signs in.
 */

export const API_BASE = "https://brickvalue.live";
const TOKEN_KEY = "auth_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST a captured photo to /api/identify and get back a set number.
 */
export type ScanMode = "set" | "minifig";

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
export async function lookupSet(setNumber: string, mode: ScanMode = "set"): Promise<LookupResult> {
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

export interface LookupResult {
  set_number: string;
  item_type: ScanMode;
  name: string;
  theme: string;
  pieces: number | null;
  image_url: string | null;
  market_history: MarketHistoryPoint[];
  pricing: {
    hero_new_avg_usd: number | null;
    hero_used_avg_usd: number | null;
    rrp_usd: number | null;
    gain_pct: number | null;
    bricklink_new_qty: number | null;
    data_source: "sold" | "listing" | null;
  };
}

export interface MarketHistoryPoint {
  date: string;
  price_usd: number;
  source: "bricklink" | "ebay";
}

interface MinifigLookupResponse {
  figInfo: {
    name: string;
    image_url: string | null;
    fig_number: string;
    year_released: number | null;
  };
  pricing: {
    used_sold_avg_usd: number | null;
    used_sold_qty: number | null;
    used_stock_avg_usd: number | null;
    used_stock_qty: number | null;
    new_sold_avg_usd: number | null;
    new_sold_qty: number | null;
    new_stock_avg_usd: number | null;
    new_stock_qty: number | null;
    sold_details?: BrickLinkDetail[];
    sold_new_details?: BrickLinkDetail[];
  };
}

interface BrickLinkDetail {
  price_usd: number;
  date?: string;
}

interface EbaySale {
  price_usd: number;
  sold_date?: string;
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

function normalizeSetResult(data: any): LookupResult {
  const setInfo = data.setInfo ?? data;
  return {
    set_number: setInfo.set_number ?? data.set_number,
    item_type: "set",
    name: setInfo.name ?? data.name ?? "Unknown LEGO set",
    theme: data.theme ?? "LEGO set",
    pieces: data.pieces ?? null,
    image_url: setInfo.image_url ?? data.image_url ?? null,
    market_history: getSetMarketHistory(data.pricing),
    pricing: {
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
    },
  };
}

function normalizeMinifigResult(data: MinifigLookupResponse): LookupResult {
  const newSoldAvg = data.pricing.new_sold_avg_usd;
  const usedSoldAvg = data.pricing.used_sold_avg_usd;
  const newStockAvg = data.pricing.new_stock_avg_usd;
  const usedStockAvg = data.pricing.used_stock_avg_usd;
  const soldQty = data.pricing.new_sold_qty ?? data.pricing.used_sold_qty;
  const stockQty = data.pricing.new_stock_qty ?? data.pricing.used_stock_qty;
  const heroNewAvg = newSoldAvg ?? newStockAvg ?? null;
  const heroUsedAvg = usedSoldAvg ?? usedStockAvg ?? null;
  const heroAvg = heroNewAvg ?? heroUsedAvg;
  return {
    set_number: data.figInfo.fig_number,
    item_type: "minifig",
    name: data.figInfo.name,
    theme: data.figInfo.year_released ? `Minifigure · ${data.figInfo.year_released}` : "Minifigure",
    pieces: null,
    image_url: data.figInfo.image_url,
    market_history: getMinifigMarketHistory(data.pricing),
    pricing: {
      hero_new_avg_usd: heroNewAvg,
      hero_used_avg_usd: heroUsedAvg,
      rrp_usd: null,
      gain_pct: null,
      bricklink_new_qty: soldQty ?? stockQty ?? null,
      data_source: heroAvg !== null ? (newSoldAvg !== null || usedSoldAvg !== null ? "sold" : "listing") : null,
    },
  };
}
