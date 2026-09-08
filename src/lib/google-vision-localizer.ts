import type { NormalizedRegionBox } from "./bulk-identify";

type GoogleVisionResponse = {
  responses?: Array<{
    localizedObjectAnnotations?: Array<{
      score?: number;
      boundingPoly?: { normalizedVertices?: Array<{ x?: number; y?: number }> };
    }>;
  }>;
};

export function googleVisionObjectLocalizationEnabled(): boolean {
  return process.env.BRICKVALUE_GOOGLE_VISION_ENABLED === "true"
    && Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY);
}

export async function localizeObjectsWithGoogleVision(file: File): Promise<NormalizedRegionBox[]> {
  if (!googleVisionObjectLocalizationEnabled()) return [];
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) return [];

  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requests: [{
        image: { content: bytes.toString("base64") },
        features: [{ type: "OBJECT_LOCALIZATION", maxResults: 60 }],
      }],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return [];

  const payload = await response.json() as GoogleVisionResponse;
  const minimumScore = Number(process.env.BRICKVALUE_GOOGLE_VISION_MIN_SCORE ?? "0.30");
  return (payload.responses?.[0]?.localizedObjectAnnotations ?? [])
    .filter((annotation) => Number(annotation.score ?? 0) >= minimumScore)
    .map((annotation) => {
      const vertices = annotation.boundingPoly?.normalizedVertices ?? [];
      const xs = vertices.map((vertex) => Number(vertex.x ?? 0));
      const ys = vertices.map((vertex) => Number(vertex.y ?? 0));
      const x = Math.max(0, Math.min(...xs, 1));
      const y = Math.max(0, Math.min(...ys, 1));
      const right = Math.max(x, Math.min(1, Math.max(...xs, 0)));
      const bottom = Math.max(y, Math.min(1, Math.max(...ys, 0)));
      return { x, y, width: right - x, height: bottom - y };
    })
    .filter((box) => box.width > 0.01 && box.height > 0.01);
}
