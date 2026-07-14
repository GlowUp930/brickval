export type PricingStatus = "fresh" | "refreshing" | "fetched";

export interface StoredMarketSnapshot<T> {
  payload: T;
  updatedAt: string;
}

export interface MarketSnapshotDependencies<T> {
  now: () => Date;
  read: (itemId: string) => Promise<StoredMarketSnapshot<T> | null>;
  fetchLive: (itemId: string) => Promise<T>;
  write: (itemId: string, snapshot: StoredMarketSnapshot<T>) => Promise<void>;
  refreshInBackground: (task: () => Promise<void>) => void;
}

export interface ResolvedMarketSnapshot<T> extends StoredMarketSnapshot<T> {
  pricingStatus: PricingStatus;
  pricingUpdatedAt: string;
}

const FRESH_FOR_MS = 24 * 60 * 60 * 1000;
const SERVE_STALE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export async function resolveMarketSnapshot<T>(
  itemId: string,
  dependencies: MarketSnapshotDependencies<T>
): Promise<ResolvedMarketSnapshot<T>> {
  const stored = await dependencies.read(itemId);
  if (stored) {
    const ageMs = dependencies.now().getTime() - new Date(stored.updatedAt).getTime();
    if (ageMs < FRESH_FOR_MS) {
      return {
        ...stored,
        pricingStatus: "fresh",
        pricingUpdatedAt: stored.updatedAt,
      };
    }
    if (ageMs <= SERVE_STALE_FOR_MS) {
      dependencies.refreshInBackground(async () => {
        const payload = await dependencies.fetchLive(itemId);
        const updatedAt = dependencies.now().toISOString();
        await dependencies.write(itemId, { payload, updatedAt });
      });
      return {
        ...stored,
        pricingStatus: "refreshing",
        pricingUpdatedAt: stored.updatedAt,
      };
    }
  }

  const payload = await dependencies.fetchLive(itemId);
  const updatedAt = dependencies.now().toISOString();
  const snapshot = { payload, updatedAt };
  await dependencies.write(itemId, snapshot);
  return { ...snapshot, pricingStatus: "fetched", pricingUpdatedAt: updatedAt };
}
