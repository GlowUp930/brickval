export const productFeedbackSurveyTypes = ["post_purchase", "pmf", "cancellation"] as const;
export type ProductFeedbackSurveyType = (typeof productFeedbackSurveyTypes)[number];

export const postPurchaseReasons = [
  "unlimited_scans",
  "bulk_scanning",
  "collection_tracking",
  "values_history",
  "customization",
  "supporting_brickvalue",
  "other",
] as const;

export const acquisitionSources = [
  "tiktok",
  "instagram",
  "youtube",
  "app_store_search",
  "web_search",
  "friend_community",
  "other",
] as const;

export const pmfSentiments = ["very_disappointed", "somewhat_disappointed", "not_disappointed", "no_longer_use"] as const;
export const cancellationReasons = [
  "price",
  "scan_accuracy",
  "scan_speed",
  "not_enough_use",
  "missing_feature",
  "technical_problem",
  "temporary_need",
  "other",
] as const;

export type ProductFeedbackPayload = {
  surveyType?: unknown;
  dedupeKey?: unknown;
  anonymousID?: unknown;
  postPurchaseReason?: unknown;
  postPurchaseReasons?: unknown;
  acquisitionSource?: unknown;
  pmfSentiment?: unknown;
  pmfBenefit?: unknown;
  pmfBenefits?: unknown;
  pmfMissing?: unknown;
  pmfImprovements?: unknown;
  cancellationReason?: unknown;
  cancellationReasons?: unknown;
  additionalText?: unknown;
  accessCohort?: unknown;
  productID?: unknown;
  isTrial?: unknown;
  successfulScanCount?: unknown;
  appVersion?: unknown;
  appBuild?: unknown;
};

export function isAllowedValue(value: unknown, values: readonly string[]): value is string {
  return typeof value === "string" && values.includes(value);
}

export function isAllowedArray(value: unknown, values: readonly string[], maxLength = 8): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= maxLength &&
    value.every((item) => isAllowedValue(item, values));
}

export function isValidText(value: unknown, maxLength: number, required = false): value is string {
  if (value === undefined || value === null) return !required;
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function isValidProductFeedbackPayload(payload: ProductFeedbackPayload): boolean {
  if (!isAllowedValue(payload.surveyType, productFeedbackSurveyTypes)) return false;
  if (!isValidText(payload.dedupeKey, 200, true) || !isValidText(payload.anonymousID, 128, true)) return false;
  if (!isValidText(payload.accessCohort, 64) || !isValidText(payload.productID, 128)) return false;
  if (!isValidText(payload.appVersion, 32, true) || !isValidText(payload.appBuild, 32, true)) return false;
  if (!Number.isInteger(payload.successfulScanCount) || Number(payload.successfulScanCount) < 0 || Number(payload.successfulScanCount) > 100_000) return false;
  if (payload.isTrial !== undefined && typeof payload.isTrial !== "boolean") return false;
  if (!isValidText(payload.additionalText, 1000)) return false;

  switch (payload.surveyType) {
    case "post_purchase":
      return isAllowedValue(payload.postPurchaseReason, postPurchaseReasons) &&
        isAllowedValue(payload.acquisitionSource, acquisitionSources) &&
        (payload.postPurchaseReasons === undefined || isAllowedArray(payload.postPurchaseReasons, postPurchaseReasons));
    case "pmf":
      return isAllowedValue(payload.pmfSentiment, pmfSentiments) &&
        isValidText(payload.pmfBenefit, 1000, true) &&
        isValidText(payload.pmfMissing, 1000, true) &&
        (payload.pmfBenefits === undefined || isValidTextArray(payload.pmfBenefits, 6)) &&
        (payload.pmfImprovements === undefined || isValidTextArray(payload.pmfImprovements, 6));
    case "cancellation":
      return isAllowedValue(payload.cancellationReason, cancellationReasons) &&
        (payload.cancellationReasons === undefined || isAllowedArray(payload.cancellationReasons, cancellationReasons));
  }

  return false;
}

function isValidTextArray(value: unknown, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= maxLength &&
    value.every((item) => isValidText(item, 200, true));
}

export function buildProductFeedbackDedupeKey(subject: string, dedupeKey: string): string {
  return `${subject}:${dedupeKey}`;
}
