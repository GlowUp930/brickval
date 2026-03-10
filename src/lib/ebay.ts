import { getCached, setCached } from "./cache";
import type { ExchangeRates } from "./frankfurter";

export interface EbaySale {
  title: string;
  price_usd: number; // always stored in USD
  sold_date: string; // ISO date — real date for sold, today for active listings
  condition: string; // "New / Sealed" | "Used"
  item_url: string;
  marketplace?: string; // e.g. "EBAY_US", "EBAY_AU", "EBAY_GB", "EBAY_DE"
}

export interface EbayMarketData {
  new_sales: EbaySale[];
  used_sales: EbaySale[];
  data_source: "sold" | "listing";
}

const CACHE_TTL_HOURS = 24;
const MIN_RESULTS_FOR_30_DAYS = 3;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

// Sandbox vs Production toggle
const IS_SANDBOX = process.env.EBAY_SANDBOX === "true";
const API_BASE = IS_SANDBOX ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";

// EPN affiliate tracking
const EPN_CAMPAIGN_ID = process.env.EPN_CAMPAIGN_ID ?? "";

// Marketplaces to search, ordered by trading volume for LEGO
const MARKETPLACES = ["EBAY_US", "EBAY_AU", "EBAY_GB", "EBAY_DE"] as const;
type MarketplaceId = (typeof MARKETPLACES)[number];

// Currency for each marketplace
const MARKETPLACE_CURRENCY: Record<MarketplaceId, string> = {
  EBAY_US: "USD",
  EBAY_AU: "AUD",
  EBAY_GB: "GBP",
  EBAY_DE: "EUR",
};

// ── OAuth tokens ────────────────────────────────────────────────────────────

// General scope token (Browse API)
let browseTokenCache: { token: string; expires: number } | null = null;

// Marketplace Insights scope token
let insightsTokenCache: { token: string; expires: number } | null = null;
let insightsScopeAvailable: boolean | null = null; // null = untested

function getCredentials() {
  const appId = IS_SANDBOX
    ? process.env.EBAY_SANDBOX_APP_ID
    : process.env.EBAY_APP_ID;
  const certId = IS_SANDBOX
    ? process.env.EBAY_SANDBOX_CERT_ID
    : process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    const env = IS_SANDBOX ? "EBAY_SANDBOX_APP_ID/EBAY_SANDBOX_CERT_ID" : "EBAY_APP_ID/EBAY_CERT_ID";
    throw new Error(`[ebay] Missing env vars: ${env}`);
  }
  return Buffer.from(`${appId}:${certId}`).toString("base64");
}

// ── Retry helper (max 2 retries for infrastructure errors) ──────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Only retry on infrastructure errors (5xx)
      if (RETRYABLE_STATUSES.has(res.status) && attempt < retries) {
        console.warn(`[ebay] ${res.status} on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        console.warn(`[ebay] Network error on attempt ${attempt + 1}, retrying...`);
        continue;
      }
    }
  }
  throw lastError ?? new Error("[ebay] fetchWithRetry exhausted retries");
}

// ── EPN affiliate header ────────────────────────────────────────────────────

function getEpnHeaders(): Record<string, string> {
  if (!EPN_CAMPAIGN_ID) return {};
  return {
    "X-EBAY-C-ENDUSERCTX": `affiliateCampaignId=${EPN_CAMPAIGN_ID}`,
  };
}

async function fetchToken(scope: string): Promise<{ token: string; expiresIn: number }> {
  const credentials = getCredentials();
  const res = await fetchWithRetry(
    `${API_BASE}/identity/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
      next: { revalidate: 0 },
    } as RequestInit
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[ebay] Token fetch failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return { token: json.access_token, expiresIn: json.expires_in };
}

async function getBrowseToken(): Promise<string> {
  if (browseTokenCache && Date.now() < browseTokenCache.expires - 60_000) {
    return browseTokenCache.token;
  }
  const { token, expiresIn } = await fetchToken("https://api.ebay.com/oauth/api_scope");
  browseTokenCache = { token, expires: Date.now() + expiresIn * 1000 };
  return token;
}

