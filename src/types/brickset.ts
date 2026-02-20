export interface BricksetLEGOComRegion {
  retailPrice: number | null;
  dateFirstAvailable: string | null;
  dateLastAvailable: string | null;
}

export interface BricksetSet {
  setID: number;
  name: string;
  number: string;
  numberVariant: number;
  theme: string;
  themeGroup: string;
  subtheme: string;
  year: number;
  pieces: number | null;
  minifigs: number | null;
  image: {
    thumbnailURL: string;
    imageURL: string;
  };
  LEGOCom: {
    US: BricksetLEGOComRegion;
    UK: BricksetLEGOComRegion;
    CA: BricksetLEGOComRegion;
    DE: BricksetLEGOComRegion;
  };
  rating: number;
  reviewCount: number;
  // exitDate is the most reliable retirement signal
  exitDate: string | null;
}

/**
 * Derive retirement status from Brickset data.
 * Returns 'retired' | 'active' | 'unknown'
 */
export function getRetirementStatus(
  set: BricksetSet
): "retired" | "active" | "unknown" {
  const now = new Date();

  // exitDate is the most direct signal
  if (set.exitDate) {
    return new Date(set.exitDate) < now ? "retired" : "active";
  }

  // Fall back to checking any regional dateLastAvailable
  const regions = [set.LEGOCom?.US, set.LEGOCom?.UK, set.LEGOCom?.CA, set.LEGOCom?.DE];
  for (const region of regions) {
    if (region?.dateLastAvailable) {
      return new Date(region.dateLastAvailable) < now ? "retired" : "active";
    }
  }

  return "unknown";
}
