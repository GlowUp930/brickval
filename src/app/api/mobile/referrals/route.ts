import { createHash } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  claimReferralCode,
  completeReferralOnboarding,
  getOrCreateReferralCode,
  getReferralStatus,
} from "@/lib/referrals";

export async function GET() {
  const userId = await authenticatedUserID();
  if (!userId) return unauthorizedResponse();

  try {
    return NextResponse.json(await getReferralStatus(userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[referrals] Status failed", error);
    return NextResponse.json(
      { error: "referral_unavailable", message: "Referral status is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await authenticatedUserID();
  if (!userId) return unauthorizedResponse();

  let body: { action?: string; code?: string; installationID?: string };
  try {
    body = await request.json() as { action?: string; code?: string; installationID?: string };
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "The referral request could not be read." },
      { status: 400 },
    );
  }

  try {
    const { data: withinLimit, error: limitError } = await supabase.rpc("consume_service_rate_limit", {
      p_key: `referral:${createHash("sha256").update(userId).digest("hex")}`,
      p_limit: 30, p_now: new Date().toISOString(), p_window_seconds: 3600,
    });
    if (limitError) throw limitError;
    if (withinLimit !== true) return NextResponse.json({ error: "rate_limited", message: "Please wait before trying another invite code." }, { status: 429 });
    if (body.action === "create_code") {
      const code = await getOrCreateReferralCode(userId);
      return NextResponse.json({ code });
    }

    if (body.action === "claim") {
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!/^[A-Z0-9]{8}$/.test(code)) {
        return NextResponse.json(
          { error: "invalid_code", message: "Enter a valid BrickVal invite code." },
          { status: 422 },
        );
      }

      const installationID = typeof body.installationID === "string" ? body.installationID.trim() : "";
      if (!installationID || installationID.length > 128) {
        return NextResponse.json(
          { error: "invalid_installation", message: "The installation could not be verified." },
          { status: 422 },
        );
      }

      const claim = await claimReferralCode(userId, code, installationID);
      if (!claim.claimed && claim.status === "invalid") {
        return NextResponse.json(
          { error: "invalid_code", message: "That invite code is invalid or expired." },
          { status: 422 },
        );
      }
      if (!claim.claimed && claim.status === "self_referral") {
        return NextResponse.json(
          { error: "self_referral", message: "You cannot use your own invite code." },
          { status: 422 },
        );
      }
      if (!claim.claimed && claim.status === "installation_already_used") {
        return NextResponse.json(
          { error: "installation_already_used", message: "This installation has already used an invite code." },
          { status: 409 },
        );
      }

      return NextResponse.json({
        ...claim,
        referral: await getReferralStatus(userId),
      });
    }

    if (body.action === "complete_onboarding") {
      const qualification = await completeReferralOnboarding(userId);
      return NextResponse.json({
        ...qualification,
        referral: await getReferralStatus(userId),
      });
    }

    return NextResponse.json(
      { error: "invalid_action", message: "The referral action is not supported." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[referrals] Request failed", error);
    return NextResponse.json(
      { error: "referral_unavailable", message: "Referral service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

async function authenticatedUserID(): Promise<string | null> {
  try {
    return (await auth()).userId;
  } catch {
    return null;
  }
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "unauthorized", message: "Sign in to use referrals." },
    { status: 401 },
  );
}
