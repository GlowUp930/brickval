import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Jimp from "jimp";
import { anthropic } from "@/lib/anthropic";
import {
  buildBrickognizeRecoveryCrops,
  analyzeBrickognizeSearchResponse,
  normalizeBrickognizeDetections,
  normalizeBrickognizeSearchResponse,
  type BrickognizeSearchResponse,
} from "@/lib/identify-nonset";
import { checkAndIncrementScan } from "@/lib/scan-gate";

const MIN_SCORE = 0.50; // minimum Brickognize confidence we trust when a preferred type exists

const VISION_PROMPT = `Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit number printed on the front lower-right corner, back panel, or near the barcode.

Return ONLY valid JSON in this shape:
{"set_number":"75192","confidence":0.93,"candidates":[{"id":"75192","score":0.93},{"id":"75257","score":0.41}]}

Rules:
- set_number is your best guess, or null if you are not confident.
- confidence is a number from 0 to 1 for your best guess.
- candidates is an ordered list of up to 4 likely set numbers.
- Only include numbers you can justify from the image.
- Do not guess wildly. Do not include hyphens or suffixes.`;

const BRICKOGNIZE_SEARCH_URL = "https://api.brickognize.com/internal/search/?external_catalogs=bricklink&predict_color=true";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];
type Candidate = { id: string; score: number };
type IdentificationResponse = {
  set_number: string | null;
  confidence?: number | null;
  candidates?: Candidate[];
};
type NonSetIdentifyResponse = {
  detections: { id: string; item_type: "minifig" | "part"; score: number }[];
  scansUsed?: number;
  isPro?: boolean;
};

function isAcceptedMediaType(type: string): type is AcceptedMediaType {
  return ACCEPTED_MEDIA_TYPES.includes(type as AcceptedMediaType);
}

async function identifyNonSet(imageFile: File): Promise<NonSetIdentifyResponse> {
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
    if (searchRes) {
      console.warn("[identify] Brickognize search returned", searchRes.status);
    }
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
    normalizeBrickognizeDetections(
      collectedDetections.map((detection) => ({
        id: detection.id,
        type: detection.item_type,
        score: detection.score,
      }))
    ).all;

  if (
    collectedDetections.length >= 2 ||
    (collectedDetections.length === 1 && (analysis.topScore ?? 0) >= 0.88)
  ) {
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

  if (!sourceImage || !searchWidth || !searchHeight) {
    return { detections: mergeDetections() };
  }

  const recoveryCrops = buildBrickognizeRecoveryCrops(searchData, searchWidth, searchHeight).slice(0, 3);
  if (!recoveryCrops.length) {
    return { detections: mergeDetections() };
  }

  for (const crop of recoveryCrops) {
    const croppedImage = sourceImage
      .clone()
      .crop(crop.left, crop.top, crop.width, crop.height)
      .quality(88);

    const croppedBuffer = await croppedImage.getBufferAsync("image/jpeg");
    const croppedArrayBuffer = croppedBuffer.buffer.slice(
      croppedBuffer.byteOffset,
      croppedBuffer.byteOffset + croppedBuffer.byteLength
    ) as ArrayBuffer;
    const cropRes = await postBrickognize(new Blob([croppedArrayBuffer], { type: "image/jpeg" }), "image.jpg");

    if (!cropRes?.ok) {
      if (cropRes) {
        console.warn("[identify] Brickognize crop search returned", cropRes.status);
      }
      continue;
    }

    let cropData: BrickognizeSearchResponse;
    try {
      cropData = (await cropRes.json()) as BrickognizeSearchResponse;
    } catch {
      continue;
    }

    const cropDetections = normalizeBrickognizeSearchResponse(cropData).all;
    if (cropDetections.length > 0) {
      collectedDetections.push(...cropDetections);
    }
  }

  return { detections: mergeDetections() };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  const mode = req.nextUrl.searchParams.get("mode") ?? "set";
  if (mode !== "set" && mode !== "minifig") {
    return NextResponse.json({ error: "Invalid scan mode" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const imageFile = formData.get("image") as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: "Image too large",
        message: "Please upload a smaller image and try again.",
      },
      { status: 413 }
    );
  }

  const mediaType = imageFile.type;
  if (!isAcceptedMediaType(mediaType)) {
    return NextResponse.json(
      {
        error: "Unsupported image type",
        message: "Please upload a JPEG, PNG, or WebP image.",
      },
      { status: 415 }
    );
  }

  // ── Minifig mode: use Brickognize ─────────────────────────────────────────
  if (mode === "minifig") {
    const identified = await identifyNonSet(imageFile);

    if (!identified.detections.length) {
      return NextResponse.json({ detections: [] });
    }

    if (userId) {
      try {
        const gate = await checkAndIncrementScan(userId);
        if (!gate.allowed) {
          return NextResponse.json(
            {
              error: "paywall",
              message: "You've used all 5 free scans. Upgrade to Brickvalue Pro to continue.",
              scansUsed: gate.scansUsed,
            },
            { status: 402 }
          );
        }

        return NextResponse.json({
          detections: identified.detections,
          scansUsed: gate.scansUsed,
          isPro: gate.isPro,
        });
      } catch (err) {
        console.error("[identify] Scan gate error:", err);
        return NextResponse.json(
          { error: "internal", message: "Something went wrong. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      detections: identified.detections,
    });
  }

  // ── Set mode: use Claude Vision ───────────────────────────────────────────

  // Convert to base64 for Claude Vision
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let responseText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    responseText =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";
  } catch (err) {
    console.error("[identify] Claude Vision error:", err);
    return NextResponse.json(
      { error: "Vision API failed", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // Parse the JSON response from Claude
  let parsed: IdentificationResponse;
  try {
    // Claude should return only JSON, but strip any markdown code fences just in case
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[identify] Failed to parse Claude response:", responseText);
    // Treat unparseable response as "not found"
    return NextResponse.json({ set_number: null, confidence: null, candidates: [] });
  }

  // Validate the set number format (4–8 digits)
  if (parsed.set_number) {
    const cleaned = parsed.set_number.replace(/[^0-9]/g, "");
    if (cleaned.length < 4 || cleaned.length > 8) {
      parsed.set_number = null;
    } else {
      parsed.set_number = cleaned;
    }
  }

  const candidates = (parsed.candidates ?? [])
    .map((candidate) => {
      const cleaned = candidate.id.replace(/[^0-9]/g, "");
      const score = Number(candidate.score);
      return {
        id: cleaned,
        score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0,
      };
    })
    .filter((candidate) => candidate.id.length >= 4 && candidate.id.length <= 8)
    .slice(0, 4);

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : candidates[0]?.score ?? null;

  if (!candidates.length && parsed.set_number) {
    candidates.push({
      id: parsed.set_number,
      score: confidence ?? 0,
    });
  }

  return NextResponse.json({
    set_number: parsed.set_number ?? null,
    confidence,
    candidates,
  });
}
