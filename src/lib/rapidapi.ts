import { getCached, setCached } from "./cache";
import type { RapidApiSetPrice, MarketPrice } from "@/types/market";

// RapidAPI: "LEGO Set Prices Achieved In The Market (Like Bricklink)"
// This is a bulk dataset API — one call returns ALL LEGO sets.
// Recommended: cache for 7 days and look up by set_number in memory.
const RAPIDAPI_HOST =
  "lego-set-prices-achieved-in-the-market-like-bricklink.p.rapidapi.com";
const CACHE_KEY = "rapidapi:all";
const CACHE_TTL_HOURS = 7 * 24; // 7 days

/**
 * Fetches the full LEGO market price dataset from RapidAPI.
 * Caches the entire array in Supabase for 7 days.
 */
async function fetchAllSets(): Promise<RapidApiSetPrice[] | null> {
  const cached = await getCached<RapidApiSetPrice[]>(CACHE_KEY);
  if (cached) return cached;

  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("Missing env var: RAPIDAPI_KEY");
  }

  let response: Response;
  try {
    response = await fetch(`https://${RAPIDAPI_HOST}/`, {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      next: { revalidate: 0 },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data: RapidApiSetPrice[] = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    await setCached(CACHE_KEY, data, CACHE_TTL_HOURS);
  }
  return Array.isArray(data) ? data : null;
}

/**
 * Looks up market prices for a single LEGO set number.
 * Fetches the full dataset (cached) then finds the matching entry.
 *
 * @param setNumber - Set number without suffix e.g. "75192" (will try "75192-1" too)
 */
export async function getMarketPrice(
  setNumber: string
): Promise<MarketPrice | null> {
  const allSets = await fetchAllSets();
  if (!allSets) return null;

  // Brickset returns set numbers like "75192" — RapidAPI uses "75192-1"
  const withSuffix = setNumber.includes("-") ? setNumber : `${setNumber}-1`;
  const entry = allSets.find(
    (s) => s.set_number === withSuffix || s.set_number === setNumber
  );
  if (!entry) return null;

  return {
    price_new_eur:
      entry.price_new === "none" ? null : parseFloat(entry.price_new),
    price_used_eur:
      entry.price_used === "none" ? null : parseFloat(entry.price_used),
    sold_sets_new: entry.sold_sets_new ?? null,
    sold_sets_used: entry.sold_sets_used ?? null,
  };
}
