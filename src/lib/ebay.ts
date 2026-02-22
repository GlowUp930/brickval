import { getCached, setCached } from "./cache";

export interface EbaySale {
  title: string;
  price_usd: number; // converted from eBay AU's AUD price
  sold_date: string; // ISO date string
  condition: string; // "New / Sealed" | "Used"
  item_url: string;
}

export interface EbayMarketData {
  new_sales: EbaySale[];
  used_sales: EbaySale[];
}

const CACHE_TTL_HOURS = 24; // refresh eBay data every 24 hours

// --- OAuth token (cached in memory per server instance, refreshed when expired) ---
let tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires - 60_000) {
    return tokenCache.token;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error("[ebay] Missing env vars: EBAY_APP_ID or EBAY_CERT_ID");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[ebay] Token fetch failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  tokenCache = {
    token: json.access_token,
    expires: Date.now() + json.expires_in * 1000,
  };
  return tokenCache.token;
}

// --- Fetch sold listings for one condition ---
type Condition = "new" | "used";

async function fetchSoldListings(
  setNumber: string,
  condition: Condition,
  usdToAud: number // exchange rate to convert AUD → USD
): Promise<EbaySale[]> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.warn("[ebay] Could not get access token:", err);
    return [];
  }

  // conditionIds: 1000 = New, 3000 = Used
  const conditionId = condition === "new" ? "1000" : "3000";
  const query = encodeURIComponent(`LEGO ${setNumber}`);

  // Try Marketplace Insights API first (true sold listings)
  const url =
    `https://api.ebay.com/buy/marketplace-insights/v1/item_sales/search` +
    `?q=${query}` +
    `&filter=conditionIds%3A%7B${conditionId}%7D%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
    `&marketplace_id=EBAY_AU` +
    `&limit=5` +
    `&sort=soldDate`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
  } catch (err) {
    console.warn("[ebay] Fetch error:", err);
    return [];
  }

  // If Marketplace Insights is restricted (403/404/405), fall back to Browse API
  if (res.status === 403 || res.status === 404 || res.status === 405) {
    console.warn(
      `[ebay] Marketplace Insights returned ${res.status}, falling back to Browse API`
    );
    return fetchBrowseListings(setNumber, condition, usdToAud, token);
  }

  if (!res.ok) {
    console.warn(`[ebay] Marketplace Insights returned ${res.status}`);
    return [];
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json.itemSales ?? [];

  return items.map((item) => {
    const priceAud = parseFloat(
      (item.price as { value: string; currency: string }).value
    );
    const priceUsd = Math.round((priceAud / usdToAud) * 100) / 100;
    return {
      title: item.title as string,
      price_usd: priceUsd,
      sold_date: item.soldDate as string,
      condition: condition === "new" ? "New / Sealed" : "Used",
      item_url: item.itemHref as string,
    };
  });
}

// --- Fallback: Browse API (active listings, not sold) ---
async function fetchBrowseListings(
  setNumber: string,
  condition: Condition,
  usdToAud: number,
  token: string
): Promise<EbaySale[]> {
  // conditionIds: 1000 = New, 3000 = Used
  const conditionId = condition === "new" ? "1000" : "3000";
  const query = encodeURIComponent(`LEGO ${setNumber}`);

  const url =
    `https://api.ebay.com/buy/browse/v1/item_summary/search` +
    `?q=${query}` +
    `&filter=conditionIds%3A%7B${conditionId}%7D%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
    `&marketplace_id=EBAY_AU` +
    `&limit=5`; // default sort = best match / relevance

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
  } catch (err) {
    console.warn("[ebay] Browse API fetch error:", err);
    return [];
  }

  if (!res.ok) {
    console.warn(`[ebay] Browse API returned ${res.status}`);
    return [];
  }

  const json = await res.json();
  const items: Record<string, unknown>[] = json.itemSummaries ?? [];

  return items.map((item) => {
    const priceField = item.price as { value: string; currency: string };
    const rawPrice = parseFloat(priceField.value);
    // Browse API may return USD (EBAY_US) or AUD (EBAY_AU) depending on result source
    const priceUsd =
      priceField.currency === "USD"
        ? Math.round(rawPrice * 100) / 100
        : Math.round((rawPrice / usdToAud) * 100) / 100;
    return {
      title: item.title as string,
      price_usd: priceUsd,
      sold_date: new Date().toISOString(), // Browse API has no sold date — use today
      condition: condition === "new" ? "New / Sealed" : "Used",
      item_url: (item.itemWebUrl as string) ?? "",
    };
  });
}

// --- Public API ---
export async function getEbayMarketData(
  setNumber: string,
  usdToAud: number // from getExchangeRates(), fallback 1.55
): Promise<EbayMarketData> {
  const cacheKey = `ebay:${setNumber}`;
  const cached = await getCached<EbayMarketData>(cacheKey);
  if (cached) return cached;

  const [newSales, usedSales] = await Promise.all([
    fetchSoldListings(setNumber, "new", usdToAud),
    fetchSoldListings(setNumber, "used", usdToAud),
  ]);

  const result: EbayMarketData = { new_sales: newSales, used_sales: usedSales };

  // Only cache if we got something useful
  if (newSales.length > 0 || usedSales.length > 0) {
    await setCached(cacheKey, result, CACHE_TTL_HOURS);
  }

  return result;
}
