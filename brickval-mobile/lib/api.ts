import Constants from "expo-constants";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import { getClerkAuthToken } from "./clerk";
import { getScanImageResize } from "./scan-image";
import { normalizeImageUrl } from "./image-url";
import { normalizeIdentificationDetections } from "./identify-response";
import { createMultipartPayload, type MultipartPart } from "./multipart";
import type { PreparedBulkCapture } from "./bulk-capture";
import type { MinifigureObservation } from "./auto-scan";
import {
  getConditionMarketHistory,
  getConditionMarketValueUsd,
  normalizeHistoryDate,
  type LookupMarketHistoryPoint,
} from "./lookup-market";
export {
  getConditionMarketHistory,
  getConditionMarketValueUsd,
  normalizeHistoryDate,
} from "./lookup-market";

/**
 * Thin client for the Brickvalue.live REST API.
 * Auth: a Clerk-issued JWT fetched directly from the native Clerk session.
 */

export const API_BASE = "https://brickvalue.live";
export const INTERNAL_TESTING_UNLIMITED_SCANS =
  Constants.expoConfig?.extra?.internalTestingUnlimitedScans === true;

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(endpoint: string, status: number, payload: unknown) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `${endpoint} failed: ${status}`;
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

async function throwApiError(res: Response, endpoint: string): Promise<never> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  throw new ApiRequestError(endpoint, res.status, payload);
}

export async function getAuthToken(): Promise<string | null> {
  return getClerkAuthToken();
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function filePart(name: string, file: File): Promise<MultipartPart> {
  return {
    name,
    filename: file.name || "scan.jpg",
    contentType: file.type || imageContentType(file.uri),
    bytes: await file.bytes(),
  };
}

function imageContentType(uri: string): string {
  const normalized = uri.toLowerCase().split("?")[0];
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".heic") || normalized.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

async function multipartHeaders(contentType: string): Promise<Record<string, string>> {
  return { "Content-Type": contentType, ...(await authHeader()) };
}

function multipartBody(payload: { body: Uint8Array }): BodyInit {
  // Expo's native fetch accepts ArrayBuffer views, although the bundled DOM type omits them.
  return payload.body as unknown as BodyInit;
}

/**
 * POST a captured photo to /api/identify and get back a set number.
 */
export type ScanMode = "set" | "minifig";
export type LookupItemType = ScanMode | "part";
export type LookupDataSource = "sold" | "listing" | null;

export interface IdentificationCandidate {
  id: string;
  score: number;
}

export interface IdentificationDetection {
  id: string;
  item_type: "minifig" | "part";
  score: number;
  regionId?: string;
  alternatives?: IdentificationCandidate[];
  bounding_box?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    imageWidth: number;
    imageHeight: number;
  };
}

export interface PartColorOption {
  color_id: number;
  color_name: string;
}

export interface IdentificationResult {
  set_number: string | null;
  confidence: number | null;
  candidates: IdentificationCandidate[];
  detections: IdentificationDetection[];
  scansUsed?: number;
  isPro?: boolean;
}

export type HostedDetectionResponse =
  | {
      status: "available";
      detectorModelVersion: string;
      detectMs: number;
      observations: MinifigureObservation[];
    }
  | {
      status: "cap-reached";
      detectorModelVersion: string;
      detectMs: 0;
      observations: [];
    };

export async function detectHostedMinifigures(photoUri: string): Promise<HostedDetectionResponse> {
  const payload = createMultipartPayload([await filePart("image", new File(photoUri))]);
  const res = await fetch(`${API_BASE}/api/minifig/detect`, {
    method: "POST",
    headers: await multipartHeaders(payload.contentType),
    body: multipartBody(payload),
  });
  const data = await res.json();
  if (res.status === 429 && data?.status === "cap-reached") return data;
  if (!res.ok) throw new ApiRequestError("minifig detect", res.status, data);
  const timestamp = Date.now();
  return {
    status: "available",
    detectorModelVersion: String(data.detectorModelVersion ?? "unknown"),
    detectMs: Number(data.detectMs ?? 0),
    observations: Array.isArray(data.observations)
      ? data.observations.map((observation: Omit<MinifigureObservation, "timestamp">) => ({
          ...observation,
          timestamp,
        }))
      : [],
  };
}

