import Jimp from "jimp";

import { BrickognizeUnavailableError, identifyNonSet } from "./brickognize";
import {
  assignDetectionsToRegions,
  mergeBulkDetections,
  planAccuracyBulkRecoveryCrops,
  planPhotoLibraryFallbackCrops,
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
  reviewItems: Array<{
    detection: NonSetDetection;
    candidates: Array<{
      id: string;
      score: number;
      result: MinifigLookupPayload;
    }>;
  }>;
  unresolvedRegions: BulkManifestRegion[];
  unresolvedCount: number;
  partial: boolean;
  timings: BulkScanTimings;
};

export type BulkScanSource = "camera" | "photoLibrary";

export async function runBulkMinifigScan(
  imageFile: File,
  regions: BulkManifestRegion[],
  options: { guided?: boolean; source?: BulkScanSource } = {}
): Promise<BulkMinifigScanResult> {
  const startedAt = performance.now();
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const source = await Jimp.read(imageBuffer);
  const imageWidth = source.bitmap.width;
  const imageHeight = source.bitmap.height;
  const guided = options.guided !== false;
  const scanSource = options.source ?? "camera";
  const regionLimit = scanSource === "photoLibrary" ? 40 : 10;
  const crops = guided && regions.length ? planGuidedBulkCrops(regions, regionLimit) : [];
  const accuracyRecoveryCrops = scanSource === "photoLibrary"
    ? planPhotoLibraryFallbackCrops()
    : planAccuracyBulkRecoveryCrops();
  const maxGuidedProviderRequests = 8;
  const coverageCrops = regions.length < 4
    ? accuracyRecoveryCrops
      .slice(0, Math.max(0, maxGuidedProviderRequests - crops.length))
      .map((boundingBox) => ({ boundingBox, regions: [] }))
    : [];
  const preprocessingFinishedAt = performance.now();

  const jobs: Array<() => Promise<NonSetDetection[]>> = [
    () => identifyNonSet(imageFile, {
      bulk: true,
      skipRecovery: true,
      throwOnFailure: true,
      timeoutMilliseconds: 9_000,
    }).then((response) => response.detections),
    ...crops.map((crop, index) => () => identifyCrop(source, crop, index, imageWidth, imageHeight)),
    ...coverageCrops.map((crop, index) => () => identifyCrop(
      source,
      crop,
      crops.length + index,
      imageWidth,
      imageHeight,
      5_000
    )),
  ];
  const firstWave = await allSettledWithConcurrency(jobs, 3);
  const fulfilled = firstWave.filter(
    (result): result is PromiseFulfilledResult<NonSetDetection[]> => result.status === "fulfilled"
  );
  if (!fulfilled.length) throw new BrickognizeUnavailableError();

  const collected = fulfilled.flatMap((result) => result.value);
  let providerRequests = jobs.length;
  let partial = firstWave.some((result) => result.status === "rejected");
  const unresolved = guided ? unresolvedBulkRegions(regions, collected) : [];
  const detectedCount = mergeBulkDetections(collected, regionLimit).length;
  const shouldRunCoverageRecovery = regions.length < 4 || detectedCount < Math.min(4, regions.length);
  const recoveryBudgetMilliseconds = 10_000;
  if (shouldRunCoverageRecovery && coverageCrops.length === 0 && performance.now() - startedAt < recoveryBudgetMilliseconds) {
    const recoveryCrops = accuracyRecoveryCrops
      .slice(0, Math.max(0, maxGuidedProviderRequests - crops.length))
      .map((boundingBox) => ({
      boundingBox,
      regions: [],
    }));
    const retries = await allSettledWithConcurrency(
      recoveryCrops.map((crop, index) => () => identifyCrop(
        source,
        crop,
        crops.length + index,
        imageWidth,
        imageHeight,
        5_000
      )),
      3
    );
    providerRequests += retries.length;
    partial ||= retries.some((result) => result.status === "rejected");
    collected.push(...retries.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  }

  // Library requests already spend their guided budget across the eight
  // spatial groups. Leave remaining regions for the in-app recovery flow
  // instead of turning a dense photo into one provider request per figure.
  if (scanSource === "camera" && unresolved.length && performance.now() - startedAt < recoveryBudgetMilliseconds) {
    const guidedRequestsUsed = crops.length + coverageCrops.length;
    const retries = await allSettledWithConcurrency(
      unresolved
        .slice(0, Math.max(0, maxGuidedProviderRequests - guidedRequestsUsed))
        .map((region, index) => () => identifyCrop(
          source,
          { boundingBox: paddedRegionBox(region.boundingBox, 0.4), regions: [region] },
          crops.length + coverageCrops.length + index,
          imageWidth,
          imageHeight,
          4_000
        )),
      3
    );
    providerRequests += retries.length;
    partial ||= retries.some((result) => result.status === "rejected");
    collected.push(...retries.flatMap((result) => result.status === "fulfilled" ? result.value : []));
  }

  const explicitlyAssignedRegionIDs = new Set(
    collected.map((detection) => detection.regionId).filter((value): value is string => Boolean(value))
  );
  const unassignedRegions = regions.filter((region) => !explicitlyAssignedRegionIDs.has(region.regionId));
  const assignedRecoveryDetections = assignDetectionsToRegions(
    collected.filter((detection) => !detection.regionId),
    unassignedRegions
  );
  const assignedRecoveryKeys = new Set(assignedRecoveryDetections.map(detectionKey));
  const detections = mergeBulkDetections([
    ...collected.filter((detection) => Boolean(detection.regionId)),
    ...assignedRecoveryDetections,
    ...collected.filter((detection) => !detection.regionId && !assignedRecoveryKeys.has(detectionKey(detection))),
  ], regionLimit);
  const identificationFinishedAt = performance.now();
  const candidateIDs = detections.flatMap((detection) => [
    detection.id,
    ...(detection.alternatives ?? []).map((candidate) => candidate.id),
  ]);
  const lookupRows = await lookupBulkMinifigures(candidateIDs, 5, regionLimit);
  const pricedByIdentifier = new Map(
    lookupRows.filter(hasUsableMinifigPrice).map((row) => [row.figNumber.toLowerCase(), row.result])
  );
  const clearItems: BulkMinifigScanResult["items"] = [];
  const reviewItems: BulkMinifigScanResult["reviewItems"] = [];
  for (const detection of detections) {
    const candidates = [
      { id: detection.id, score: detection.score },
      ...(detection.alternatives ?? []),
    ]
      .filter((candidate, index, all) => all.findIndex((item) => item.id.toLowerCase() === candidate.id.toLowerCase()) === index)
      .map((candidate) => ({
        ...candidate,
        result: pricedByIdentifier.get(candidate.id.toLowerCase()),
      }))
      .filter((candidate): candidate is { id: string; score: number; result: MinifigLookupPayload } => Boolean(candidate.result))
      .slice(0, 3);
    const runnerUpScore = detection.alternatives?.find(
      (candidate) => candidate.id.toLowerCase() !== detection.id.toLowerCase()
    )?.score ?? null;
    const primaryCandidate = candidates.find(
      (candidate) => candidate.id.toLowerCase() === detection.id.toLowerCase()
    );
    const isAmbiguous = detection.score < 0.8 || !primaryCandidate || Boolean(
      runnerUpScore !== null && detection.score - runnerUpScore < 0.08
    );
    if (isAmbiguous) {
      if (candidates.length) reviewItems.push({ detection, candidates });
    } else if (primaryCandidate) {
      clearItems.push({ detection, result: primaryCandidate.result });
    }
  }
  const resolvedDetections = [...clearItems, ...reviewItems].map((item) => item.detection);
  const unresolvedRegions = unresolvedBulkRegions(regions, resolvedDetections);
  const finishedAt = performance.now();

  return {
    items: clearItems,
    reviewItems,
    unresolvedRegions,
    unresolvedCount: unresolvedRegions.length,
    partial,
    timings: {
      preprocessing_ms: Math.round(preprocessingFinishedAt - startedAt),
      identification_ms: Math.round(identificationFinishedAt - preprocessingFinishedAt),
      pricing_ms: Math.round(finishedAt - identificationFinishedAt),
      total_ms: Math.round(finishedAt - startedAt),
      provider_requests: providerRequests,
    },
  };
}

function detectionKey(detection: NonSetDetection): string {
  const box = detection.bounding_box;
  if (!box) return `${detection.id}:no-box:${detection.score}`;
  return [
    detection.id.toLowerCase(),
    box.left,
    box.top,
    box.right,
    box.bottom,
    box.imageWidth,
    box.imageHeight,
  ].join(":");
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
  if (Math.max(cropped.bitmap.width, cropped.bitmap.height) < 896) cropped.scaleToFit(896, 896);
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

async function allSettledWithConcurrency<T>(
  jobs: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<PromiseSettledResult<T>>> {
  const results = new Array<PromiseSettledResult<T>>(jobs.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), jobs.length);

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= jobs.length) return;
      try {
        results[index] = { status: "fulfilled", value: await jobs[index]() };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
