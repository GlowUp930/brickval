import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { reportBulkScanError } from "@/lib/backend-error-reporting";
import { mergeBulkRegionProposals } from "@/lib/bulk-identify";
import { issueBulkRecoveryToken } from "@/lib/bulk-recovery-token";
import { parseBulkScanInput } from "@/lib/bulk-scan-input";
import { issueBulkScanSession } from "@/lib/bulk-scan-session";
import { googleVisionObjectLocalizationEnabled, localizeObjectsWithGoogleVision } from "@/lib/google-vision-localizer";
import { checkFeatureAccess } from "@/lib/scan-gate";

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
    await reportBulkScanError(
      new Error(input.error.message),
      requestErrorContext(req, input.error.status, input.error.scanSource, input.error.regionCount),
    );
    return NextResponse.json({
      error: input.error.code,
      message: input.error.message,
    }, { status: input.error.status });
  }

  const { image, regions, scanSource } = input.value;
  if (image.type !== "image/jpeg") {
    await reportBulkScanError(
      new Error("Bulk scan image is not JPEG."),
      requestErrorContext(req, 415, scanSource, regions.length),
    );
    return NextResponse.json({ error: "invalid_image", message: "Only JPEG images are supported." }, { status: 415 });
  }
  if (image.size > MAX_CAPTURE_BYTES) {
    await reportBulkScanError(
      new Error("Bulk scan image exceeds the size limit."),
      requestErrorContext(req, 413, scanSource, regions.length),
    );
    return NextResponse.json({ error: "image_too_large", message: "This image is too large. Please choose a smaller photo." }, { status: 413 });
  }

  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
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

  let mergedRegions = regions;
  if (googleVisionObjectLocalizationEnabled()) {
    try {
      const proposals = await localizeObjectsWithGoogleVision(image);
      mergedRegions = mergeBulkRegionProposals(
        regions,
        proposals,
        Number.MAX_SAFE_INTEGER,
      );
    } catch (error) {
      // Cloud proposal assistance is optional. The local detector remains the
      // source of truth if the budgeted cloud call is unavailable.
      await reportBulkScanError(error, requestErrorContext(req, 502, scanSource, regions.length));
    }
  }

  return NextResponse.json({
    scanSource,
    regions: mergedRegions,
    sessionToken: issueBulkScanSession(userId, scanSource, mergedRegions),
    recoveryToken: issueBulkRecoveryToken(userId),
    proposalSource: googleVisionObjectLocalizationEnabled() ? "local_plus_cloud" : "local",
  });
}

function requestErrorContext(
  request: NextRequest,
  statusCode: number,
  scanSource: "camera" | "photoLibrary",
  regionCount: number | null,
) {
  return {
    endpoint: "/api/minifig/bulk-scan/start",
    statusCode,
    scanSource,
    regionCount,
    appPlatform: request.headers.get("x-brickvalue-platform"),
    appVersion: request.headers.get("x-brickvalue-app-version"),
    appBuild: request.headers.get("x-brickvalue-app-build"),
  };
}
