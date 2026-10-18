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
  lockedBulkPreview: boolean;
  notifications: {
    enabled: boolean;
    scanReset: boolean;
    trialEnding: boolean;
    accountAction: boolean;
    retention: boolean;
  };
  minimumAppBuild: number | null;
  appUpdateURL: string;
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

function optionalPositiveInteger(name: string): number | null {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getMonetizationPolicy(): MonetizationPolicy {
  return {
    version: 7,
    accessExperiment: {
      enabled: true,
      hardPaywallPercent: 100,
      trialDays: positiveInteger("BRICKVALUE_PRO_TRIAL_DAYS", 7),
    },
    gates: {
      singleDaily: true,
      bulkRepeat: true,
      collectionCapacity: booleanValue("BRICKVALUE_COLLECTION_GATE_ENABLED", true),
      marketHistory: booleanValue("BRICKVALUE_MARKET_HISTORY_GATE_ENABLED", false),
      appearance: true,
      offerCodes: booleanValue("BRICKVALUE_OFFER_CODES_ENABLED", true),
    },
    limits: {
      singleScansPerDay: 0,
      introductoryBulkScans: 0,
      collectionUniqueItems: 0,
    },
    lockedBulkPreview: false,
    notifications: {
      enabled: booleanValue("BRICKVALUE_NOTIFICATIONS_ENABLED", true),
      scanReset: false,
      trialEnding: booleanValue("BRICKVALUE_TRIAL_REMINDER_NOTIFICATIONS_ENABLED", true),
      accountAction: booleanValue("BRICKVALUE_ACCOUNT_ALERTS_ENABLED", true),
      retention: booleanValue("BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED", false),
    },
    // Keep this unset until the replacement build is live in the App Store.
    minimumAppBuild: optionalPositiveInteger("BRICKVALUE_MINIMUM_IOS_BUILD"),
    appUpdateURL: process.env.BRICKVALUE_IOS_UPDATE_URL?.trim() ||
      "https://apps.apple.com/au/app/brickvalue/id6771715475",
  };
}
