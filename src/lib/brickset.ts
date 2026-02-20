import { getCached, setCached } from "./cache";
import type { BricksetSet } from "@/types/brickset";

const API_URL = "https://brickset.com/api/v3.asmx";

/**
 * Fetches set data from Brickset API v3.
 * Caches per set for 24 hours.
 *
 * NOTE: The free Brickset key has a 100 req/day default limit.
 * Contact Brickset before launch to raise the production cap.
 */
export async function getBricksetData(
  setNumber: string
): Promise<BricksetSet | null> {
  const cacheKey = `brickset:${setNumber}`;
  const cached = await getCached<BricksetSet>(cacheKey);
  if (cached) return cached;

  if (!process.env.BRICKSET_API_KEY) {
    throw new Error("Missing env var: BRICKSET_API_KEY");
  }

  // Brickset requires the variant suffix (e.g. "75192-1"). Append "-1" if missing.
  const fullSetNumber = setNumber.includes("-") ? setNumber : `${setNumber}-1`;

  const params = new URLSearchParams({
    apiKey: process.env.BRICKSET_API_KEY,
    userHash: "",
    params: JSON.stringify({ setNumber: fullSetNumber, pageSize: 1 }),
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/getSets?${params}`, {
      next: { revalidate: 0 },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const json = await response.json();
  if (json.status !== "success" || !json.sets?.length) return null;

  const set = json.sets[0] as BricksetSet;
  await setCached(cacheKey, set, 24);
  return set;
}
