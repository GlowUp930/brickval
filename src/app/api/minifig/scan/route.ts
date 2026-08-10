import { auth } from "@clerk/nextjs/server";
import { after, NextRequest, NextResponse } from "next/server";

import { identifyNonSet } from "@/lib/brickognize";
import { getMonetizationPolicy } from "@/lib/monetization-policy";
import { resolveMinifigMarketSnapshot } from "@/lib/minifig-market-snapshots";
import { runMinifigScan } from "@/lib/minifig-scan-service";
import { checkFeatureAccess, consumeFeatureUsage } from "@/lib/scan-gate";

const MAX_CAPTURE_BYTES = 500 * 1024;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (image.type !== "image/jpeg") {
    return NextResponse.json({ error: "Only JPEG images are supported" }, { status: 415 });
  }
  if (image.size > MAX_CAPTURE_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  try {
    const { userId } = await auth();
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

    if (scan.status === "not-found") return NextResponse.json(scan);

    if (!userId) return NextResponse.json(scan);

    const gate = await consumeFeatureUsage(userId, "single_scan");
    if (!gate.allowed) {
      return NextResponse.json({
        error: "paywall",
        feature: "single_scan",
        message: "You have no free scans left today. Upgrade to BrickValue Pro for unlimited scans.",
        usage: gate.usage,
      }, { status: 402 });
    }

    return NextResponse.json({ ...scan, usage: gate.usage });
  } catch (error) {
    console.error("[minifig-scan] Failed:", error);
    return NextResponse.json(
      { error: "upstream", message: "Something went wrong. Please try again in a moment." },
      { status: 502 }
    );
  }
}
