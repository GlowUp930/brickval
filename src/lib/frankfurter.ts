import { getCached, setCached } from "./cache";

export interface ExchangeRates {
  eur_to_aud: number;
  usd_to_aud: number;
  stale?: boolean; // true if using a fallback rate
}

// Hardcoded fallbacks — used only if Frankfurter is down and no cached rate exists
const FALLBACK_EUR_TO_AUD = 1.65;
const FALLBACK_USD_TO_AUD = 1.55;

const CACHE_KEY = "fx:EUR-USD-AUD";

/**
 * Fetches EUR→AUD and USD→AUD from Frankfurter (free, no API key, ECB-sourced).
 * Caches for 24 hours. Falls back to last cached or hardcoded rates on failure.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const cached = await getCached<ExchangeRates>(CACHE_KEY);
  if (cached) return cached;

  const [eurRes, usdRes] = await Promise.allSettled([
    fetch("https://api.frankfurter.app/latest?from=EUR&to=AUD", {
      next: { revalidate: 0 },
    }),
    fetch("https://api.frankfurter.app/latest?from=USD&to=AUD", {
      next: { revalidate: 0 },
    }),
  ]);

  let eur_to_aud = FALLBACK_EUR_TO_AUD;
  let usd_to_aud = FALLBACK_USD_TO_AUD;
  let stale = true;

  if (eurRes.status === "fulfilled" && eurRes.value.ok) {
    const json = await eurRes.value.json();
    eur_to_aud = json.rates?.AUD ?? FALLBACK_EUR_TO_AUD;
    stale = false;
  }

  if (usdRes.status === "fulfilled" && usdRes.value.ok) {
    const json = await usdRes.value.json();
    usd_to_aud = json.rates?.AUD ?? FALLBACK_USD_TO_AUD;
  }

  const rates: ExchangeRates = { eur_to_aud, usd_to_aud, stale };

  // Only cache if we got real data (don't persist fallback rates)
  if (!stale) {
    await setCached(CACHE_KEY, rates, 24);
  }

  return rates;
}
