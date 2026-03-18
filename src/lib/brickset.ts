import { getCached, setCached } from "./cache";

const API_BASE = "https://brickset.com/api/v3.asmx";
const CACHE_TTL_HOURS = 24;

function getApiKey(): string {
  const key = process.env.BRICKSET_API_KEY;
  if (!key) throw new Error("[brickset] Missing env var: BRICKSET_API_KEY");
  return key;
}

/**
 * Returns the US retirement date (dateLastAvailable) for a LEGO set from Brickset.
 * Returns null if the set is not found, the date is unavailable, or the API fails.
 * Cached under `brickset:{setNumber}` for 24 hours.
 */
export async function getBricksetRetirementDate(setNumber: string): Promise<string | null> {
  const cacheKey = `brickset:${setNumber}`;

  const cached = await getCached<{ retirement_date: string | null }>(cacheKey);
  if (cached !== null) return cached.retirement_date;

  try {
    const apiKey = getApiKey();
    const params = JSON.stringify({ setNumber: `${setNumber}-1`, pageSize: 1 });
    const url = `${API_BASE}/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${encodeURIComponent(params)}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn(`[brickset] HTTP ${res.status} for set ${setNumber}`);
      return null;
    }

    const json = await res.json();
    const set = json?.sets?.[0];
    const rawDate: string | undefined = set?.LEGOCom?.US?.dateLastAvailable;
    const retirement_date = rawDate ? rawDate.split("T")[0] : null;

    await setCached(cacheKey, { retirement_date }, CACHE_TTL_HOURS);
    return retirement_date;
  } catch (err) {
    console.warn("[brickset] Failed to fetch retirement date:", err);
    return null;
  }
}
