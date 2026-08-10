export interface MonetizationPolicy {
  version: number;
  gates: {
    singleDaily: boolean;
    bulkRepeat: boolean;
    collectionCapacity: boolean;
    marketHistory: boolean;
    appearance: boolean;
  };
  limits: {
    singleScansPerDay: number;
    introductoryBulkScans: number;
    collectionUniqueItems: number;
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

export function getMonetizationPolicy(): MonetizationPolicy {
  return {
    version: 1,
    gates: {
      singleDaily: booleanValue("BRICKVALUE_SINGLE_SCAN_GATE_ENABLED", false),
      bulkRepeat: booleanValue("BRICKVALUE_BULK_GATE_ENABLED", true),
      collectionCapacity: booleanValue("BRICKVALUE_COLLECTION_GATE_ENABLED", true),
      marketHistory: booleanValue("BRICKVALUE_MARKET_HISTORY_GATE_ENABLED", false),
      appearance: true,
    },
    limits: {
      singleScansPerDay: positiveInteger("BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY", 3),
      introductoryBulkScans: positiveInteger("BRICKVALUE_FREE_BULK_SCANS", 1),
      collectionUniqueItems: positiveInteger("BRICKVALUE_FREE_COLLECTION_ITEMS", 10),
    },
  };
}
