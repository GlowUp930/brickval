import { scanRequestAccess } from "@/lib/scan-request-access";
import { after, NextRequest, NextResponse } from "next/server";

import { reportMinifigPricingOutcome } from "@/lib/backend-error-reporting";
import { identifyNonSet } from "@/lib/brickognize";
import { getMonetizationPolicy } from "@/lib/monetization-policy";
import { resolveMinifigMarketSnapshot } from "@/lib/minifig-market-snapshots";
import { runMinifigScan, shouldConsumeSingleScan } from "@/lib/minifig-scan-service";
import { checkFeatureAccess, consumeFeatureUsage } from "@/lib/scan-gate";

const MAX_CAPTURE_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  const accessRequest = await scanRequestAccess(req);
  if (accessRequest instanceof NextResponse) return accessRequest;
  const { userId } = accessRequest;
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data", message: "The scan upload could not be read." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "missing_image", message: "Please choose a photo to scan." }, { status: 400 });
  }
  if (image.type !== "image/jpeg") {
    return NextResponse.json({ error: "unsupported_image", message: "Only JPEG images are supported." }, { status: 415 });
  }
  if (image.size > MAX_CAPTURE_BYTES) {
    return NextResponse.json({ error: "image_too_large", message: "This image is too large. Please choose a smaller photo." }, { status: 413 });
  }

  try {
    if (userId && getMonetizationPolicy().gates.singleDaily) {
      const access = await checkFeatureAccess(userId, "single_scan");
      if (!access.allowed) {
        return NextResponse.json({
          error: "paywall",
          feature: "single_scan",
          message: "You have no free scans left today. Upgrade to BrickValue Pro for unlimited scans.",
          usage: access.usage,
        }, { status: 402 });
      }
    }

    const scan = await runMinifigScan(image, {
      identify: async () => identifyNonSet(image, { skipRecovery: true }),
      price: (itemId) => resolveMinifigMarketSnapshot(itemId, (task) => after(task)),
      now: () => performance.now(),
    });

    // Keep the new public metadata available in snake_case while retaining the
    // existing camelCase scan envelope for older native clients.
    const response = scan.status === "matched"
      ? {
          ...scan,
          pricing_availability: scan.pricingAvailability,
          pricing_updated_at: scan.pricingUpdatedAt,
          pricing_resolution: scan.pricingResolution,
        }
      : scan;

    if (scan.status === "matched") {
      const pricingResolution = scan.pricingResolution ?? "live";
      const providerState = pricingResolution === "identity_only"
        ? "temporary"
        : pricingResolution === "stale_cache"
          ? "cached"
          : "available";
      after(() => reportMinifigPricingOutcome({
        endpoint: "minifig_scan",
        outcome: pricingResolution,
        providerState,
        elapsedMs: scan.totalMs,
      }));
    }

    if (scan.status === "not-found") return NextResponse.json(response);

    if (!userId) return NextResponse.json(response);

    // Recognition succeeded, but BrickLink was temporarily unavailable and no
    // saved price was usable. Keep the identity result useful without charging
    // a single-scan allowance for a result that contains no market data.
    if (!shouldConsumeSingleScan(scan)) {
      return NextResponse.json(response);
    }

    const gate = await consumeFeatureUsage(userId, "single_scan");
    if (!gate.allowed) {
      return NextResponse.json({
        error: "paywall",
        feature: "single_scan",
        message: "You have no free scans left today. Upgrade to BrickValue Pro for unlimited scans.",
        usage: gate.usage,
      }, { status: 402 });
    }

    return NextResponse.json({ ...response, usage: gate.usage });
  } catch (error) {
    console.error("[minifig-scan] Failed:", error);
    return NextResponse.json(
      { error: "upstream", message: "Something went wrong. Please try again in a moment." },
      { status: 502 }
    );
  }
}
