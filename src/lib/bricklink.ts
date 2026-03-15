import crypto from "crypto";
import { getCached, setCached } from "./cache";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrickLinkPriceGuide {
  item: { no: string; type: string };
  new_or_used: "N" | "U";
  currency_code: string;
  min_price: string;
  max_price: string;
  avg_price: string;
  qty_avg_price: string;
  unit_quantity: number;
  total_quantity: number;
  price_detail: BrickLinkPriceDetail[];
}

export interface BrickLinkPriceDetail {
  quantity: number;
  unit_price: string;
  seller_country_code?: string;
  buyer_country_code?: string;
  date_ordered?: string;
  shipping_available?: boolean;
}

export interface BrickLinkItem {
  no: string;
  name: string;
  type: string;
  image_url: string;
  thumbnail_url: string;
  weight: string;
  dim_x: string;
  dim_y: string;
  dim_z: string;
  year_released: number;
  is_obsolete: boolean;
  categoryID: number;
}

/** Combined price data we expose to the rest of the app */
export interface BrickLinkMarketData {
  sold_new: BrickLinkPriceGuide | null;
  sold_used: BrickLinkPriceGuide | null;
  stock_new: BrickLinkPriceGuide | null;
  stock_used: BrickLinkPriceGuide | null;
  item: BrickLinkItem | null;
}

/** Minifigure market data — used condition only (minifigs are priced loose/used) */
export interface MinifigMarketData {
  sold_used: BrickLinkPriceGuide | null;
  stock_used: BrickLinkPriceGuide | null;
  sold_new: BrickLinkPriceGuide | null;
  stock_new: BrickLinkPriceGuide | null;
  item: BrickLinkItem | null;
}

// ── Config ───────────────────────────────────────────────────────────────────

const API_BASE = "https://api.bricklink.com/api/store/v1";
const CACHE_TTL_HOURS = 24;

function getCredentials() {
  const consumerKey = process.env.BRICKLINK_CONSUMER_KEY;
  const consumerSecret = process.env.BRICKLINK_CONSUMER_SECRET;
  const tokenValue = process.env.BRICKLINK_TOKEN_VALUE;
  const tokenSecret = process.env.BRICKLINK_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !tokenValue || !tokenSecret) {
    throw new Error(
      "[bricklink] Missing env vars: BRICKLINK_CONSUMER_KEY, BRICKLINK_CONSUMER_SECRET, BRICKLINK_TOKEN_VALUE, BRICKLINK_TOKEN_SECRET"
    );
  }

  return { consumerKey, consumerSecret, tokenValue, tokenSecret };
}

// ── OAuth 1.0 Signing ────────────────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildAuthHeader(method: string, url: string): string {
  const { consumerKey, consumerSecret, tokenValue, tokenSecret } =
    getCredentials();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  // Parse URL to separate base URL and query params
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  // Collect all params: OAuth + query string
  const params: [string, string][] = [
    ["oauth_consumer_key", consumerKey],
    ["oauth_nonce", nonce],
    ["oauth_signature_method", "HMAC-SHA1"],
    ["oauth_timestamp", timestamp],
    ["oauth_token", tokenValue],
    ["oauth_version", "1.0"],
  ];

  // Add query string params
  urlObj.searchParams.forEach((value, key) => {
    params.push([key, value]);
  });

  // Sort params alphabetically by key, then by value
  params.sort((a, b) => {
    if (a[0] === b[0]) return a[1].localeCompare(b[1]);
    return a[0].localeCompare(b[0]);
  });

  // Build parameter string
  const paramString = params
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join("&");

  // Build signature base string
  const signatureBase = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(paramString)}`;

  // Sign with HMAC-SHA1
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  // Build Authorization header
  return [
    `OAuth oauth_consumer_key="${percentEncode(consumerKey)}"`,
    `oauth_nonce="${percentEncode(nonce)}"`,
    `oauth_signature="${percentEncode(signature)}"`,
    `oauth_signature_method="HMAC-SHA1"`,
    `oauth_timestamp="${timestamp}"`,
    `oauth_token="${percentEncode(tokenValue)}"`,
    `oauth_version="1.0"`,
  ].join(", ");
}

// ── API Fetch ────────────────────────────────────────────────────────────────

async function brickLinkFetch<T>(path: string): Promise<T | null> {
  const url = `${API_BASE}${path}`;
  const authHeader = buildAuthHeader("GET", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    } as RequestInit);

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[bricklink] ${res.status} for ${path}: ${text}`);
      return null;
    }

    const json = await res.json();

    // BrickLink wraps response in { meta: {...}, data: {...} }
    if (json.data !== undefined) {
      return json.data as T;
    }
    return json as T;
  } catch (err) {
    console.error(`[bricklink] Fetch error for ${path}:`, err);
    return null;
  }
}

// ── Price Guide ──────────────────────────────────────────────────────────────

/**
 * Fetch price guide for a LEGO set.
 * BrickLink set numbers use "-1" suffix (e.g., "75192-1").
 */
async function fetchPriceGuide(
  setNo: string,
  guideType: "sold" | "stock",
  newOrUsed: "N" | "U"
): Promise<BrickLinkPriceGuide | null> {
  const path =
    `/items/SET/${setNo}/price` +
    `?guide_type=${guideType}` +
    `&new_or_used=${newOrUsed}` +
    `&currency_code=USD`;

  return brickLinkFetch<BrickLinkPriceGuide>(path);
}

// ── Get Item ─────────────────────────────────────────────────────────────────