export type CombinedMinifigScanResponse =
  | {
      status: "matched";
      identification: IdentificationDetection;
      result: MinifigLookupDetailResult;
      pricingStatus: "fresh" | "refreshing" | "fetched";
      pricingUpdatedAt: string;
      identifyMs: number;
      pricingMs: number;
      totalMs: number;
    }
  | {
      status: "review";
      detections: IdentificationDetection[];
      identifyMs: number;
      totalMs: number;
    }
  | {
      status: "not-found";
      detections: [];
      identifyMs: number;
      totalMs: number;
    };

export async function scanMinifigure(photoUri: string): Promise<CombinedMinifigScanResponse> {
  const payload = createMultipartPayload([await filePart("image", new File(photoUri))]);
  const res = await fetch(`${API_BASE}/api/minifig/scan`, {
    method: "POST",
    headers: await multipartHeaders(payload.contentType),
    body: multipartBody(payload),
  });
  if (!res.ok) await throwApiError(res, "minifig scan");
  const data = await res.json();
  if (data.status === "matched") {
    const result = withScanMeta(normalizeMinifigResult(data.result), data);
    result.pricingStatus = data.pricingStatus;
    result.pricingUpdatedAt = data.pricingUpdatedAt;
    return { ...data, result } as CombinedMinifigScanResponse;
  }
  return data as CombinedMinifigScanResponse;
}

export async function submitMinifigFeedback(input: {
  outcome: "matched" | "brickognize-rejected" | "gallery-recovery" | "low-confidence";
  consent: boolean;
  photoUri?: string;
  detectorModelVersion?: string;
  detectorConfidence?: number;
  brickognizeId?: string;
  brickognizeScore?: number;
  detectMs?: number;
  identifyMs?: number;
  pricingMs?: number;
  totalMs?: number;
}): Promise<void> {
  const parts: MultipartPart[] = [
    { name: "outcome", value: input.outcome },
    { name: "consent", value: input.consent ? "true" : "false" },
  ];
  const append = (key: string, value: string | number | undefined) => {
    if (value !== undefined) parts.push({ name: key, value: String(value) });
  };
  append("detectorModelVersion", input.detectorModelVersion);
  append("detectorConfidence", input.detectorConfidence);
  append("brickognizeId", input.brickognizeId);
  append("brickognizeScore", input.brickognizeScore);
  append("detectMs", input.detectMs);
  append("identifyMs", input.identifyMs);
  append("pricingMs", input.pricingMs);
  append("totalMs", input.totalMs);
  if (input.consent && input.photoUri) parts.push(await filePart("image", new File(input.photoUri)));
  const payload = createMultipartPayload(parts);
  const res = await fetch(`${API_BASE}/api/minifig/feedback`, {
    method: "POST",
    headers: await multipartHeaders(payload.contentType),
    body: multipartBody(payload),
  });
  if (!res.ok) await throwApiError(res, "minifig feedback");
}

export async function identifySet(
  photoUri: string,
  mode: ScanMode = "set",
  options: { bulk?: boolean; guided?: boolean } = {}
): Promise<IdentificationResult> {
  let uploadFile = new File(photoUri);
  const dimensions = await Image.getSize(photoUri);
  const resize = getScanImageResize(dimensions.width, dimensions.height, uploadFile.size);
  if (resize) {
    const context = ImageManipulator.manipulate(photoUri);
    let image: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
    try {
      context.resize(resize);
      image = await context.renderAsync();
      const compressed = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72 });
      uploadFile = new File(compressed.uri);
    } finally {
      context.release();
      image?.release();
    }
  }

  const payload = createMultipartPayload([await filePart("image", uploadFile)]);

  const scanQuery = options.guided ? "&scan=guided-single" : options.bulk ? "&scan=bulk" : "";
  const identifyUrl = `${API_BASE}/api/identify?mode=${mode}${scanQuery}`;

  const res = await fetch(identifyUrl, {
    method: "POST",
    headers: await multipartHeaders(payload.contentType),
    body: multipartBody(payload),
  });

  if (!res.ok) await throwApiError(res, "identify");
  const data = (await res.json()) as {
    set_number: string | null;
    confidence?: number | null;
    candidates?: IdentificationCandidate[];
    detections?: IdentificationDetection[];
    scansUsed?: number;
    isPro?: boolean;
  };
  return normalizeIdentificationPayload(mode, data);
}

