import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import {
  planBulkScan,
  type BulkScanRegion,
  type BulkScanPlan,
} from "./bulk-scan-plan";

const MAX_SHARD_BYTES = 700 * 1024;
const MAX_TOTAL_BYTES = Math.floor(3.5 * 1024 * 1024);
const SHARD_LONG_EDGE = 1600;

export interface PreparedBulkCapture {
  imageUris: string[];
  manifest: {
    shards: Array<{
      shardId: string;
      imageIndex: number;
      regions: Array<{
        regionId: string;
        boundingBox: { x: number; y: number; width: number; height: number };
      }>;
    }>;
  };
  overflowRegionIds: string[];
}

export async function prepareBulkCapture(
  photoUri: string,
  regions: BulkScanRegion[]
): Promise<PreparedBulkCapture> {
  const dimensions = await Image.getSize(photoUri);
  const plan = planBulkScan(regions);
  const imageUris: string[] = [];
  const manifest: PreparedBulkCapture["manifest"] = { shards: [] };
  let totalBytes = 0;

  for (const [imageIndex, shard] of plan.shards.entries()) {
    const context = ImageManipulator.manipulate(photoUri);
    let rendered: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
    try {
      const crop = {
        originX: Math.round(shard.crop.x * dimensions.width),
        originY: Math.round(shard.crop.y * dimensions.height),
        width: Math.max(1, Math.round(shard.crop.width * dimensions.width)),
        height: Math.max(1, Math.round(shard.crop.height * dimensions.height)),
      };
      crop.width = Math.min(crop.width, dimensions.width - crop.originX);
      crop.height = Math.min(crop.height, dimensions.height - crop.originY);
      context.crop(crop);
      const longEdge = Math.max(crop.width, crop.height);
      if (longEdge > SHARD_LONG_EDGE) {
        const scale = SHARD_LONG_EDGE / longEdge;
        context.resize({ width: Math.round(crop.width * scale), height: Math.round(crop.height * scale) });
      }
      rendered = await context.renderAsync();
      let saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72 });
      for (const compression of [0.58, 0.45]) {
        if (new File(saved.uri).size <= MAX_SHARD_BYTES) break;
        saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: compression });
      }
      const bytes = new File(saved.uri).size;
      if (bytes > MAX_SHARD_BYTES || totalBytes + bytes > MAX_TOTAL_BYTES) {
        throw new Error("Bulk scan images exceed the safe upload limit");
      }
      totalBytes += bytes;
      imageUris.push(saved.uri);
      manifest.shards.push({
        shardId: shard.shardId,
        imageIndex,
        regions: regionsForShard(plan, shard.regionIds).map((region) => ({
          regionId: region.regionId,
          boundingBox: relativeBox(region.boundingBox, shard.crop),
        })),
      });
    } finally {
      context.release();
      rendered?.release();
    }
  }

  return { imageUris, manifest, overflowRegionIds: plan.overflowRegionIds };
}

function regionsForShard(plan: BulkScanPlan, regionIds: string[]): BulkScanRegion[] {
  const wanted = new Set(regionIds);
  return plan.regions.filter((region) => wanted.has(region.regionId));
}

function relativeBox(
  box: BulkScanRegion["boundingBox"],
  crop: BulkScanPlan["shards"][number]["crop"]
) {
  return {
    x: clamp((box.x - crop.x) / crop.width),
    y: clamp((box.y - crop.y) / crop.height),
    width: clamp(box.width / crop.width),
    height: clamp(box.height / crop.height),
  };
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
