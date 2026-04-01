import { getCached, setCached } from "./cache";

const API_BASE = "https://brickset.com/api/v3.asmx";
const CACHE_TTL_HOURS = 24;

function getApiKey(): string {
  const key = process.env.BRICKSET_API_KEY;
  if (!key) throw new Error("[brickset] Missing env var: BRICKSET_API_KEY");
  return key;
}

/**
 * Returns Brickset catalog presence and US RRP for a LEGO set.
 * `found` is true whenever Brickset has the set in its catalog, regardless of price.
 * `rrp` is null when no US retail price is listed.
 * Cached under `brickset_rrp:{setNumber}` for 24 hours.
 */
export async function getBricksetRrp(
  setNumber: string
): Promise<{ rrp: number | null; found: boolean }> {
  const cacheKey = `brickset_rrp:${setNumber}`;

  const cached = await getCached<{ rrp_usd: number | null; found?: boolean }>(cacheKey);
  // Only use cached entry if it contains `found` (old entries predate this field — re-fetch them).
  if (cached !== null && typeof cached.found === "boolean") {
    return { rrp: cached.rrp_usd, found: cached.found };
  }

  try {
    const apiKey = getApiKey();
    const params = JSON.stringify({ setNumber: `${setNumber}-1`, pageSize: 1 });
    const url = `${API_BASE}/getSets?apiKey=${encodeURIComponent(apiKey)}&userHash=&params=${encodeURIComponent(params)}`;

    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn(`[brickset] HTTP ${res.status} for set ${setNumber}`);
      return { rrp: null, found: false };
    }

    const json = await res.json();
    const set = json?.sets?.[0];
    const found = set !== undefined && set !== null;
    const raw: unknown = set?.LEGOCom?.US?.retailPrice;
    const rrp_usd = typeof raw === "number" && raw > 0 ? raw : null;

    await setCached(cacheKey, { rrp_usd, found }, CACHE_TTL_HOURS);
    return { rrp: rrp_usd, found };
  } catch (err) {
    console.warn("[brickset] Failed to fetch RRP:", err);
    return { rrp: null, found: false };
  }
}
