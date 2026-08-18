import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { reportBulkScanError } from "@/lib/backend-error-reporting";
import { runBulkMinifigScan } from "@/lib/bulk-minifig-scan-service";
import { BrickognizeUnavailableError } from "@/lib/brickognize";
import { issueBulkRecoveryToken } from "@/lib/bulk-recovery-token";
import { checkFeatureAccess, consumeFeatureUsage } from "@/lib/scan-gate";
import { parseBulkScanInput } from "@/lib/bulk-scan-input";

const MAX_CAPTURE_BYTES = 700 * 1024;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    await reportBulkScanError(error, requestErrorContext(req, 400, "camera", null));
    return NextResponse.json({
      error: "invalid_form_data",
      message: "The bulk scan upload could not be read. Please try again.",
    }, { status: 400 });
  }

  const input = parseBulkScanInput(formData);
  if (!input.ok) {
    await reportBulkScanError(new Error(input.error.message), requestErrorContext(
      req,
      input.error.status,
      input.error.scanSource,
      input.error.regionCount,
    ));
    return NextResponse.json({
      error: input.error.code,
      code: input.error.code,
      message: input.error.message,
    }, { status: input.error.status });
  }
  const { image, regions, scanSource } = input.value;
  if (image.type !== "image/jpeg") {
    return NextResponse.json({ error: "Only JPEG images are supported" }, { status: 415 });
  }
  if (image.size > MAX_CAPTURE_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch (error) {
    console.warn("[bulk-scan] Auth unavailable; continuing as guest.", error);
  }

  if (userId) {
    const access = await checkFeatureAccess(userId, "bulk_scan");
    if (!access.allowed) {
      return NextResponse.json({
        error: "paywall",
        feature: "bulk_scan",
        message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.",
        usage: access.usage,
      }, { status: 402 });
    }
  }

  try {
    const scan = await runBulkMinifigScan(image, regions, {
      guided: process.env.BRICKVALUE_GUIDED_BULK_ENABLED !== "false",
      source: scanSource,
    });
    console.info("[bulk-scan]", scan.timings, {
      input_regions: regions.length,
      source: scanSource,
      priced_results: scan.items.length,
      unresolved: scan.unresolvedCount,
      partial: scan.partial,
    });
    const hasPricedResult = scan.items.length > 0 || scan.reviewItems.length > 0;
    if (!userId || !hasPricedResult) return NextResponse.json({ ...scan, recoveryToken: issueBulkRecoveryToken(userId) });

    const gate = await consumeFeatureUsage(userId, "bulk_scan");
    if (!gate.allowed) {
      return NextResponse.json({
        error: "paywall",
        feature: "bulk_scan",
        message: "Your free bulk scan has been used. Upgrade to BrickValue Pro for unlimited bulk scans.",
        usage: gate.usage,
      }, { status: 402 });
    }
    return NextResponse.json({ ...scan, recoveryToken: issueBulkRecoveryToken(userId), usage: gate.usage });
  } catch (error) {
    if (error instanceof BrickognizeUnavailableError) {
      await reportBulkScanError(error, requestErrorContext(req, 502, scanSource, regions.length));
      return NextResponse.json(
        { error: "upstream", message: "Recognition is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }
    await reportBulkScanError(error, requestErrorContext(req, 502, scanSource, regions.length));
    console.error("[bulk-scan] Failed:", error);
    return NextResponse.json(
      { error: "upstream", message: "Something went wrong. Please try again in a moment." },
      { status: 502 }
    );
  }
}

function requestErrorContext(
  request: NextRequest,
  statusCode: number,
  scanSource: "camera" | "photoLibrary",
  regionCount: number | null,
) {
  return {
    endpoint: "/api/minifig/bulk-scan",
    statusCode,
    scanSource,
    regionCount,
    appPlatform: request.headers.get("x-brickvalue-platform"),
    appVersion: request.headers.get("x-brickvalue-app-version"),
    appBuild: request.headers.get("x-brickvalue-app-build"),
  };
}