async function fetchItem(setNo: string): Promise<BrickLinkItem | null> {
  return brickLinkFetch<BrickLinkItem>(`/items/SET/${setNo}`);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch price guide for a LEGO minifigure.
 * BrickLink minifig IDs use alphanumeric codes (e.g. "sw0001", "col001").
 */
async function fetchMinifigPriceGuide(
  figNo: string,
  guideType: "sold" | "stock",
  newOrUsed: "N" | "U"
): Promise<BrickLinkPriceGuide | null> {
  const path =
    `/items/MINIFIG/${figNo}/price` +
    `?guide_type=${guideType}` +
    `&new_or_used=${newOrUsed}` +
    `&currency_code=USD`;

  return brickLinkFetch<BrickLinkPriceGuide>(path);
}

async function fetchMinifigItem(figNo: string): Promise<BrickLinkItem | null> {
  return brickLinkFetch<BrickLinkItem>(`/items/MINIFIG/${figNo}`);
}

/**
 * Build ID variants to try against BrickLink.
 * Brickognize may pad numeric parts differently (e.g. sh0047 vs sh047).
 * Returns [original, stripped-one-zero] if stripping is applicable.
 */
function figIdVariants(figNo: string): string[] {
  const match = figNo.match(/^([a-z]+)(0\d+)$/);
  if (match) {
    const stripped = match[1] + match[2].slice(1); // remove one leading zero
    if (stripped !== figNo) return [figNo, stripped];
  }
  return [figNo];
}

/**
 * Get BrickLink market data for a LEGO minifigure.
 * Returns used sold + used stock prices and item info.
 * Cached under "bricklink-minifig:{figNo}" for 24 hours.
 * Tries ID variants (e.g. sh0047 → sh047) if the primary ID returns no data.
 */
export async function getMinifigMarketData(figNo: string): Promise<MinifigMarketData> {
  const variants = figIdVariants(figNo);
  console.log(`[bricklink] getMinifigMarketData figNo=${figNo} variants=${JSON.stringify(variants)}`);

  for (const id of variants) {
    const cacheKey = `bricklink-minifig:${id}`;
    const cached = await getCached<MinifigMarketData>(cacheKey);
    if (cached) {
      console.log(`[bricklink] cache hit for ${id}`);
      return cached;
    }

    console.log(`[bricklink] calling BrickLink API for MINIFIG/${id}`);
    const [soldUsed, stockUsed, soldNew, stockNew, item] = await Promise.all([
      fetchMinifigPriceGuide(id, "sold", "U"),
      fetchMinifigPriceGuide(id, "stock", "U"),
      fetchMinifigPriceGuide(id, "sold", "N"),
      fetchMinifigPriceGuide(id, "stock", "N"),
      fetchMinifigItem(id),
    ]);

    console.log(`[bricklink] results for ${id}: soldUsed=${!!soldUsed} stockUsed=${!!stockUsed} soldNew=${!!soldNew} stockNew=${!!stockNew} item=${!!item}`);

    if (soldUsed || stockUsed || soldNew || stockNew || item) {
      const result: MinifigMarketData = { sold_used: soldUsed, stock_used: stockUsed, sold_new: soldNew, stock_new: stockNew, item };
      await setCached(cacheKey, result, CACHE_TTL_HOURS);
      console.log(`[bricklink] cached result under ${cacheKey}`);
      return result;
    }
  }

  console.log(`[bricklink] no data found for any variant of ${figNo}`);
  return { sold_used: null, stock_used: null, sold_new: null, stock_new: null, item: null };
}

/**
 * Get full BrickLink market data for a LEGO set.
 * Tries "XXXXX-1" suffix first (standard BrickLink format),
 * then falls back to raw number if that fails.
 *
 * Returns sold + stock prices for new and used conditions,
 * plus basic item info.
 */
export async function getBrickLinkMarketData(
  setNumber: string
): Promise<BrickLinkMarketData> {
  const cacheKey = `bricklink:${setNumber}`;
  const cached = await getCached<BrickLinkMarketData>(cacheKey);
  if (cached) return cached;

  // BrickLink uses "-1" suffix for sets (e.g., "75192-1")
  const setNo = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  // Fetch all 4 price guides + item info in parallel
  const [soldNew, soldUsed, stockNew, stockUsed, item] =
    await Promise.all([
      fetchPriceGuide(setNo, "sold", "N"),
      fetchPriceGuide(setNo, "sold", "U"),
      fetchPriceGuide(setNo, "stock", "N"),
      fetchPriceGuide(setNo, "stock", "U"),
      fetchItem(setNo),
    ]);

  // If all price guides failed, try without "-1" suffix
  if (!soldNew && !soldUsed && !stockNew && !stockUsed) {
    const [sn2, su2, skn2, sku2, item2] = await Promise.all([
      fetchPriceGuide(setNumber, "sold", "N"),
      fetchPriceGuide(setNumber, "sold", "U"),
      fetchPriceGuide(setNumber, "stock", "N"),
      fetchPriceGuide(setNumber, "stock", "U"),
      fetchItem(setNumber),
    ]);

    const fallback: BrickLinkMarketData = {
      sold_new: sn2,
      sold_used: su2,
      stock_new: skn2,
      stock_used: sku2,
      item: item2,
    };

    if (sn2 || su2 || skn2 || sku2) {
      await setCached(cacheKey, fallback, CACHE_TTL_HOURS);
    }
    return fallback;
  }

  const result: BrickLinkMarketData = {
    sold_new: soldNew,
    sold_used: soldUsed,
    stock_new: stockNew,
    stock_used: stockUsed,
    item,
  };

  await setCached(cacheKey, result, CACHE_TTL_HOURS);
  return result;
}
