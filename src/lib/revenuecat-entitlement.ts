type RevenueCatEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
};

export type RevenueCatCustomerResponse = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
};

export type RevenueCatFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export function hasActiveProEntitlement(
  payload: RevenueCatCustomerResponse,
  now = new Date()
): boolean {
  const entitlement = payload.subscriber?.entitlements?.pro;
  if (!entitlement) return false;

  const expiryDates = [entitlement.expires_date, entitlement.grace_period_expires_date]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);

  return expiryDates.length === 0 || expiryDates.some((timestamp) => timestamp > now.getTime());
}

export async function fetchRevenueCatProEntitlement(
  userId: string,
  fetcher: RevenueCatFetcher = fetch,
  now = new Date()
): Promise<boolean | null> {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!apiKey) {
    console.error("[revenuecat] Missing REVENUECAT_SECRET_API_KEY");
    return null;
  }

  try {
    const response = await fetcher(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        signal: AbortSignal.timeout(8_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );
    if (!response.ok) {
      console.warn(`[revenuecat] Customer lookup failed with ${response.status}`);
      return null;
    }

    const payload = await response.json() as RevenueCatCustomerResponse;
    return hasActiveProEntitlement(payload, now);
  } catch (error) {
    console.warn("[revenuecat] Customer lookup unavailable", error);
    return null;
  }
}
