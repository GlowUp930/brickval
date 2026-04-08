import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

const PRO_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

const REVOKE_EVENTS = new Set([
  "EXPIRATION",
  "BILLING_ISSUE",
  "PRODUCT_CHANGE",
]);

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    event?: {
      type?: string;
      app_user_id?: string;
      entitlement_ids?: string[];
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  if (!event?.type || !event.app_user_id) {
    return NextResponse.json({ error: "Missing event data" }, { status: 400 });
  }

  const userId = event.app_user_id;
  const eventType = event.type;

  // CANCELLATION means user cancelled but still has access until period ends.
  // We keep is_pro = true. EXPIRATION is when access actually ends.
  if (PRO_EVENTS.has(eventType)) {
    const { error } = await supabase
      .from("users")
      .upsert({ id: userId, is_pro: true }, { onConflict: "id" });
    if (error) {
      console.error(`[revenuecat] Failed to activate pro for ${userId}:`, error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  } else if (REVOKE_EVENTS.has(eventType)) {
    const { error } = await supabase
      .from("users")
      .upsert({ id: userId, is_pro: false }, { onConflict: "id" });
    if (error) {
      console.error(`[revenuecat] Failed to revoke pro for ${userId}:`, error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
