import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendAPNsAlert } from "@/lib/apns";
import { fetchRevenueCatProEntitlement } from "@/lib/revenuecat-entitlement";
import { billingAlertForLanguage } from "@/lib/notification-localization";

/**
 * RevenueCat Webhook endpoint.
 * Receives subscription lifecycle events and syncs is_pro to Supabase.
 *
 * RevenueCat webhook payload shape (v1):
 * {
 *   "api_version": "1.0",
 *   "event": {
 *     "type": "INITIAL_PURCHASE" | "RENEWAL" | "CANCELLATION" | "EXPIRATION" | ...,
 *     "app_user_id": "<clerk_user_id>",
 *     "entitlement_ids": ["pro"],
 *     ...
 *   }
 * }
 *
 * Setup: In RevenueCat dashboard → Integrations → Webhooks,
 * set URL to https://brickvalue.live/api/webhook/revenuecat
 * and set Authorization header to Bearer <REVENUECAT_WEBHOOK_SECRET>.
 */

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[revenuecat] Missing REVENUECAT_WEBHOOK_SECRET");
    return NextResponse.json({ error: "webhook_not_configured", message: "Webhook is not configured." }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized", message: "Unauthorized." }, { status: 401 });
  }

  let body: {
    event?: {
      type?: string;
      app_user_id?: string;
      entitlement_ids?: string[];
      id?: string;
      event_timestamp_ms?: number;
      transferred_from?: string[];
      transferred_to?: string[];
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "The webhook body could not be read." }, { status: 400 });
  }

  const event = body.event;
  if (!event?.type || (!event.app_user_id && event.type !== "TRANSFER")) {
    return NextResponse.json({ error: "missing_event_data", message: "The webhook event is missing data." }, { status: 400 });
  }

  if (event.type === "TEST") return NextResponse.json({ received: true });
  const userIds = event.type === "TRANSFER"
    ? [...new Set([...(event.transferred_from ?? []), ...(event.transferred_to ?? [])])]
    : [event.app_user_id!];
  if (!userIds.length || userIds.some(id => id.length > 128) || !event.id ||
      !Number.isFinite(event.event_timestamp_ms)) {
    return NextResponse.json({ error: "invalid_event", message: "The webhook event is invalid." }, { status: 400 });
  }

  try {
    for (const userId of userIds) {
      // Events are notifications to reconcile, not independent entitlement truth.
      // This preserves grace, scheduled product changes, refunds, and transfers.
      const isPro = await fetchRevenueCatProEntitlement(userId);
      if (isPro === null) throw new Error("Entitlement verification unavailable");
      const { data: changed, error } = await supabase.rpc("apply_subscription_entitlement", {
        p_user_id: userId, p_provider: "revenuecat", p_active: isPro,
        p_version_ms: event.event_timestamp_ms, p_event_id: event.id,
      });
      if (error) throw error;
      if (changed === true && event.type === "BILLING_ISSUE") await sendBillingAlerts(userId);
    }
  } catch {
    console.error("[revenuecat] Subscription reconciliation failed; requesting retry");
    return NextResponse.json({ error: "subscription_unavailable", message: "The subscription update could not be saved." }, { status: 503 });
  }

  return NextResponse.json({ received: true });
}

async function sendBillingAlerts(appUserID: string) {
  if (process.env.BRICKVALUE_NOTIFICATIONS_ENABLED === "false" ||
      process.env.BRICKVALUE_ACCOUNT_ALERTS_ENABLED === "false") return;

  const { data: devices, error } = await supabase
    .from("notification_devices")
    .select("device_id, apns_token, environment, language_code")
    .eq("app_user_id", appUserID)
    .eq("enabled", true)
    .eq("account_alerts_enabled", true);
  if (error) {
    console.error("[revenuecat] Failed to load notification devices:", error);
    return;
  }

  await Promise.all((devices ?? []).map(async (device) => {
    try {
      const copy = billingAlertForLanguage(device.language_code);
      const result = await sendAPNsAlert({
        token: device.apns_token,
        environment: device.environment,
        title: copy.title,
        body: copy.body,
        deepLink: "brickval://settings",
        category: "accountAction",
      });
      if (result.statusCode === 410 || result.statusCode === 400) {
        await supabase
          .from("notification_devices")
          .update({ enabled: false })
          .eq("device_id", device.device_id);
      }
    } catch (sendError) {
      console.error("[revenuecat] Billing alert delivery failed:", sendError);
    }
  }));
}
