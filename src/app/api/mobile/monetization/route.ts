import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  getMonetizationStatus,
  grandfatherBulkIntroductoryCredit,
} from "@/lib/scan-gate";

export async function GET() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch (error) {
    console.warn("[monetization] Auth unavailable; returning guest policy.", error);
  }

  const status = await getMonetizationStatus(userId);
  return NextResponse.json(status, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to restore your introductory bulk credit." },
      { status: 401 },
    );
  }

  let body: { action?: string; installationID?: string };
  try {
    body = await request.json() as { action?: string; installationID?: string };
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "The monetization request could not be read." },
      { status: 400 },
    );
  }

  if (body.action !== "grandfather_bulk_credit") {
    return NextResponse.json(
      { error: "invalid_action", message: "The monetization action is not supported." },
      { status: 400 },
    );
  }

  const installationID = body.installationID?.trim() ?? "";
  if (!installationID || installationID.length > 128) {
    return NextResponse.json(
      { error: "invalid_installation", message: "The installation could not be verified." },
      { status: 422 },
    );
  }

  try {
    const grandfathered = await grandfatherBulkIntroductoryCredit(userId, installationID);
    return NextResponse.json({ grandfathered });
  } catch (error) {
    console.error("[monetization] Legacy credit sync failed", error);
    return NextResponse.json(
      { error: "monetization_unavailable", message: "Your introductory credit could not be restored yet." },
      { status: 503 },
    );
  }
}
