import * as SecureStore from "expo-secure-store";

/**
 * Thin client for the Brickvalue.live REST API.
 * Auth: a Clerk-issued JWT stored in expo-secure-store as "auth_token".
 * The web app issues this token via /api/auth/native-token after the user
 * signs in inside the WebView modal.
 */

export const API_BASE = "https://brickvalue.live";
const TOKEN_KEY = "auth_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST a captured photo to /api/identify and get back a set number.
 */
export async function identifySet(photoUri: string): Promise<string | null> {
  const form = new FormData();
  form.append("image", {
    uri: photoUri,
    name: "scan.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/api/identify`, {
    method: "POST",
    headers: { ...(await authHeader()) },
    body: form,
  });

  if (!res.ok) throw new Error(`identify failed: ${res.status}`);
  const data: { set_number: string | null } = await res.json();
  return data.set_number;
}

/**
 * Look up market data for a set number. Returns the same shape the web
 * /result page consumes (ComputedPricing).
 */
export async function lookupSet(setNumber: string): Promise<LookupResult> {
  const res = await fetch(`${API_BASE}/api/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ setNumber }),
  });

  if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
  return res.json();
}

export interface LookupResult {
  set_number: string;
  name: string;
  theme: string;
  pieces: number | null;
  image_url: string | null;
  pricing: {
    hero_new_avg_usd: number | null;
    rrp_usd: number | null;
    gain_pct: number | null;
    bricklink_new_qty: number | null;
    data_source: "sold" | "listing" | null;
  };
}
