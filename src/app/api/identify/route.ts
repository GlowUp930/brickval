import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@/lib/anthropic";

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

const BRICKOGNIZE_URL = "https://api.brickognize.com/predict/";

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];
type Candidate = { id: string; score: number };
type IdentificationResponse = {
  set_number: string | null;
  confidence?: number | null;
  candidates?: Candidate[];
};

function isAcceptedMediaType(type: string): type is AcceptedMediaType {
  return ACCEPTED_MEDIA_TYPES.includes(type as AcceptedMediaType);
}

// ── Minifig identification via Brickognize ────────────────────────────────────

// Return the top Brickognize candidate; prefer minifig types but fallback to any
async function identifyMinifig(imageFile: File): Promise<{ best: string | null; candidates: Candidate[] }> {
  const brickognizeForm = new FormData();
  brickognizeForm.append("query_image", imageFile, "image.jpg");

  let res: Response;
  try {
    res = await fetch(BRICKOGNIZE_URL, {
      method: "POST",
      headers: { accept: "application/json" },
      body: brickognizeForm,
    });
  } catch (err) {
    console.error("[identify] Brickognize network error:", err);
    return { best: null, candidates: [] };
  }

  if (!res.ok) {
    console.warn("[identify] Brickognize returned", res.status);
    return { best: null, candidates: [] };
  }

  let data: { items?: { id?: string; external_id?: string; score?: number; name?: string; type?: string }[] };
  try {
    data = await res.json();
  } catch {
    return { best: null, candidates: [] };
  }

  const items = (data.items ?? []).map((i) => ({
    id: i.id ?? i.external_id,
    type: (i.type ?? "").toLowerCase(),
    score: i.score ?? 0,
  })).filter((c) => Boolean(c.id));

  const preferred = items.filter((c) => c.type === "fig" || c.type === "minifig");
  const pool = preferred.length ? preferred : items;
  const candidates = pool
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((c) => ({ id: c.id!.trim().toLowerCase(), score: c.score }))
    .filter((c) => c.id.length >= 3 && c.id.length <= 16 && /^[a-z0-9]+$/.test(c.id))
    .filter((c) => preferred.length ? c.score >= MIN_SCORE : true);

  return { best: candidates[0]?.id ?? null, candidates };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  await auth();

  const mode = req.nextUrl.searchParams.get("mode") ?? "set";

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
    const { best, candidates } = await identifyMinifig(imageFile);
    return NextResponse.json({
      set_number: best,
      confidence: candidates[0]?.score ?? null,
      candidates: candidates.slice(0, 4),
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
