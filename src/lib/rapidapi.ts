import { getCached, setCached } from "./cache";
import type { MarketPrice } from "@/types/market";

// RapidAPI host for the LEGO Market Prices endpoint.
// Verify this matches the exact host shown in your RapidAPI dashboard.
const RAPIDAPI_HOST = "lego-market-prices.p.rapidapi.com";

/**
 * Fetches secondary market price data for a LEGO set.
 * Caches per set for 7 days (market prices don't change rapidly).
 *
 * IMPORTANT: Before wiring this to the result page, test the raw
 * response with a real curl and verify the field names match below.
 */
export async function getMarketPrice(
  setNumber: string
): Promise<MarketPrice | null> {
  const cacheKey = `rapidapi:market:${setNumber}`;
  const cached = await getCached<MarketPrice>(cacheKey);
  if (cached) return cached;

  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("Missing env var: RAPIDAPI_KEY");
  }

  let response: Response;
  try {
    response = await fetch(
      `https://${RAPIDAPI_HOST}/sets/${setNumber}/prices`,
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
        next: { revalidate: 0 },
      }
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const json = await response.json();

  // Map to internal type — field names may differ from your actual API response.
  // Inspect the raw JSON and update these mappings if needed.
  const price: MarketPrice = {
    avg_price: json.averagePrice ?? json.avg_price ?? null,
    min_price: json.minPrice ?? json.min_price ?? null,
    max_price: json.maxPrice ?? json.max_price ?? null,
    qty_listed: json.quantityListed ?? json.qty_listed ?? null,
    currency: "EUR",
  };

  // Only cache if we got useful data
  if (price.avg_price !== null) {
    await setCached(cacheKey, price, 7 * 24); // 7 days
  }

  return price;
}
