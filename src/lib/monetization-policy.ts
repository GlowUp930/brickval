export interface MonetizationPolicy {
  version: number;
  accessExperiment: {
    enabled: boolean;
    hardPaywallPercent: number;
    trialDays: number;
  };
  gates: {
    singleDaily: boolean;
    bulkRepeat: boolean;
    collectionCapacity: boolean;
    marketHistory: boolean;
    appearance: boolean;
    offerCodes: boolean;
  };
  limits: {
    singleScansPerDay: number;
    introductoryBulkScans: number;
    collectionUniqueItems: number;
  };
  notifications: {
    enabled: boolean;
    scanReset: boolean;
    trialEnding: boolean;
    accountAction: boolean;
  };
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function percentage(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
}

export function getMonetizationPolicy(): MonetizationPolicy {
  return {
    version: 4,
    accessExperiment: {
      enabled: booleanValue("BRICKVALUE_HARD_PAYWALL_EXPERIMENT_ENABLED", false),
      hardPaywallPercent: percentage("BRICKVALUE_HARD_PAYWALL_PERCENT", 50),
      trialDays: positiveInteger("BRICKVALUE_PRO_TRIAL_DAYS", 7),
    },
    gates: {
      singleDaily: booleanValue("BRICKVALUE_SINGLE_SCAN_GATE_ENABLED", true),
      bulkRepeat: booleanValue("BRICKVALUE_BULK_GATE_ENABLED", true),
      collectionCapacity: booleanValue("BRICKVALUE_COLLECTION_GATE_ENABLED", true),
      marketHistory: booleanValue("BRICKVALUE_MARKET_HISTORY_GATE_ENABLED", false),
      appearance: true,
      offerCodes: booleanValue("BRICKVALUE_OFFER_CODES_ENABLED", true),
    },
    limits: {
      singleScansPerDay: positiveInteger("BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY", 3),
      introductoryBulkScans: positiveInteger("BRICKVALUE_FREE_BULK_SCANS", 1),
      collectionUniqueItems: positiveInteger("BRICKVALUE_FREE_COLLECTION_ITEMS", 10),
    },
    notifications: {
      enabled: booleanValue("BRICKVALUE_NOTIFICATIONS_ENABLED", true),
      scanReset: booleanValue("BRICKVALUE_SCAN_RESET_NOTIFICATIONS_ENABLED", true),
      trialEnding: booleanValue("BRICKVALUE_TRIAL_REMINDER_NOTIFICATIONS_ENABLED", true),
      accountAction: booleanValue("BRICKVALUE_ACCOUNT_ALERTS_ENABLED", true),
    },
  };
}
