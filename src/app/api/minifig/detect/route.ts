import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import {
  detectWithBrickognizeFallback,
  detectWithHostedRoboflow,
  RoboflowInferenceError,
} from "@/lib/roboflow-hosted";
import { supabase } from "@/lib/supabase";

const MAX_DETECTION_IMAGE_BYTES = 100 * 1024;

export async function POST(req: NextRequest) {
  if (process.env.ROBOFLOW_SMART_SCAN_ENABLED === "false") {
    return NextResponse.json(
      { error: "detector_disabled", message: "Smart scan is temporarily unavailable." },
      { status: 503 }
    );
  }
  const clientAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const clientKey = createHash("sha256").update(clientAddress).digest("hex");
  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc("consume_service_rate_limit", {
    p_key: `roboflow:${clientKey}`,
    p_limit: 30,
    p_now: new Date().toISOString(),
    p_window_seconds: 60,
  });
  if (rateLimitError || withinRateLimit !== true) {
    return NextResponse.json(
      { error: "rate_limited", message: "Smart scan is cooling down. Try again shortly." },
      { status: 429 }
    );
  }
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
  if (image.size > MAX_DETECTION_IMAGE_BYTES) {
    return NextResponse.json({ error: "Detection image too large" }, { status: 413 });
  }

  try {
    const result = await detectWithHostedRoboflow(image);
    if (result.status === "cap-reached") {
      return NextResponse.json(result, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[minifig-detect] Failed:", error);
    if (error instanceof RoboflowInferenceError && error.statusCode === 402) {
      try {
        return NextResponse.json(await detectWithBrickognizeFallback(image));
      } catch (fallbackError) {
        console.error("[minifig-detect] Brickognize fallback failed:", fallbackError);
      }
    }
    return NextResponse.json(
      { error: "detector_unavailable", message: "Smart scan is temporarily unavailable." },
      { status: 503 }
    );
  }
}
