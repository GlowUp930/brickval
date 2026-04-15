import { getClerkInstance } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
export const isClerkConfigured = CLERK_PUBLISHABLE_KEY.length > 0;

export async function getClerkAuthToken(): Promise<string | null> {
  if (!isClerkConfigured) return null;

  const clerk = getClerkInstance({
    publishableKey: CLERK_PUBLISHABLE_KEY,
    tokenCache,
  });

  return clerk.session?.getToken() ?? null;
}
