import {
  DEFAULT_ROBOFLOW_MINIFIGURE_CLASSES,
  DEFAULT_ROBOFLOW_MINIFIGURE_MODEL,
  runHostedMinifigureDetection,
  type HostedDetectionResult,
  type RoboflowDetectionResponse,
} from "./roboflow-detector";
import { supabase } from "./supabase";

const MONTHLY_INFERENCE_CAP = 30_000;

export async function detectWithHostedRoboflow(image: Blob): Promise<HostedDetectionResult> {
  const detectorModelVersion = getConfiguredRoboflowModel();
  return runHostedMinifigureDetection(image, {
    allowedClasses: getConfiguredRoboflowClasses(),
    consumeQuota: async () => {
      const { data, error } = await supabase.rpc("consume_monthly_service_quota", {
        p_service: "roboflow",
        p_limit: MONTHLY_INFERENCE_CAP,
        p_now: new Date().toISOString(),
      });
      if (error) throw error;
      return data === true;
    },
    detectorModelVersion,
    infer: inferHostedRoboflow,
    now: () => performance.now(),
  });
}

async function inferHostedRoboflow(image: Blob): Promise<RoboflowDetectionResponse> {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) throw new Error("Missing env var: ROBOFLOW_API_KEY");

  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const url = new URL(`${getConfiguredRoboflowBaseUrl()}/${getConfiguredRoboflowModel()}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("confidence", "50");
  url.searchParams.set("overlap", "30");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Roboflow inference failed: ${response.status}`);
  return response.json() as Promise<RoboflowDetectionResponse>;
}

function getConfiguredRoboflowModel(): string {
  return process.env.ROBOFLOW_MINIFIGURE_MODEL?.trim() || DEFAULT_ROBOFLOW_MINIFIGURE_MODEL;
}

function getConfiguredRoboflowBaseUrl(): string {
  return process.env.ROBOFLOW_INFERENCE_BASE_URL?.trim().replace(/\/$/, "")
    || "https://detect.roboflow.com";
}

function getConfiguredRoboflowClasses(): string[] {
  const configured = process.env.ROBOFLOW_MINIFIGURE_CLASSES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_ROBOFLOW_MINIFIGURE_CLASSES;
}
