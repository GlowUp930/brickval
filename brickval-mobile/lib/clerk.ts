import { getClerkInstance } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
export const isClerkConfigured = CLERK_PUBLISHABLE_KEY.length > 0;
const expoTokenCache = tokenCache;
export const safeTokenCache: typeof tokenCache = expoTokenCache
  ? {
      getToken: async (key: string) => {
        try {
          return await expoTokenCache.getToken(key);
        } catch (error) {
          console.warn("Clerk token cache read failed; continuing without cached token.", error);
          return null;
        }
      },
      saveToken: async (key: string, token: string) => {
        try {
          await expoTokenCache.saveToken(key, token);
        } catch (error) {
          console.warn("Clerk token cache save failed; continuing without cached token.", error);
        }
      },
    }
  : undefined;

let liveTokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  liveTokenGetter = getter;
}

export async function getClerkAuthToken(): Promise<string | null> {
  if (!isClerkConfigured) return null;

  try {
    const liveToken = await liveTokenGetter?.();
    if (liveToken) return liveToken;
  } catch {
    // Fall back to the Clerk singleton below.
  }

  try {
    const clerk = getClerkInstance({
      publishableKey: CLERK_PUBLISHABLE_KEY,
      tokenCache: safeTokenCache,
    });

    return clerk.session?.getToken() ?? null;
  } catch (error) {
    console.warn("Clerk token unavailable; continuing as guest.", error);
    return null;
  }
}
