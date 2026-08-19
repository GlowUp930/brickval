import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { reportBulkScanError } from "@/lib/backend-error-reporting";
import { lookupBulkMinifigures } from "@/lib/bulk-minifig-lookup";
import { verifyBulkScanSession } from "@/lib/bulk-scan-session";
import { BULK_SCAN_RATE_LIMIT, bulkScanRateLimitKey, bulkScanUsageKey } from "@/lib/bulk-recovery-rate-limit";
import { BrickognizeUnavailableError, identifyNonSet } from "@/lib/brickognize";
import { consumeFeatureUsage } from "@/lib/scan-gate";
import { supabase } from "@/lib/supabase";

const MAX_REGION_CROP_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    await reportBulkScanError(error, requestErrorContext(req, 400, "camera", null));
    return NextResponse.json({ error: "invalid_form_data", message: "The figure crop could not be read." }, { status: 400 });
  }

  const image = formData.get("image");
  const sessionToken = String(formData.get("sessionToken") ?? "");
  const regionId = String(formData.get("regionId") ?? "").trim();
  if (!(image instanceof File) || image.type !== "image/jpeg" || image.size > MAX_REGION_CROP_BYTES || !regionId) {
    await reportBulkScanError(
      new Error("The figure crop failed validation."),
      requestErrorContext(req, 400, "camera", null),
    );
    return NextResponse.json({ error: "invalid_region", message: "A valid minifigure crop is required." }, { status: 400 });
  }

  const claims = verifyBulkScanSession(sessionToken, userId, regionId);
  if (!claims) {
    return NextResponse.json({ error: "session_expired", message: "This scan session expired. Please retake the photo." }, { status: 401 });
  }

  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc("consume_service_rate_limit", {
    p_key: bulkScanRateLimitKey(sessionToken),
    p_limit: BULK_SCAN_RATE_LIMIT.maxCalls,
    p_now: new Date().toISOString(),
    p_window_seconds: BULK_SCAN_RATE_LIMIT.windowSeconds,
  });
  if (rateLimitError || withinRateLimit !== true) {
    if (rateLimitError) {
      await reportBulkScanError(rateLimitError, requestErrorContext(req, 503, claims.scanSource, claims.regionIds.length));
    }
    return NextResponse.json({ error: "rate_limited", message: "This scan is processing too quickly. Please try again shortly." }, { status: 429 });
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
    const rows = await lookupBulkMinifigures(identifiers, 4, 3);
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
      .filter((candidate): candidate is { id: string; score: number; result: NonNullable<typeof candidate.result> } => Boolean(candidate.result))
      .slice(0, 3);

    const topScore = candidates[0]?.score ?? 0;
    const runnerUpScore = candidates[1]?.score ?? null;
    const accepted = Boolean(
      candidates[0]
      && topScore >= Number(process.env.BRICKVALUE_BULK_AUTO_ACCEPT_SCORE ?? "0.80")
      && (runnerUpScore === null || topScore - runnerUpScore >= Number(process.env.BRICKVALUE_BULK_AUTO_ACCEPT_MARGIN ?? "0.08"))
    );

    let usage: Awaited<ReturnType<typeof consumeFeatureUsage>>["usage"] | undefined;
    if (candidates.length && userId) {
      const { data: ownsUsage, error: usageLockError } = await supabase.rpc("consume_service_rate_limit", {
        p_key: bulkScanUsageKey(sessionToken),
        p_limit: 1,
        p_now: new Date().toISOString(),
        p_window_seconds: 10 * 60,
      });
      if (usageLockError) {
        return NextResponse.json({ error: "usage_unavailable", message: "Your scan could not be confirmed. Please try again." }, { status: 503 });
      }
      if (ownsUsage === true) {
        const gate = await consumeFeatureUsage(userId, "bulk_scan");
        if (!gate.allowed) {
          return NextResponse.json({
            error: "paywall",
            feature: "bulk_scan",
            message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.",
            usage: gate.usage,
          }, { status: 402 });
        }
        usage = gate.usage;
      }
    }

    return NextResponse.json({
      regionId,
      status: accepted ? "matched" : candidates.length ? "review" : "unresolved",
      candidates,
      usage,
    });
  } catch (error) {
    if (error instanceof BrickognizeUnavailableError) {
      await reportBulkScanError(error, requestErrorContext(req, 502, claims.scanSource, claims.regionIds.length));
      return NextResponse.json({ error: "upstream", message: "Recognition is temporarily unavailable." }, { status: 502 });
    }
    await reportBulkScanError(error, requestErrorContext(req, 502, claims.scanSource, claims.regionIds.length));
    console.error("[bulk-scan-identify-region] Failed:", error);
    return NextResponse.json({ error: "upstream", message: "Could not identify that figure." }, { status: 502 });
  }
}

function requestErrorContext(
  request: NextRequest,
  statusCode: number,
  scanSource: "camera" | "photoLibrary",
  regionCount: number | null,
) {
  return {
    endpoint: "/api/minifig/bulk-scan/identify-region",
    statusCode,
    scanSource,
    regionCount,
    appPlatform: request.headers.get("x-brickvalue-platform"),
    appVersion: request.headers.get("x-brickvalue-app-version"),
    appBuild: request.headers.get("x-brickvalue-app-build"),
  };
}
