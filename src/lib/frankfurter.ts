import { getCached, setCached } from "./cache";

export interface ExchangeRates {
  eur_to_aud: number;
  usd_to_aud: number;
  gbp_to_usd: number; // for converting EBAY_GB prices to USD
  eur_to_usd: number; // for converting EBAY_DE prices to USD
  aud_to_usd: number; // for converting EBAY_AU prices to USD
  stale?: boolean; // true if using a fallback rate
}

// Hardcoded fallbacks — used only if Frankfurter is down and no cached rate exists
const FALLBACK_EUR_TO_AUD = 1.65;
const FALLBACK_USD_TO_AUD = 1.55;
const FALLBACK_GBP_TO_USD = 1.27;
const FALLBACK_EUR_TO_USD = 1.08;
const FALLBACK_AUD_TO_USD = 0.645;

const CACHE_KEY = "fx:all-rates-v2";

/**
 * Fetches exchange rates from Frankfurter (free, no API key, ECB-sourced).
 * Caches for 24 hours. Falls back to last cached or hardcoded rates on failure.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const cached = await getCached<ExchangeRates>(CACHE_KEY);
  if (cached) return cached;

  // Fetch all rates we need in parallel
  const [eurRes, usdRes, gbpRes] = await Promise.allSettled([
    fetch("https://api.frankfurter.app/latest?from=EUR&to=AUD,USD", {
      next: { revalidate: 0 },
    }),
    fetch("https://api.frankfurter.app/latest?from=USD&to=AUD", {
      next: { revalidate: 0 },
    }),
    fetch("https://api.frankfurter.app/latest?from=GBP&to=USD", {
      next: { revalidate: 0 },
    }),
  ]);

  let eur_to_aud = FALLBACK_EUR_TO_AUD;
  let eur_to_usd = FALLBACK_EUR_TO_USD;
  let usd_to_aud = FALLBACK_USD_TO_AUD;
  let gbp_to_usd = FALLBACK_GBP_TO_USD;
  let stale = true;

  if (eurRes.status === "fulfilled" && eurRes.value.ok) {
    const json = await eurRes.value.json();
    eur_to_aud = json.rates?.AUD ?? FALLBACK_EUR_TO_AUD;
    eur_to_usd = json.rates?.USD ?? FALLBACK_EUR_TO_USD;
    stale = false;
  }

  if (usdRes.status === "fulfilled" && usdRes.value.ok) {
    const json = await usdRes.value.json();
    usd_to_aud = json.rates?.AUD ?? FALLBACK_USD_TO_AUD;
  }

  if (gbpRes.status === "fulfilled" && gbpRes.value.ok) {
    const json = await gbpRes.value.json();
    gbp_to_usd = json.rates?.USD ?? FALLBACK_GBP_TO_USD;
  }

  // Derive AUD→USD from USD→AUD (inverse)
  const aud_to_usd = usd_to_aud > 0
    ? Math.round((1 / usd_to_aud) * 10000) / 10000
    : FALLBACK_AUD_TO_USD;

  const rates: ExchangeRates = {
    eur_to_aud,
    usd_to_aud,
    gbp_to_usd,
    eur_to_usd,
    aud_to_usd,
    stale,
  };

  // Only cache if we got real data (don't persist fallback rates)
  if (!stale) {
    await setCached(CACHE_KEY, rates, 24);
  }

  return rates;
}
