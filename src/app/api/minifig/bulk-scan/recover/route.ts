import { scanRequestAccess } from "@/lib/scan-request-access";
import { NextRequest, NextResponse } from "next/server";

import { lookupBulkMinifigures } from "@/lib/bulk-minifig-lookup";
import { authorizeBulkScan } from "@/lib/scan-gate";
import { verifiedRecoveryClaims } from "@/lib/bulk-recovery-token";
import { BULK_RECOVERY_RATE_LIMIT, bulkRecoveryRateLimitKey } from "@/lib/bulk-recovery-rate-limit";
import { BrickognizeUnavailableError, identifyNonSet } from "@/lib/brickognize";
import { supabase } from "@/lib/supabase";

const MAX_RECOVERY_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  const accessRequest = await scanRequestAccess(req);
  if (accessRequest instanceof NextResponse) return accessRequest;
  const { userId } = accessRequest;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data", message: "The recovery upload could not be read." }, { status: 400 });
  }

  const image = formData.get("image");
  const token = String(formData.get("recoveryToken") ?? "");
  if (!(image instanceof File) || image.type !== "image/jpeg" || image.size > MAX_RECOVERY_BYTES) {
    return NextResponse.json({ error: "invalid_image", message: "Choose a valid JPEG recovery photo." }, { status: 400 });
  }
  const claims = verifiedRecoveryClaims(token, userId);
  if (!claims) {
    return NextResponse.json({ error: "recovery_expired", message: "Please retake the bulk photo." }, { status: 401 });
  }

  // A signed recovery token is scoped to one scan session. This allows up to
  // ten selected figures plus one retry each without letting a client spend
  // another user's or an anonymous user's budget.
  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc("consume_service_rate_limit", {
    p_key: bulkRecoveryRateLimitKey(token),
    p_limit: BULK_RECOVERY_RATE_LIMIT.maxCalls,
    p_now: new Date().toISOString(),
    p_window_seconds: BULK_RECOVERY_RATE_LIMIT.windowSeconds,
  });
  if (rateLimitError || withinRateLimit !== true) {
    return NextResponse.json(
      { error: "rate_limited", message: "Recovery is cooling down. Please try again shortly." },
      { status: 429 }
    );
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

    if (candidates.length && !claims.authorized) {
      const gate = await authorizeBulkScan(userId, token, claims.expiresAt);
      if (!gate.allowed) return NextResponse.json({ error: "paywall", feature: "bulk_scan",
        message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.", usage: gate.usage }, { status: 402 });
      return NextResponse.json({ candidates, usage: gate.usage });
    }
    return NextResponse.json({ candidates });
  } catch (error) {
    if (error instanceof BrickognizeUnavailableError) {
      return NextResponse.json({ error: "upstream", message: "Recognition is temporarily unavailable." }, { status: 502 });
    }
    console.error("[bulk-recovery] Failed:", error);
    return NextResponse.json({ error: "upstream", message: "Could not identify that figure." }, { status: 502 });
  }
}