export async function identifyGuidedBulkMinifigs(
  capture: PreparedBulkCapture
): Promise<IdentificationResult> {
  const imageParts = await Promise.all(
    capture.imageUris.map((uri) => filePart("images", new File(uri)))
  );
  const payload = createMultipartPayload([
    ...imageParts,
    { name: "manifest", value: JSON.stringify(capture.manifest) },
  ]);
  const res = await fetch(`${API_BASE}/api/identify?mode=minifig&scan=guided-bulk`, {
    method: "POST",
    headers: await multipartHeaders(payload.contentType),
    body: multipartBody(payload),
  });
  if (!res.ok) await throwApiError(res, "guided bulk identify");
  return normalizeIdentificationPayload("minifig", await res.json());
}

function normalizeIdentificationPayload(
  mode: ScanMode,
  data: {
    set_number?: string | null;
    confidence?: number | null;
    candidates?: IdentificationCandidate[];
    detections?: IdentificationDetection[];
    scansUsed?: number;
    isPro?: boolean;
  }
): IdentificationResult {
  return {
    set_number: data.set_number ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : null,
    candidates: (data.candidates ?? []).slice(0, 4),
    detections: normalizeIdentificationDetections(mode, data),
    scansUsed: typeof data.scansUsed === "number" ? data.scansUsed : undefined,
    isPro: typeof data.isPro === "boolean" ? data.isPro : undefined,
  };
}

/**
 * Look up market data for a set number. Returns the same shape the web
 * /result page consumes (ComputedPricing).
 */
export async function lookupSet(
  setNumber: string,
  mode: LookupItemType = "set",
  options?: { colorId?: number }
): Promise<LookupDetailResult> {
  const res = await fetch(`${API_BASE}/api/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ setNumber, mode, colorId: options?.colorId ?? null }),
  });

  if (!res.ok) await throwApiError(res, "lookup");
  const data = await res.json();
  if (mode === "minifig") return withScanMeta(normalizeMinifigResult(data), data);
  if (mode === "part") return withScanMeta(normalizePartResult(data), data);
  return withScanMeta(normalizeSetResult(data), data);
}

export interface BulkMinifigLookupRow {
  figNumber: string;
  result: MinifigLookupDetailResult | null;
  error: "not_found" | null;
}

export async function bulkLookupMinifigs(figNumbers: string[]): Promise<BulkMinifigLookupRow[]> {
  const res = await fetch(`${API_BASE}/api/bulk-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ mode: "minifig", figNumbers }),
  });

  if (!res.ok) await throwApiError(res, "bulk minifig lookup");
  const data = (await res.json()) as {
    results?: Array<{
      figNumber?: string;
      result?: MinifigLookupResponse;
      error?: "not_found";
    }>;
  };

  const rows: BulkMinifigLookupRow[] = [];
  for (const row of data.results ?? []) {
    const figNumber = typeof row.figNumber === "string" ? row.figNumber : "";
    if (!figNumber) continue;
    if (row.result) {
      rows.push({ figNumber, result: normalizeMinifigResult(row.result), error: null });
    } else {
      rows.push({ figNumber, result: null, error: row.error ?? "not_found" });
    }
  }
  return rows;
}

function withScanMeta<T extends LookupDetailResult>(result: T, data: any): T {
  if (typeof data.scansUsed === "number") {
    result.scansUsed = data.scansUsed;
  }
  if (typeof data.isPro === "boolean") {
    result.isPro = data.isPro;
  }
  return result;
}

export async function fetchPartColors(): Promise<PartColorOption[]> {
  const res = await fetch(`${API_BASE}/api/part-colors`, {
    method: "GET",
    headers: { ...(await authHeader()) },
  });

  if (!res.ok) await throwApiError(res, "part-colors");
  const data = (await res.json()) as { colors?: PartColorOption[] };
  return (data.colors ?? []).filter(
    (color) => Number.isFinite(color.color_id) && typeof color.color_name === "string" && color.color_name.trim().length > 0
  );
}

