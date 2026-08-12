import Jimp from "jimp";

import { BrickognizeUnavailableError, identifyNonSet } from "./brickognize";
import {
  assignDetectionsToRegions,
  mergeBulkDetections,
  planGuidedBulkCrops,
  unresolvedBulkRegions,
  type BulkManifestRegion,
  type GuidedBulkCrop,
  type NormalizedRegionBox,
} from "./bulk-identify";
import { hasUsableMinifigPrice, lookupBulkMinifigures } from "./bulk-minifig-lookup";
import type { NonSetDetection } from "./identify-nonset";
import type { MinifigLookupPayload } from "./minifig-lookup";

export type BulkScanTimings = {
  preprocessing_ms: number;
  identification_ms: number;
  pricing_ms: number;
  total_ms: number;
  provider_requests: number;
};

export type BulkMinifigScanResult = {
  items: Array<{
    detection: NonSetDetection;
    result: MinifigLookupPayload;
  }>;
  unresolvedCount: number;
  partial: boolean;
  timings: BulkScanTimings;
};

export async function runBulkMinifigScan(
  imageFile: File,
  regions: BulkManifestRegion[],
  options: { guided?: boolean } = {}
): Promise<BulkMinifigScanResult> {
  const startedAt = performance.now();
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const source = await Jimp.read(imageBuffer);
  const imageWidth = source.bitmap.width;
  const imageHeight = source.bitmap.height;
  const guided = options.guided !== false;
  const crops = guided ? planGuidedBulkCrops(regions) : [];
  const preprocessingFinishedAt = performance.now();

  const jobs: Array<Promise<NonSetDetection[]>> = [
    identifyNonSet(imageFile, {
      bulk: !guided,
      skipRecovery: guided,
      throwOnFailure: true,
      timeoutMilliseconds: 7_000,
    }).then((response) => response.detections),
    ...crops.map((crop, index) => identifyCrop(source, crop, index, imageWidth, imageHeight)),
  ];
  const firstWave = await Promise.allSettled(jobs);
  const fulfilled = firstWave.filter(
    (result): result is PromiseFulfilledResult<NonSetDetection[]> => result.status === "fulfilled"
  );
  if (!fulfilled.length) throw new BrickognizeUnavailableError();

  const collected = fulfilled.flatMap((result) => result.value);
  let providerRequests = jobs.length;
  let partial = firstWave.some((result) => result.status === "rejected");
  const unresolved = guided ? unresolvedBulkRegions(regions, collected).slice(0, 2) : [];
  if (unresolved.length && performance.now() - startedAt < 5_500) {
    const retries = await Promise.allSettled(unresolved.map((region, index) => identifyCrop(
      source,
      { boundingBox: paddedRegionBox(region.boundingBox, 0.3), regions: [region] },
      crops.length + index,
      imageWidth,
      imageHeight,
      2_500
    )));
    providerRequests += retries.length;
    partial ||= retries.some((result) => result.status === "rejected");
    collected.push(...retries.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  }

  const detections = mergeBulkDetections(collected);
  const identificationFinishedAt = performance.now();
  const lookupRows = await lookupBulkMinifigures(detections.map((detection) => detection.id));
  const pricedByIdentifier = new Map(
    lookupRows.filter(hasUsableMinifigPrice).map((row) => [row.figNumber.toLowerCase(), row.result])
  );
  const items = detections.flatMap((detection) => {
    const result = pricedByIdentifier.get(detection.id.toLowerCase());
    return result ? [{ detection, result }] : [];
  });
  const finishedAt = performance.now();

  return {
    items,
    unresolvedCount: unresolvedBulkRegions(regions, items.map((item) => item.detection)).length,
    partial,
    timings: {
      preprocessing_ms: Math.round(preprocessingFinishedAt - startedAt),
      identification_ms: Math.round(identificationFinishedAt - preprocessingFinishedAt),
      pricing_ms: Math.round(finishedAt - identificationFinishedAt),
      total_ms: Math.round(finishedAt - startedAt),
      provider_requests: guided ? providerRequests : -1,
    },
  };
}

async function identifyCrop(
  source: Awaited<ReturnType<typeof Jimp.read>>,
  crop: GuidedBulkCrop,
  index: number,
  imageWidth: number,
  imageHeight: number,
  timeoutMilliseconds = 7_000
): Promise<NonSetDetection[]> {
  const rect = pixelRect(crop.boundingBox, imageWidth, imageHeight);
  const cropped = source.clone().crop(rect.left, rect.top, rect.width, rect.height).quality(84);
  if (Math.max(cropped.bitmap.width, cropped.bitmap.height) > 1280) cropped.scaleToFit(1280, 1280);
  const data = await cropped.getBufferAsync("image/jpeg");
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const file = new File([arrayBuffer], `bulk-${index + 1}.jpg`, { type: "image/jpeg" });
  const response = await identifyNonSet(file, {
    skipRecovery: true,
    throwOnFailure: true,
    timeoutMilliseconds,
  });
  const localRegions = crop.regions.map((region) => ({
    ...region,
    boundingBox: boxRelativeToCrop(region.boundingBox, crop.boundingBox),
  }));
  const assigned = localRegions.length
    ? assignDetectionsToRegions(response.detections, localRegions)
    : response.detections;

  return assigned.map((detection) => {
    const box = detection.bounding_box;
    if (!box) return detection;
    const scaleX = rect.width / box.imageWidth;
    const scaleY = rect.height / box.imageHeight;
    return {
      ...detection,
      bounding_box: {
        left: rect.left + box.left * scaleX,
        top: rect.top + box.top * scaleY,
        right: rect.left + box.right * scaleX,
        bottom: rect.top + box.bottom * scaleY,
        imageWidth,
        imageHeight,
      },
    };
  });
}

function paddedRegionBox(box: NormalizedRegionBox, contextRatio: number): NormalizedRegionBox {
  const paddingX = box.width * contextRatio;
  const paddingY = box.height * contextRatio;
  const x = Math.max(0, box.x - paddingX);
  const y = Math.max(0, box.y - paddingY);
  return {
    x,
    y,
    width: Math.min(1, box.x + box.width + paddingX) - x,
    height: Math.min(1, box.y + box.height + paddingY) - y,
  };
}

function boxRelativeToCrop(box: NormalizedRegionBox, crop: NormalizedRegionBox): NormalizedRegionBox {
  return {
    x: (box.x - crop.x) / crop.width,
    y: (box.y - crop.y) / crop.height,
    width: box.width / crop.width,
    height: box.height / crop.height,
  };
}

function pixelRect(box: NormalizedRegionBox, width: number, height: number) {
  const left = Math.max(0, Math.floor(box.x * width));
  const top = Math.max(0, Math.floor(box.y * height));
  const right = Math.min(width, Math.ceil((box.x + box.width) * width));
  const bottom = Math.min(height, Math.ceil((box.y + box.height) * height));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}
