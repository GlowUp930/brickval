import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import Jimp from "jimp";

const defaultAudit = "/Users/holamchan/Desktop/brickval-mobile/ml-work/brickval-camera-audit-2026-08-05";
const auditDirectory = resolve(process.env.BULK_AUDIT_DIR ?? defaultAudit);
const endpoint = process.env.BULK_SCAN_URL ?? "http://localhost:3000/api/minifig/bulk-scan";
const requested = process.argv.slice(2);
const fallbackFiles = ["IMG_9910.jpg", "IMG_9913.jpg", "IMG_9916.jpg", "IMG_9935.jpg"];
const files = requested.length ? requested : fallbackFiles;

const truth = await loadGroundTruth(resolve(auditDirectory, "ground-truth.csv"));
const rows: Array<Record<string, string | number | boolean>> = [];

for (const filename of files) {
  const expected = truth.get(filename);
  if (expected === undefined) throw new Error(`Missing ground truth for ${filename}`);
  const source = await readFile(resolve(auditDirectory, "images", filename));
  const image = await prepareImage(source);
  const form = new FormData();
  const imageBuffer = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;
  form.append("image", new File([imageBuffer], filename, { type: "image/jpeg" }));
  const regions = await loadRegions(filename);
  form.append("regions", JSON.stringify(regions));
  const startedAt = performance.now();
  const response = await fetch(endpoint, { method: "POST", body: form });
  const payload = await response.json() as {
    items?: Array<{ detection?: { id?: string } }>;
    timings?: { provider_requests?: number; total_ms?: number };
    message?: string;
  };
  const returned = payload.items?.length ?? 0;
  rows.push({
    image: basename(filename),
    expected,
    returned,
    ids: payload.items?.map((item) => item.detection?.id ?? "?").join("|") ?? "",
    exact: expected === returned,
    http: response.status,
    client_ms: Math.round(performance.now() - startedAt),
    server_ms: payload.timings?.total_ms ?? -1,
    provider_calls: payload.timings?.provider_requests ?? -1,
    message: payload.message ?? "",
  });
}

async function loadRegions(filename: string) {
  const labelPath = resolve(
    auditDirectory,
    "manual-reviewed-yolo-v2",
    "labels",
    filename.replace(/\.jpe?g$/i, ".txt")
  );
  let labels = "";
  try {
    labels = await readFile(labelPath, "utf8");
  } catch {
    return [];
  }
  return labels.trim().split(/\r?\n/).filter(Boolean).slice(0, 10).map((line, index) => {
    const [, centerX, centerY, width, height] = line.split(/\s+/).map(Number);
    return {
      regionId: `audit-${index + 1}`,
      boundingBox: {
        x: Math.max(0, centerX - width / 2),
        y: Math.max(0, centerY - height / 2),
        width: Math.min(width, 1),
        height: Math.min(height, 1),
      },
    };
  });
}

async function prepareImage(source: Buffer): Promise<Buffer> {
  const image = await Jimp.read(source);
  if (Math.max(image.bitmap.width, image.bitmap.height) > 1600) image.scaleToFit(1600, 1600);
  for (const quality of [76, 64, 52, 40, 30]) {
    const output = await image.clone().quality(quality).getBufferAsync("image/jpeg");
    if (output.byteLength <= 700 * 1024) return output;
  }
  throw new Error("Benchmark image cannot fit the production upload limit");
}

console.table(rows);
const exact = rows.filter((row) => row.exact).length;
console.log(`Exact count: ${exact}/${rows.length}`);
if (rows.some((row) => Number(row.http) >= 500)) process.exitCode = 1;

async function loadGroundTruth(path: string): Promise<Map<string, number>> {
  const csv = await readFile(path, "utf8");
  return new Map(csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const [filename, count] = line.split(",", 3);
    return [filename, Number(count)];
  }));
}
