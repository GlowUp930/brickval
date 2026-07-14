import { after, NextRequest, NextResponse } from "next/server";

import { planFeedbackImageCollection, type ScanFeedbackOutcome } from "@/lib/scan-feedback";
import { supabase } from "@/lib/supabase";

const MAX_FEEDBACK_IMAGE_BYTES = 500 * 1024;
const OUTCOMES = new Set<ScanFeedbackOutcome>([
  "matched",
  "brickognize-rejected",
  "gallery-recovery",
  "low-confidence",
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const outcome = String(form.get("outcome") ?? "") as ScanFeedbackOutcome;
  if (!OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: "Invalid scan outcome" }, { status: 400 });
  }

  const consent = form.get("consent") === "true";
  const image = form.get("image");
  const shouldStoreImage =
    image instanceof File &&
    planFeedbackImageCollection({ consent, outcome, random: Math.random() });
  if (image instanceof File && (image.type !== "image/jpeg" || image.size > MAX_FEEDBACK_IMAGE_BYTES)) {
    return NextResponse.json({ error: "Invalid feedback image" }, { status: 413 });
  }

  try {
    let imagePath: string | null = null;
    if (shouldStoreImage && image instanceof File) {
      imagePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("scan-feedback")
        .upload(imagePath, await image.arrayBuffer(), { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
    }

    const numberOrNull = (value: FormDataEntryValue | null) => {
      if (value === null || String(value).trim() === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const { error } = await supabase.from("scan_feedback").insert({
      outcome,
      detector_model_version: String(form.get("detectorModelVersion") ?? "unknown").slice(0, 100),
      detector_confidence: numberOrNull(form.get("detectorConfidence")),
      brickognize_id: String(form.get("brickognizeId") ?? "").slice(0, 100) || null,
      brickognize_score: numberOrNull(form.get("brickognizeScore")),
      detect_ms: numberOrNull(form.get("detectMs")),
      identify_ms: numberOrNull(form.get("identifyMs")),
      pricing_ms: numberOrNull(form.get("pricingMs")),
      total_ms: numberOrNull(form.get("totalMs")),
      image_path: imagePath,
    });
    if (error) throw error;

    after(removeExpiredFeedback);
    return NextResponse.json({ recorded: true, imageStored: imagePath !== null });
  } catch (error) {
    console.error("[minifig-feedback] Failed:", error);
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }
}

async function removeExpiredFeedback(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("scan_feedback")
    .select("id, image_path")
    .eq("reviewed", false)
    .lt("created_at", cutoff)
    .limit(20);
  const rows = data ?? [];
  const paths = rows.flatMap((row) => typeof row.image_path === "string" ? [row.image_path] : []);
  if (paths.length > 0) await supabase.storage.from("scan-feedback").remove(paths);
  if (rows.length > 0) await supabase.from("scan_feedback").delete().in("id", rows.map((row) => row.id));
}