async function getInsightsToken(): Promise<string | null> {
  // If we already know insights scope is denied, skip
  if (insightsScopeAvailable === false) return null;

  if (insightsTokenCache && Date.now() < insightsTokenCache.expires - 60_000) {
    return insightsTokenCache.token;
  }

  try {
    const { token, expiresIn } = await fetchToken(
      "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights"
    );
    insightsTokenCache = { token, expires: Date.now() + expiresIn * 1000 };
    insightsScopeAvailable = true;
    return token;
  } catch {
    // Scope denied — remember so we don't retry every request
    console.warn("[ebay] Marketplace Insights scope denied, using Browse API fallback");
    insightsScopeAvailable = false;
    return null;
  }
}

// ── Currency conversion ─────────────────────────────────────────────────────

function convertToUsd(
  rawPrice: number,
  currency: string,
  rates: ExchangeRates
): number {
  let usd: number;
  switch (currency) {
    case "USD":
      usd = rawPrice;
      break;
    case "AUD":
      usd = rawPrice * rates.aud_to_usd;
      break;
    case "GBP":
      usd = rawPrice * rates.gbp_to_usd;
      break;
    case "EUR":
      usd = rawPrice * rates.eur_to_usd;
      break;
    default:
      // Unknown currency — assume USD
      usd = rawPrice;
  }
  return Math.round(usd * 100) / 100;
}

// ── Marketplace Insights API (real sold data) ───────────────────────────────

type Condition = "new" | "used";

