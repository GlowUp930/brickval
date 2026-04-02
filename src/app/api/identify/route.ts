import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@/lib/anthropic";
import type { IdentifyCandidate } from "@/types/scan";

// Minifig: minimum Brickognize confidence to trust when a preferred type exists
const MIN_SCORE = 0.50;

// Low-confidence thresholds
const SET_CONF_THRESHOLD  = 0.85; // below this → uncertain
const SET_GAP_THRESHOLD   = 0.12; // top-two gap below this → uncertain
const FIG_CONF_THRESHOLD  = 0.75;
const FIG_GAP_THRESHOLD   = 0.12;

const VISION_PROMPT = `Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit number on the front lower-right corner, back panel, or near the barcode.

Return ONLY valid JSON with up to 3 plausible set numbers ordered by confidence (0.0–1.0):
{"candidates": [{"set_number": "75192", "confidence": 0.95}]}

Include up to 3 if there is genuine ambiguity. Return {"candidates": []} if you cannot find any set number with confidence. Do not guess. Do not include hyphens or suffixes.`;

const BRICKOGNIZE_URL = "https://api.brickognize.com/predict/";

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];

function isAcceptedMediaType(type: string): type is AcceptedMediaType {
  return ACCEPTED_MEDIA_TYPES.includes(type as AcceptedMediaType);
}

// ── Minifig identification via Brickognize ────────────────────────────────────

async function identifyMinifig(imageFile: File): Promise<{ best: string | null; candidates: IdentifyCandidate[] }> {
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
  const candidates: IdentifyCandidate[] = pool
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((c) => ({ id: c.id!.trim().toLowerCase(), confidence: c.score }))
    .filter((c) => c.id.length >= 3 && c.id.length <= 16 && /^[a-z0-9]+$/.test(c.id))
    .filter((c) => preferred.length ? c.confidence >= MIN_SCORE : true)
    .slice(0, 3);

  return { best: candidates[0]?.id ?? null, candidates };
}

// ── Low-confidence decision helpers ──────────────────────────────────────────

function needsConfirmationSet(candidates: IdentifyCandidate[]): boolean {
  if (candidates.length < 2) return false;
  const top = candidates[0].confidence;
  const gap = top - candidates[1].confidence;
  return top < SET_CONF_THRESHOLD || gap < SET_GAP_THRESHOLD;
}

function needsConfirmationFig(candidates: IdentifyCandidate[]): boolean {
  if (candidates.length < 2) return false;
  const top = candidates[0].confidence;
  const gap = top - candidates[1].confidence;
  return top < FIG_CONF_THRESHOLD || gap < FIG_GAP_THRESHOLD;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "set";

  // ── TEST ONLY: force low-confidence path without a real image ─────────────
  if (req.nextUrl.searchParams.get("force_confirm") === "1") {
    if (mode === "minifig") {
      return NextResponse.json({
        set_number: "sw0001",
        confidence: 0.71,
        needs_confirmation: true,
        candidates: [
          { id: "sw0001", confidence: 0.71 },
          { id: "sw0083", confidence: 0.65 },
          { id: "sw0295", confidence: 0.58 },
        ],
      });
    }
    return NextResponse.json({
      set_number: "75192",
      confidence: 0.78,
      needs_confirmation: true,
      candidates: [
        { id: "75192", confidence: 0.78 },
        { id: "75105", confidence: 0.72 },
        { id: "4504",  confidence: 0.61 },
      ],
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const imageFile = formData.get("image") as File | null;
  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const mediaType = imageFile.type;
  if (!isAcceptedMediaType(mediaType)) {
    return NextResponse.json(
      { error: "Unsupported image type", message: "Please upload a JPEG, PNG, or WebP image." },
      { status: 415 }
    );
  }

  // ── Minifig mode: use Brickognize ─────────────────────────────────────────
  if (mode === "minifig") {
    const { best, candidates } = await identifyMinifig(imageFile);
    if (!best) {
      return NextResponse.json({ set_number: null, confidence: 0, needs_confirmation: false, candidates: [] });
    }
    const needs_confirmation = needsConfirmationFig(candidates);
    return NextResponse.json({
      set_number: best,
      confidence: candidates[0]?.confidence ?? 0,
      needs_confirmation,
      candidates,
    });
  }

  // ── Set mode: use Claude Vision ───────────────────────────────────────────
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let responseText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    });
    responseText = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  } catch (err) {
    console.error("[identify] Claude Vision error:", err);
    return NextResponse.json(
      { error: "Vision API failed", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // Parse multi-candidate JSON response
  let parsed: { candidates?: Array<{ set_number?: string | null; confidence?: number }> };
  try {
    const cleaned = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[identify] Failed to parse Claude response:", responseText);
    return NextResponse.json({ set_number: null, confidence: 0, needs_confirmation: false, candidates: [] });
  }

  // Validate, normalise, dedupe candidates
  const seen = new Set<string>();
  const candidates: IdentifyCandidate[] = (parsed.candidates ?? [])
    .filter((c) => c.set_number)
    .map((c) => ({
      id: c.set_number!.replace(/[^0-9]/g, ""),
      confidence: typeof c.confidence === "number" ? Math.min(1, Math.max(0, c.confidence)) : 0,
    }))
    .filter((c) => c.id.length >= 4 && c.id.length <= 8)
    .filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .slice(0, 3);

  const best = candidates[0] ?? null;
  const needs_confirmation = needsConfirmationSet(candidates);

  return NextResponse.json({
    set_number: best?.id ?? null,
    confidence: best?.confidence ?? 0,
    needs_confirmation,
    candidates,
  });
}
