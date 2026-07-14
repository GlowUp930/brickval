import Jimp from "jimp";
import {
  buildBrickognizeBulkScanCrops,
  buildBrickognizeRecoveryCrops,
  MINIFIG_DETECTION_LIMIT,
  analyzeBrickognizeSearchResponse,
  normalizeBrickognizeDetections,
  normalizeBrickognizeSearchResponse,
  withStableRegionIds,
  type BrickognizeSearchResponse,
  type NonSetDetection,
} from "./identify-nonset";

const BRICKOGNIZE_SEARCH_URL = "https://api.brickognize.com/internal/search/?external_catalogs=bricklink&predict_color=true";

export interface NonSetIdentifyResponse {
  detections: NonSetDetection[];
  scansUsed?: number;
  isPro?: boolean;
}

export async function identifyNonSet(
  imageFile: File,
  options: { bulk?: boolean; skipRecovery?: boolean } = {}
): Promise<NonSetIdentifyResponse> {
  async function postBrickognize(image: Blob, filename: string): Promise<Response | null> {
    const form = new FormData();
    form.append("query_image", image, filename);

    try {
      return await fetch(BRICKOGNIZE_SEARCH_URL, {
        method: "POST",
        headers: { accept: "application/json" },
        body: form,
      });
    } catch (err) {
      console.error("[identify] Brickognize network error:", err);
      return null;
    }
  }

  const searchRes = await postBrickognize(imageFile, imageFile.name || "image.jpg");
  if (!searchRes?.ok) {
    if (searchRes) console.warn("[identify] Brickognize search returned", searchRes.status);
    return { detections: [] };
  }

  let searchData: BrickognizeSearchResponse;
  try {
    searchData = (await searchRes.json()) as BrickognizeSearchResponse;
  } catch {
    return { detections: [] };
  }

  const analysis = analyzeBrickognizeSearchResponse(searchData);
  const collectedDetections = [...analysis.detections.all];
  const mergeDetections = () =>
    withStableRegionIds(normalizeBrickognizeDetections(
      collectedDetections.map((detection) => ({
        id: detection.id,
        type: detection.item_type,
        score: detection.score,
        alternatives: detection.alternatives,
        bounding_box: detection.bounding_box,
      }))
    ).all);

  if (options.skipRecovery || (!options.bulk && collectedDetections.length >= 2)) {
    return { detections: mergeDetections() };
  }

  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  let sourceImage: Awaited<ReturnType<typeof Jimp.read>> | null = null;
  let searchWidth = 0;
  let searchHeight = 0;
  try {
    sourceImage = await Jimp.read(imageBuffer);
    if (Math.max(sourceImage.bitmap.width, sourceImage.bitmap.height) > 1024) {
      sourceImage.scaleToFit(1024, 1024);
    }
    searchWidth = sourceImage.bitmap.width;
    searchHeight = sourceImage.bitmap.height;
  } catch {
    sourceImage = null;
  }

  if (!sourceImage || !searchWidth || !searchHeight) return { detections: mergeDetections() };

  const decodedImage = sourceImage;
  const recoveryCrops = options.bulk
    ? buildBrickognizeBulkScanCrops(searchData, searchWidth, searchHeight)
    : buildBrickognizeRecoveryCrops(searchData, searchWidth, searchHeight);
  if (!recoveryCrops.length) return { detections: mergeDetections() };

  async function identifyCrop(crop: { left: number; top: number; width: number; height: number }) {
    const croppedImage = decodedImage.clone().crop(crop.left, crop.top, crop.width, crop.height).quality(88);
    const croppedBuffer = await croppedImage.getBufferAsync("image/jpeg");
    const croppedArrayBuffer = croppedBuffer.buffer.slice(
      croppedBuffer.byteOffset,
      croppedBuffer.byteOffset + croppedBuffer.byteLength
    ) as ArrayBuffer;
    const cropRes = await postBrickognize(new Blob([croppedArrayBuffer], { type: "image/jpeg" }), "image.jpg");
    if (!cropRes?.ok) {
      if (cropRes) console.warn("[identify] Brickognize crop search returned", cropRes.status);
      return [];
    }

    let cropData: BrickognizeSearchResponse;
    try {
      cropData = (await cropRes.json()) as BrickognizeSearchResponse;
    } catch {
      return [];
    }

    return normalizeBrickognizeSearchResponse(cropData).all.map((detection) => {
      if (!detection.bounding_box) return detection;
      return {
        ...detection,
        bounding_box: {
          left: crop.left + detection.bounding_box.left,
          top: crop.top + detection.bounding_box.top,
          right: crop.left + detection.bounding_box.right,
          bottom: crop.top + detection.bounding_box.bottom,
          imageWidth: searchWidth,
          imageHeight: searchHeight,
        },
      };
    });
  }

  const CROP_BATCH_SIZE = 4;
  for (let i = 0; i < recoveryCrops.length && mergeDetections().length < MINIFIG_DETECTION_LIMIT; i += CROP_BATCH_SIZE) {
    const cropResults = await Promise.all(recoveryCrops.slice(i, i + CROP_BATCH_SIZE).map(identifyCrop));
    collectedDetections.push(...cropResults.flat());
  }

  return { detections: mergeDetections() };
}
