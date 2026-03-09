import { supabase } from "./supabase";

/**
 * Read from the api_cache table.
 * Returns null if the key doesn't exist or is expired.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("api_cache")
    .select("data")
    .eq("cache_key", key)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data.data as T;
}

/**
 * Write to the api_cache table.
 * Cleans up expired rows before writing.
 * @param ttlHours Time-to-live in hours. Defaults to 24.
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlHours = 24
): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000
  ).toISOString();

  await supabase.from("api_cache").delete().lt("expires_at", now);

  await supabase.from("api_cache").upsert({
    cache_key: key,
    data: value as object,
    expires_at: expiresAt,
  });
}