export interface LookupSummaryPricing {
  hero_new_avg_usd: number | null;
  rrp_usd: number | null;
  gain_pct: number | null;
  bricklink_new_qty: number | null;
  data_source: LookupDataSource;
}

export interface LookupSummaryResult {
  set_number: string;
  item_type: LookupItemType;
  name: string;
  theme: string;
  pieces: number | null;
  image_url: string | null;
  market_history: MarketHistoryPoint[];
  pricing: LookupSummaryPricing;
  scansUsed?: number;
  isPro?: boolean;
  pricingStatus?: "fresh" | "refreshing" | "fetched";
  pricingUpdatedAt?: string;
}

export type MarketHistoryPoint = LookupMarketHistoryPoint;

export interface BrickLinkDetail {
  price_usd: number;
  quantity: number;
  date?: string;
  country?: string;
}

export interface EbaySale {
  title: string;
  price_usd: number;
  sold_date: string;
  condition: string;
  item_url: string;
  marketplace?: string;
}

export interface SetDetailPricing extends LookupSummaryPricing {
  exchange_rate_stale: boolean;
  ebay_new_sales: EbaySale[];
  ebay_used_sales: EbaySale[];
  ebay_new_avg_usd: number | null;
  ebay_used_avg_usd: number | null;
  bricklink_new_avg_usd: number | null;
  bricklink_new_min_usd: number | null;
  bricklink_new_max_usd: number | null;
  bricklink_used_avg_usd: number | null;
  bricklink_used_min_usd: number | null;
  bricklink_used_max_usd: number | null;
  bricklink_used_qty: number | null;
  bricklink_stock_new_avg_usd: number | null;
  bricklink_stock_new_qty: number | null;
  bricklink_stock_used_avg_usd: number | null;
  bricklink_stock_used_qty: number | null;
  bricklink_sold_new_details: BrickLinkDetail[];
  bricklink_sold_used_details: BrickLinkDetail[];
  bricklink_stock_new_details: BrickLinkDetail[];
  bricklink_stock_used_details: BrickLinkDetail[];
}

export interface SetLookupDetailResult extends Omit<LookupSummaryResult, "item_type" | "pricing"> {
  item_type: "set";
  set_info: {
    year_released: number | null;
    is_obsolete: boolean;
  };
  pricing: SetDetailPricing;
}

export interface MinifigDetailPricing extends LookupSummaryPricing {
  used_sold_avg_usd: number | null;
  used_sold_min_usd: number | null;
  used_sold_max_usd: number | null;
  used_sold_qty: number | null;
  used_stock_avg_usd: number | null;
  used_stock_qty: number | null;
  new_sold_avg_usd: number | null;
  new_sold_min_usd: number | null;
  new_sold_max_usd: number | null;
  new_sold_qty: number | null;
  new_stock_avg_usd: number | null;
  new_stock_qty: number | null;
  sold_details: BrickLinkDetail[];
  stock_details: BrickLinkDetail[];
  sold_new_details: BrickLinkDetail[];
  stock_new_details: BrickLinkDetail[];
}

export interface MinifigLookupDetailResult extends Omit<LookupSummaryResult, "item_type" | "pricing"> {
  item_type: "minifig";
  fig_info: {
    fig_number: string;
    year_released: number | null;
  };
  pricing: MinifigDetailPricing;
}

export interface PartDetailPricing extends LookupSummaryPricing {
  used_sold_avg_usd: number | null;
  used_sold_min_usd: number | null;
  used_sold_max_usd: number | null;
  used_sold_qty: number | null;
  used_stock_avg_usd: number | null;
  used_stock_qty: number | null;
  new_sold_avg_usd: number | null;
  new_sold_min_usd: number | null;
  new_sold_max_usd: number | null;
  new_sold_qty: number | null;
  new_stock_avg_usd: number | null;
  new_stock_qty: number | null;
  sold_details: BrickLinkDetail[];
  stock_details: BrickLinkDetail[];
  sold_used_details: BrickLinkDetail[];
  stock_used_details: BrickLinkDetail[];
}

export interface PartLookupDetailResult extends Omit<LookupSummaryResult, "item_type" | "pricing"> {
  item_type: "part";
  part_info: {
    part_number: string;
    year_released: number | null;
    color_id: number | null;
    color_name: string | null;
  };
  pricing: PartDetailPricing;
}

