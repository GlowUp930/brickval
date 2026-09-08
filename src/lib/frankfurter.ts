import { getCached, getCachedIncludingExpired, setCached } from "./cache";

export const DISPLAY_CURRENCY_CODES = [
  "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "JPY", "CNY", "HKD", "TWD",
  "KRW", "SGD", "INR", "BRL", "MXN", "CHF", "SEK", "NOK", "DKK", "PLN",
  "CZK", "AED", "SAR", "ZAR",
] as const;

/**
 * The small, stable subset needed when normalizing marketplace prices into
 * canonical USD. Keep this separate from the complete display-rate payload so
 * older callers can continue passing their existing fallback object.
 */
export interface EbayExchangeRates {
  eur_to_aud: number;
  usd_to_aud: number;
  gbp_to_usd: number; // for converting EBAY_GB prices to USD
  eur_to_usd: number; // for converting EBAY_DE prices to USD
  aud_to_usd: number; // for converting EBAY_AU prices to USD
  stale?: boolean; // true if using a fallback rate
}

export interface ExchangeRates extends EbayExchangeRates {
  usd_rates: Record<string, number>;
  as_of: string;
}

export interface CachedExchangeRates {
  rates: ExchangeRates;
  fetched_at: string;
}

// Hardcoded fallbacks — used only if Frankfurter is down and no cached rate exists
const FALLBACK_EUR_TO_AUD = 1.65;
const FALLBACK_USD_TO_AUD = 1.55;
const FALLBACK_GBP_TO_USD = 1.27;
const FALLBACK_EUR_TO_USD = 1.08;
const FALLBACK_AUD_TO_USD = 0.645;

const CACHE_KEY = "fx:all-rates-v3";
const CACHE_TTL_HOURS = 24 * 7;

/**
 * Fetches exchange rates from Frankfurter (free, no API key, ECB-sourced).
 * Refreshes after 24 hours, retains successful rates for seven days, and falls
 * back to the last cached or hardcoded rates on failure.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const cached = await getCached<CachedExchangeRates | ExchangeRates>(CACHE_KEY);
  const cachedRates = normalizeCachedRates(cached);
  if (cachedRates && isRecent(cachedRates.fetched_at)) return cachedRates.rates;

  const staleCache = cachedRates ?? normalizeCachedRates(
    await getCachedIncludingExpired<CachedExchangeRates | ExchangeRates>(CACHE_KEY)
  );

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?base=USD&quotes=${DISPLAY_CURRENCY_CODES.filter((code) => code !== "USD").join(",")}`,
    { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } }
  ).catch(() => null);

  if (response?.ok) {
    const rows = await response.json().catch(() => null) as Array<{
      date?: string;
      quote?: string;
      rate?: number;
    }> | null;
    const parsed = parseFrankfurterRows(rows);
    if (parsed) {
      const rates = buildExchangeRates(parsed.rates, parsed.asOf, false);
      await setCached(CACHE_KEY, { rates, fetched_at: new Date().toISOString() }, CACHE_TTL_HOURS);
      return rates;
    }
  }

  if (staleCache) {
    return { ...staleCache.rates, stale: true };
  }

  return buildExchangeRates(
    {
      USD: 1,
      AUD: FALLBACK_USD_TO_AUD,
      EUR: 1 / FALLBACK_EUR_TO_USD,
      GBP: 1 / FALLBACK_GBP_TO_USD,
    },
    new Date().toISOString().slice(0, 10),
    true
  );
}

export function isRecent(fetchedAt: string): boolean {
  const timestamp = Date.parse(fetchedAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp < 24 * 60 * 60 * 1000;
}

export function normalizeCachedRates(
  value: CachedExchangeRates | ExchangeRates | null
): CachedExchangeRates | null {
  if (!value) return null;
  if ("rates" in value && "fetched_at" in value) {
    return value as CachedExchangeRates;
  }
  if ("usd_rates" in value && "as_of" in value) {
    return { rates: value as ExchangeRates, fetched_at: value.as_of };
  }
  return null;
}

export function parseFrankfurterRows(
  rows: Array<{ date?: string; quote?: string; rate?: number }> | null
): { rates: Record<string, number>; asOf: string } | null {
  if (!rows?.length) return null;
  const rates: Record<string, number> = { USD: 1 };
  const dates: string[] = [];
  for (const row of rows) {
    if (!row.quote || !DISPLAY_CURRENCY_CODES.includes(row.quote as (typeof DISPLAY_CURRENCY_CODES)[number])) continue;
    if (typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0) continue;
    rates[row.quote] = row.rate;
    if (row.date) dates.push(row.date);
  }
  if (!hasCompleteDisplayRates(rates) || dates.length === 0) return null;
  return { rates, asOf: dates.sort().at(-1) ?? "" };
}

export function hasCompleteDisplayRates(
  usdRates: Record<string, number> | undefined
): usdRates is Record<(typeof DISPLAY_CURRENCY_CODES)[number], number> {
  return DISPLAY_CURRENCY_CODES.every(
    (code) => typeof usdRates?.[code] === "number" && Number.isFinite(usdRates[code]) && usdRates[code] > 0
  );
}

export function buildExchangeRates(
  usdRates: Record<string, number>,
  asOf: string,
  stale: boolean
): ExchangeRates {
  const usd_to_aud = usdRates.AUD ?? FALLBACK_USD_TO_AUD;
  const eur_to_usd = usdRates.EUR > 0 ? 1 / usdRates.EUR : FALLBACK_EUR_TO_USD;
  const gbp_to_usd = usdRates.GBP > 0 ? 1 / usdRates.GBP : FALLBACK_GBP_TO_USD;
  const aud_to_usd = usd_to_aud > 0 ? 1 / usd_to_aud : FALLBACK_AUD_TO_USD;
  // Frankfurter returns foreign-currency units per USD. Convert EUR → AUD by
  // first inverting the USD/EUR quote, then applying the USD/AUD quote.
  const eur_to_aud = usdRates.EUR > 0 ? usd_to_aud / usdRates.EUR : 0;
  return {
    eur_to_aud: eur_to_aud > 0 ? eur_to_aud : FALLBACK_EUR_TO_AUD,
    usd_to_aud,
    gbp_to_usd,
    eur_to_usd,
    aud_to_usd,
    usd_rates: { ...usdRates, USD: 1 },
    as_of: asOf,
    stale,
  };
}
