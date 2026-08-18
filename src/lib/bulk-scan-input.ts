import {
  MAX_CAMERA_BULK_REGIONS,
  MAX_LIBRARY_BULK_REGIONS,
  parseBulkRegions,
  type BulkManifestRegion,
} from "./bulk-identify";

export type BulkScanInputSource = "camera" | "photoLibrary";

export type BulkScanInput = {
  image: File;
  regions: BulkManifestRegion[];
  scanSource: BulkScanInputSource;
};

export type BulkScanInputError = {
  code: "invalid_image" | "invalid_regions";
  message: string;
  status: 400;
  scanSource: BulkScanInputSource;
  regionCount: number | null;
};

export type BulkScanInputResult =
  | { ok: true; value: BulkScanInput }
  | { ok: false; error: BulkScanInputError };

export function parseBulkScanInput(formData: FormData): BulkScanInputResult {
  const image = formData.get("image");
  const scanSource: BulkScanInputSource = formData.get("scanSource") === "photoLibrary"
    ? "photoLibrary"
    : "camera";
  const regionValue = formData.get("regions");
  const regionCount = countRegionEntries(regionValue);
  const regionLimit = scanSource === "photoLibrary"
    ? MAX_LIBRARY_BULK_REGIONS
    : MAX_CAMERA_BULK_REGIONS;
  const regions = parseBulkRegions(regionValue, regionLimit);

  if (!(image instanceof File)) {
    return {
      ok: false,
      error: {
        code: "invalid_image",
        message: "A JPEG image is required for a bulk scan.",
        status: 400,
        scanSource,
        regionCount,
      },
    };
  }

  if (regions === null) {
    return {
      ok: false,
      error: {
        code: "invalid_regions",
        message: `The scan included an invalid region list. ${scanSource === "photoLibrary" ? "Photo-library scans support up to 40 figures." : "Camera scans support up to 10 figures."}`,
        status: 400,
        scanSource,
        regionCount,
      },
    };
  }

  return { ok: true, value: { image, regions, scanSource } };
}

function countRegionEntries(value: unknown): number | null {
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}