export type LookupDetailResult = SetLookupDetailResult | MinifigLookupDetailResult | PartLookupDetailResult;

interface MinifigLookupResponse {
  figInfo: {
    name: string;
    image_url: string | null;
    fig_number: string;
    year_released: number | null;
  };
  pricing: {
    used_sold_avg_usd: number | null;
    used_sold_min_usd?: number | null;
    used_sold_max_usd?: number | null;
    used_sold_qty: number | null;
    used_stock_avg_usd: number | null;
    used_stock_qty: number | null;
    new_sold_avg_usd: number | null;
    new_sold_min_usd?: number | null;
    new_sold_max_usd?: number | null;
    new_sold_qty: number | null;
    new_stock_avg_usd: number | null;
    new_stock_qty: number | null;
    sold_details?: BrickLinkDetail[];
    stock_details?: BrickLinkDetail[];
    sold_new_details?: BrickLinkDetail[];
    stock_new_details?: BrickLinkDetail[];
  };
}

interface PartLookupResponse {
  partInfo: {
    name: string;
    image_url: string | null;
    part_number: string;
    year_released: number | null;
    color_id: number | null;
    color_name: string | null;
  };
  pricing: {
    hero_new_avg_usd: number | null;
    rrp_usd: number | null;
    gain_pct: number | null;
    bricklink_new_qty: number | null;
    data_source: LookupDataSource;
    used_sold_avg_usd: number | null;
    used_sold_min_usd?: number | null;
    used_sold_max_usd?: number | null;
    used_sold_qty: number | null;
    used_stock_avg_usd: number | null;
    used_stock_qty: number | null;
    new_sold_avg_usd: number | null;
    new_sold_min_usd?: number | null;
    new_sold_max_usd?: number | null;
    new_sold_qty: number | null;
    new_stock_avg_usd: number | null;
    new_stock_qty: number | null;
    sold_details?: BrickLinkDetail[];
    stock_details?: BrickLinkDetail[];
    sold_used_details?: BrickLinkDetail[];
    stock_used_details?: BrickLinkDetail[];
  };
}

function cleanHistory(points: MarketHistoryPoint[]): MarketHistoryPoint[] {
  return points
    .map((point) => ({
      ...point,
      date: normalizeHistoryDate(point.date) ?? "",
    }))
    .filter((point) => point.date && Number.isFinite(point.price_usd) && point.price_usd > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-120);
}

function getSetMarketHistory(pricing: any): MarketHistoryPoint[] {
  const bricklinkRows: BrickLinkDetail[] = [
    ...(pricing?.bricklink_sold_new_details ?? []),
    ...(pricing?.bricklink_sold_used_details ?? []),
  ];
  const ebayRows: EbaySale[] = [
    ...(pricing?.ebay_new_sales ?? []),
    ...(pricing?.ebay_used_sales ?? []),
  ];
  return cleanHistory([
    ...bricklinkRows.map((row) => ({
      date: row.date ?? "",
      price_usd: row.price_usd,
      source: "bricklink" as const,
    })),
    ...ebayRows.map((row) => ({
      date: row.sold_date ?? "",
      price_usd: row.price_usd,
      source: "ebay" as const,
    })),
  ]);
}

function getMinifigMarketHistory(pricing: MinifigLookupResponse["pricing"]): MarketHistoryPoint[] {
  const rows: BrickLinkDetail[] = [
    ...(pricing.sold_new_details ?? []),
    ...(pricing.sold_details ?? []),
  ];
  return cleanHistory(rows.map((row) => ({
    date: row.date ?? "",
    price_usd: row.price_usd,
    source: "bricklink",
  })));
}

function getPartMarketHistory(pricing: PartLookupResponse["pricing"]): MarketHistoryPoint[] {
  return cleanHistory([
    ...(pricing.sold_details ?? []).map((row) => ({
      date: row.date ?? "",
      price_usd: row.price_usd,
      source: "bricklink" as const,
    })),
    ...(pricing.sold_used_details ?? []).map((row) => ({
      date: row.date ?? "",
      price_usd: row.price_usd,
      source: "bricklink" as const,
    })),
  ]);
}