async function fetchInsightsSales(
  setNumber: string,
  condition: Condition,
  marketplace: MarketplaceId,
  token: string,
  rates: ExchangeRates
): Promise<EbaySale[]> {
  const conditionId = condition === "new" ? "1000" : "3000";
  const query = encodeURIComponent(`LEGO ${setNumber}`);

  const url =
    `${API_BASE}/buy/marketplace-insights/v1/item_sales/search` +
    `?q=${query}` +
    `&filter=conditionIds%3A%7B${conditionId}%7D%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
    `&limit=20` +
    `&sort=soldDate`;

  const res = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": marketplace,
      ...getEpnHeaders(),
    },
    next: { revalidate: 0 },
  } as RequestInit);

  // 403/404/405 means no access to Insights for this marketplace
  if (res.status === 403 || res.status === 404 || res.status === 405) {
    return [];
  }

  if (!res.ok) {
    console.warn(`[ebay] Insights ${marketplace} returned ${res.status}`);
    return [];
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json.itemSales ?? [];
  const currency = MARKETPLACE_CURRENCY[marketplace];

  return items.map((item) => {
    const priceRaw = parseFloat(
      (item.price as { value: string; currency: string }).value
    );
    return {
      title: item.title as string,
      price_usd: convertToUsd(priceRaw, currency, rates),
      sold_date: item.soldDate as string,
      condition: condition === "new" ? "New / Sealed" : "Used",
      item_url: item.itemHref as string,
      marketplace,
    };
  });
}

/**
 * Fetch sold listings across multiple marketplaces.
 * Returns merged, deduplicated, date-filtered results.
 */
async function fetchGlobalSoldListings(
  setNumber: string,
  condition: Condition,
  token: string,
  rates: ExchangeRates
): Promise<EbaySale[]> {
  // Query all marketplaces in parallel
  const results = await Promise.allSettled(
    MARKETPLACES.map((mp) =>
      fetchInsightsSales(setNumber, condition, mp, token, rates)
    )
  );

  // Merge all successful results
  const allSales: EbaySale[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allSales.push(...result.value);
    }
  }

  // Deduplicate by item_url (same item can appear in cross-border results)
  const seen = new Set<string>();
  const unique = allSales.filter((sale) => {
    if (seen.has(sale.item_url)) return false;
    seen.add(sale.item_url);
    return true;
  });

  // Sort by sold_date descending (most recent first)
  unique.sort(
    (a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime()
  );

  // Filter to last 30 days first
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  const last30 = unique.filter(
    (s) => new Date(s.sold_date).getTime() >= thirtyDaysAgo
  );

  // If 30-day window has enough results, use it; otherwise expand to 60 days
  if (last30.length >= MIN_RESULTS_FOR_30_DAYS) {
    return last30;
  }

  const last60 = unique.filter(
    (s) => new Date(s.sold_date).getTime() >= sixtyDaysAgo
  );
  return last60;
}

// ── Browse API fallback (active listings) ───────────────────────────────────

async function fetchBrowseListings(
  setNumber: string,
  condition: Condition,
  rates: ExchangeRates,
  token: string
): Promise<EbaySale[]> {
  const conditionId = condition === "new" ? "1000" : "3000";
  const query = encodeURIComponent(`LEGO ${setNumber}`);

  // Search across major marketplaces for better coverage
  const marketplacesToTry: MarketplaceId[] = ["EBAY_US", "EBAY_AU"];

  // Fetch all marketplaces in parallel
  const results = await Promise.allSettled(
    marketplacesToTry.map(async (marketplace) => {
      const url =
        `${API_BASE}/buy/browse/v1/item_summary/search` +
        `?q=${query}` +
        `&filter=conditionIds%3A%7B${conditionId}%7D%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
        `&limit=5`;

      const res = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-EBAY-C-MARKETPLACE-ID": marketplace,
          ...getEpnHeaders(),
        },
        next: { revalidate: 0 },
      } as RequestInit);

      if (!res.ok) return [] as EbaySale[];

      const json = await res.json();
      const items: Record<string, unknown>[] = json.itemSummaries ?? [];

      return items.map((item) => {
        const priceField = item.price as { value: string; currency: string };
        return {
          title: item.title as string,
          price_usd: convertToUsd(parseFloat(priceField.value), priceField.currency, rates),
          sold_date: new Date().toISOString(),
          condition: condition === "new" ? "New / Sealed" : "Used",
          item_url: (item.itemWebUrl as string) ?? "",
          marketplace,
        } as EbaySale;
      });
    })
  );

  const allSales: EbaySale[] = results.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Deduplicate by URL and return max 10
  const seen = new Set<string>();
  return allSales
    .filter((s) => {
      if (seen.has(s.item_url)) return false;
      seen.add(s.item_url);
      return true;
    })
    .slice(0, 10);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function getEbayMarketData(
  setNumber: string,
  rates: ExchangeRates
): Promise<EbayMarketData> {
  const cacheKey = `ebay-v2:${setNumber}`;
  const cached = await getCached<EbayMarketData>(cacheKey);
  if (
    cached &&
    (cached.new_sales.length > 0 || cached.used_sales.length > 0)
  ) {
    return cached;
  }

  // Try Marketplace Insights first (real sold prices)
  const insightsToken = await getInsightsToken();

  if (insightsToken) {
    const [newSold, usedSold] = await Promise.all([
      fetchGlobalSoldListings(setNumber, "new", insightsToken, rates),
      fetchGlobalSoldListings(setNumber, "used", insightsToken, rates),
    ]);

    if (newSold.length > 0 || usedSold.length > 0) {
      const result: EbayMarketData = {
        new_sales: newSold,
        used_sales: usedSold,
        data_source: "sold",
      };
      await setCached(cacheKey, result, CACHE_TTL_HOURS);
      return result;
    }
  }

  // Fallback to Browse API (active listings)
  let browseToken: string;
  try {
    browseToken = await getBrowseToken();
  } catch (err) {
    console.warn("[ebay] Could not get browse token:", err);
    return { new_sales: [], used_sales: [], data_source: "listing" };
  }

  const [newListings, usedListings] = await Promise.all([
    fetchBrowseListings(setNumber, "new", rates, browseToken),
    fetchBrowseListings(setNumber, "used", rates, browseToken),
  ]);

  const result: EbayMarketData = {
    new_sales: newListings,
    used_sales: usedListings,
    data_source: "listing",
  };

  if (newListings.length > 0 || usedListings.length > 0) {
    await setCached(cacheKey, result, CACHE_TTL_HOURS);
  }

  return result;
}
