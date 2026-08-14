import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

type DevicePayload = {
  deviceID?: string;
  apnsToken?: string;
  environment?: "sandbox" | "production";
  subscriberID?: string | null;
  accessCohort?: string | null;
  accountAlertsEnabled?: boolean;
};

function isValidText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    // Anonymous users can still use local reminders. The device token is only
    // useful for a future signed-in account alert.
  }

  let body: DevicePayload;
  try {
    body = await req.json() as DevicePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !isValidText(body.deviceID, 128) ||
    !isValidText(body.apnsToken, 256) ||
    (body.environment !== "sandbox" && body.environment !== "production")
  ) {
    return NextResponse.json({ error: "Invalid notification device" }, { status: 400 });
  }

  if (body.subscriberID && !isValidText(body.subscriberID, 128)) {
    return NextResponse.json({ error: "Invalid subscriber" }, { status: 400 });
  }
  if (body.subscriberID && body.subscriberID !== userId) {
    return NextResponse.json({ error: "Subscriber does not match the signed-in user" }, { status: 403 });
  }

  // Anonymous devices may use local reminders, but only an authenticated
  // Clerk user can register for account-action APNs alerts.
  const subscriberID = userId;

  const { error } = await supabase
    .from("notification_devices")
    .upsert({
      device_id: body.deviceID,
      apns_token: body.apnsToken,
      environment: body.environment,
      app_user_id: subscriberID,
      clerk_user_id: userId,
      access_cohort: body.accessCohort ?? null,
      account_alerts_enabled: Boolean(userId && body.accountAlertsEnabled === true),
      enabled: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "device_id" });

  if (error) {
    console.error("[notifications] Device registration failed:", error);
    return NextResponse.json({ error: "Device registration failed" }, { status: 500 });
  }

  return NextResponse.json({ registered: true });
}

export async function DELETE(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    // Device removal is only available to authenticated users.
  }
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { deviceID?: string };
  try {
    body = await req.json() as { deviceID?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidText(body.deviceID, 128)) {
    return NextResponse.json({ error: "Invalid notification device" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_devices")
    .update({ enabled: false, account_alerts_enabled: false })
    .eq("device_id", body.deviceID)
    .eq("clerk_user_id", userId);

  if (error) {
    console.error("[notifications] Device removal failed:", error);
    return NextResponse.json({ error: "Device removal failed" }, { status: 500 });
  }

  return NextResponse.json({ removed: true });
}