function normalizeSetResult(data: any): SetLookupDetailResult {
  const setInfo = data.setInfo ?? data;
  const summaryPricing: LookupSummaryPricing = {
    hero_new_avg_usd:
      data.pricing?.hero_new_avg_usd ??
      data.pricing?.bricklink_new_avg_usd ??
      data.pricing?.ebay_new_avg_usd ??
      data.pricing?.bricklink_stock_new_avg_usd ??
      null,
    rrp_usd: data.pricing?.rrp_usd ?? null,
    gain_pct: data.pricing?.gain_pct ?? null,
    bricklink_new_qty:
      data.pricing?.bricklink_new_qty ??
      data.pricing?.bricklink_stock_new_qty ??
      null,
    data_source: data.pricing?.data_source ?? null,
  };
  return {
    set_number: setInfo.set_number ?? data.set_number,
    item_type: "set",
    name: setInfo.name ?? data.name ?? "Unknown LEGO set",
    theme: data.theme ?? "LEGO set",
    pieces: data.pieces ?? null,
    image_url: normalizeImageUrl(setInfo.image_url ?? data.image_url ?? null),
    market_history: getSetMarketHistory(data.pricing),
    set_info: {
      year_released: setInfo.year_released ?? null,
      is_obsolete: Boolean(setInfo.is_obsolete),
    },
    pricing: {
      ...summaryPricing,
      exchange_rate_stale: Boolean(data.pricing?.exchange_rate_stale),
      ebay_new_sales: data.pricing?.ebay_new_sales ?? [],
      ebay_used_sales: data.pricing?.ebay_used_sales ?? [],
      ebay_new_avg_usd: data.pricing?.ebay_new_avg_usd ?? null,
      ebay_used_avg_usd: data.pricing?.ebay_used_avg_usd ?? null,
      bricklink_new_avg_usd: data.pricing?.bricklink_new_avg_usd ?? null,
      bricklink_new_min_usd: data.pricing?.bricklink_new_min_usd ?? null,
      bricklink_new_max_usd: data.pricing?.bricklink_new_max_usd ?? null,
      bricklink_used_avg_usd: data.pricing?.bricklink_used_avg_usd ?? null,
      bricklink_used_min_usd: data.pricing?.bricklink_used_min_usd ?? null,
      bricklink_used_max_usd: data.pricing?.bricklink_used_max_usd ?? null,
      bricklink_used_qty: data.pricing?.bricklink_used_qty ?? null,
      bricklink_stock_new_avg_usd: data.pricing?.bricklink_stock_new_avg_usd ?? null,
      bricklink_stock_new_qty: data.pricing?.bricklink_stock_new_qty ?? null,
      bricklink_stock_used_avg_usd: data.pricing?.bricklink_stock_used_avg_usd ?? null,
      bricklink_stock_used_qty: data.pricing?.bricklink_stock_used_qty ?? null,
      bricklink_sold_new_details: data.pricing?.bricklink_sold_new_details ?? [],
      bricklink_sold_used_details: data.pricing?.bricklink_sold_used_details ?? [],
      bricklink_stock_new_details: data.pricing?.bricklink_stock_new_details ?? [],
      bricklink_stock_used_details: data.pricing?.bricklink_stock_used_details ?? [],
    },
  };
}

