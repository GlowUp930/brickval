import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { lookupBulkMinifigures } from "@/lib/bulk-minifig-lookup";
import { verifyBulkRecoveryToken } from "@/lib/bulk-recovery-token";
import { BrickognizeUnavailableError, identifyNonSet } from "@/lib/brickognize";
import { supabase } from "@/lib/supabase";

const MAX_RECOVERY_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  const clientAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const clientKey = createHash("sha256").update(clientAddress).digest("hex");
  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc("consume_service_rate_limit", {
    p_key: `bulk-recovery:${clientKey}`,
    p_limit: 8,
    p_now: new Date().toISOString(),
    p_window_seconds: 60,
  });
  if (rateLimitError || withinRateLimit !== true) {
    return NextResponse.json(
      { error: "rate_limited", message: "Recovery is cooling down. Please try again shortly." },
      { status: 429 }
    );
  }

  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const image = formData.get("image");
  const token = String(formData.get("recoveryToken") ?? "");
  if (!(image instanceof File) || image.type !== "image/jpeg" || image.size > MAX_RECOVERY_BYTES) {
    return NextResponse.json({ error: "Invalid recovery image" }, { status: 400 });
  }
  if (!verifyBulkRecoveryToken(token, userId)) {
    return NextResponse.json({ error: "Recovery expired", message: "Please retake the bulk photo." }, { status: 401 });
  }
  try {
    const response = await identifyNonSet(image, {
      skipRecovery: true,
      throwOnFailure: true,
      timeoutMilliseconds: 8_000,
    });
    const detections = response.detections
      .filter((detection) => detection.item_type === "minifig")
      .slice(0, 1);
    const identifiers = detections.flatMap((detection) => [
      detection.id,
      ...(detection.alternatives ?? []).map((candidate) => candidate.id),
    ]);
    const rows = await lookupBulkMinifigures(identifiers);
    const priced = new Map(
      rows
        .filter((row): row is Extract<typeof row, { result: unknown }> => "result" in row)
        .map((row) => [row.figNumber.toLowerCase(), row.result])
    );
    const candidates = detections.flatMap((detection) => [
      { id: detection.id, score: detection.score },
      ...(detection.alternatives ?? []),
    ])
      .filter((candidate, index, all) => all.findIndex((item) => item.id.toLowerCase() === candidate.id.toLowerCase()) === index)
      .map((candidate) => ({ ...candidate, result: priced.get(candidate.id.toLowerCase()) }))
      .filter((candidate) => Boolean(candidate.result))
      .slice(0, 3);

    return NextResponse.json({ candidates });
  } catch (error) {
    if (error instanceof BrickognizeUnavailableError) {
      return NextResponse.json({ error: "upstream", message: "Recognition is temporarily unavailable." }, { status: 502 });
    }
    console.error("[bulk-recovery] Failed:", error);
    return NextResponse.json({ error: "upstream", message: "Could not identify that figure." }, { status: 502 });
  }
}
