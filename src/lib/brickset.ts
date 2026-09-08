import { getCached, setCached } from "./cache";

const API_BASE = "https://brickset.com/api/v3.asmx";
const CACHE_TTL_HOURS = 24;

function getApiKey(): string {
  const key = process.env.BRICKSET_API_KEY;
  if (!key) throw new Error("[brickset] Missing env var: BRICKSET_API_KEY");
  return key;
}

/**
 * Returns the US RRP (retailPrice) for a LEGO set from Brickset.
 * Returns null if the set is not found, price is unavailable, or the API fails.
 * Cached under `brickset_rrp:{setNumber}` for 24 hours.
 */
export async function getBricksetRrp(setNumber: string): Promise<number | null> {
  const cacheKey = `brickset_rrp:${setNumber}`;

  const cached = await getCached<{ rrp_usd: number | null }>(cacheKey);
  if (cached !== null) return cached.rrp_usd;

  try {
    const apiKey = getApiKey();
    const params = JSON.stringify({ setNumber: `${setNumber}-1`, pageSize: 1 });
    const url = `${API_BASE}/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${encodeURIComponent(params)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn(`[brickset] HTTP ${res.status} for set ${setNumber}`);
      return null;
    }

    const json = await res.json();
    const set = json?.sets?.[0];
    const raw: unknown = set?.LEGOCom?.US?.retailPrice;
    const rrp_usd = typeof raw === "number" && raw > 0 ? raw : null;

    await setCached(cacheKey, { rrp_usd }, CACHE_TTL_HOURS);
    return rrp_usd;
  } catch (err) {
    console.warn("[brickset] Failed to fetch RRP:", err);
    return null;
  }
}
