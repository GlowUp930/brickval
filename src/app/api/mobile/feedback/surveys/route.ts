import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  buildProductFeedbackDedupeKey,
  isValidProductFeedbackPayload,
  type ProductFeedbackPayload,
} from "@/lib/product-feedback";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    // Anonymous feedback is supported with the installation identifier.
  }

  let body: ProductFeedbackPayload;
  try {
    body = await req.json() as ProductFeedbackPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "The survey response could not be read." }, { status: 400 });
  }

  if (!isValidProductFeedbackPayload(body)) {
    return NextResponse.json({ error: "invalid_survey_response", message: "The survey response is invalid." }, { status: 400 });
  }

  const subject = userId ?? String(body.anonymousID);
  const dedupeKey = buildProductFeedbackDedupeKey(subject, String(body.dedupeKey));
  const identityColumn = userId ? "clerk_user_id" : "anonymous_id";
  const { data: recentFeedback, error: historyError } = await supabase
    .from("product_feedback")
    .select("survey_type, created_at")
    .eq(identityColumn, subject)
    .order("created_at", { ascending: false })
    .limit(20);

  if (historyError) {
    console.error("[product-feedback] Survey history lookup failed:", historyError);
    return NextResponse.json({ error: "survey_unavailable", message: "The survey response could not be recorded." }, { status: 500 });
  }

  const now = Date.now();
  const mostRecentSurvey = recentFeedback?.[0]?.created_at ? Date.parse(recentFeedback[0].created_at) : 0;
  if (String(body.surveyType) !== "post_purchase" && mostRecentSurvey > now - 30 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ recorded: false, cooldown: true });
  }
  const mostRecentPMF = recentFeedback?.find((row) => row.survey_type === "pmf")?.created_at;
  if (String(body.surveyType) === "pmf" && mostRecentPMF && Date.parse(mostRecentPMF) > now - 90 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ recorded: false, cooldown: true });
  }

  const { error } = await supabase.from("product_feedback").insert({
    survey_type: String(body.surveyType),
    dedupe_key: dedupeKey,
    clerk_user_id: userId,
    anonymous_id: userId ? null : String(body.anonymousID),
    post_purchase_reason: body.postPurchaseReason ?? null,
    post_purchase_reasons: body.postPurchaseReasons ?? null,
    acquisition_source: body.acquisitionSource ?? null,
    pmf_sentiment: body.pmfSentiment ?? null,
    pmf_benefit: body.pmfBenefit ?? null,
    pmf_benefits: body.pmfBenefits ?? null,
    pmf_missing: body.pmfMissing ?? null,
    pmf_improvements: body.pmfImprovements ?? null,
    cancellation_reason: body.cancellationReason ?? null,
    cancellation_reasons: body.cancellationReasons ?? null,
    additional_text: body.additionalText ?? null,
    access_cohort: body.accessCohort ?? null,
    product_id: body.productID ?? null,
    is_trial: body.isTrial ?? null,
    successful_scan_count: Number(body.successfulScanCount),
    app_version: String(body.appVersion),
    app_build: String(body.appBuild),
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ recorded: false, duplicate: true });
    }
    console.error("[product-feedback] Survey insert failed:", error);
    return NextResponse.json({ error: "survey_unavailable", message: "The survey response could not be recorded." }, { status: 500 });
  }

  return NextResponse.json({ recorded: true });
}