function normalizeMinifigResult(data: MinifigLookupResponse): MinifigLookupDetailResult {
  const soldAverage = data.pricing.new_sold_avg_usd ?? data.pricing.used_sold_avg_usd;
  const stockAverage = data.pricing.new_stock_avg_usd ?? data.pricing.used_stock_avg_usd;
  const soldQty = data.pricing.new_sold_qty ?? data.pricing.used_sold_qty;
  const stockQty = data.pricing.new_stock_qty ?? data.pricing.used_stock_qty;
  const summaryPricing: LookupSummaryPricing = {
    hero_new_avg_usd: soldAverage ?? stockAverage ?? null,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: soldQty ?? stockQty ?? null,
    data_source:
      soldAverage !== null && soldAverage !== undefined
        ? "sold"
        : stockAverage !== null && stockAverage !== undefined
          ? "listing"
          : null,
  };
  return {
    set_number: data.figInfo.fig_number,
    item_type: "minifig",
    name: data.figInfo.name,
    theme: data.figInfo.year_released ? `Minifigure · ${data.figInfo.year_released}` : "Minifigure",
    pieces: null,
    image_url: normalizeImageUrl(data.figInfo.image_url),
    market_history: getMinifigMarketHistory(data.pricing),
    fig_info: {
      fig_number: data.figInfo.fig_number,
      year_released: data.figInfo.year_released,
    },
    pricing: {
      ...summaryPricing,
      used_sold_avg_usd: data.pricing.used_sold_avg_usd,
      used_sold_min_usd: data.pricing.used_sold_min_usd ?? null,
      used_sold_max_usd: data.pricing.used_sold_max_usd ?? null,
      used_sold_qty: data.pricing.used_sold_qty,
      used_stock_avg_usd: data.pricing.used_stock_avg_usd,
      used_stock_qty: data.pricing.used_stock_qty,
      new_sold_avg_usd: data.pricing.new_sold_avg_usd,
      new_sold_min_usd: data.pricing.new_sold_min_usd ?? null,
      new_sold_max_usd: data.pricing.new_sold_max_usd ?? null,
      new_sold_qty: data.pricing.new_sold_qty,
      new_stock_avg_usd: data.pricing.new_stock_avg_usd,
      new_stock_qty: data.pricing.new_stock_qty,
      sold_details: data.pricing.sold_details ?? [],
      stock_details: data.pricing.stock_details ?? [],
      sold_new_details: data.pricing.sold_new_details ?? [],
      stock_new_details: data.pricing.stock_new_details ?? [],
    },
  };
}

function normalizePartResult(data: PartLookupResponse): PartLookupDetailResult {
  const soldAverage = data.pricing.new_sold_avg_usd ?? data.pricing.used_sold_avg_usd;
  const stockAverage = data.pricing.new_stock_avg_usd ?? data.pricing.used_stock_avg_usd;
  const soldQty = data.pricing.new_sold_qty ?? data.pricing.used_sold_qty;
  const stockQty = data.pricing.new_stock_qty ?? data.pricing.used_stock_qty;
  const summaryPricing: LookupSummaryPricing = {
    hero_new_avg_usd: soldAverage ?? stockAverage ?? null,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: soldQty ?? stockQty ?? null,
    data_source:
      soldAverage !== null && soldAverage !== undefined
        ? "sold"
        : stockAverage !== null && stockAverage !== undefined
          ? "listing"
          : null,
  };

  return {
    set_number: data.partInfo.part_number,
    item_type: "part",
    name: data.partInfo.name,
    theme: data.partInfo.color_name ? `Part · ${data.partInfo.color_name}` : "Part",
    pieces: null,
    image_url: normalizeImageUrl(data.partInfo.image_url),
    market_history: getPartMarketHistory(data.pricing),
    part_info: {
      part_number: data.partInfo.part_number,
      year_released: data.partInfo.year_released,
      color_id: data.partInfo.color_id,
      color_name: data.partInfo.color_name,
    },
    pricing: {
      ...summaryPricing,
      used_sold_avg_usd: data.pricing.used_sold_avg_usd,
      used_sold_min_usd: data.pricing.used_sold_min_usd ?? null,
      used_sold_max_usd: data.pricing.used_sold_max_usd ?? null,
      used_sold_qty: data.pricing.used_sold_qty,
      used_stock_avg_usd: data.pricing.used_stock_avg_usd,
      used_stock_qty: data.pricing.used_stock_qty,
      new_sold_avg_usd: data.pricing.new_sold_avg_usd,
      new_sold_min_usd: data.pricing.new_sold_min_usd ?? null,
      new_sold_max_usd: data.pricing.new_sold_max_usd ?? null,
      new_sold_qty: data.pricing.new_sold_qty,
      new_stock_avg_usd: data.pricing.new_stock_avg_usd,
      new_stock_qty: data.pricing.new_stock_qty,
      sold_details: data.pricing.sold_details ?? [],
      stock_details: data.pricing.stock_details ?? [],
      sold_used_details: data.pricing.sold_used_details ?? [],
      stock_used_details: data.pricing.stock_used_details ?? [],
    },
  };
}
