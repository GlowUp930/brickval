import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import type Stripe from "stripe";

// In App Router, use req.text() to get the raw body for Stripe signature verification.
// Do NOT use req.json() — it will break the signature check.

/**
 * Resolve clerk_user_id and update Pro status.
 * Tries subscription metadata first (set at checkout), then customer metadata as fallback.
 */
async function setProStatus(customerId: string, isPro: boolean, subscriptionMetadata: Stripe.Metadata | null | undefined, provider: string, version: number, eventID: string) {
  // 1. Try subscription metadata first (checkout sets clerk_user_id here)
  let userId = subscriptionMetadata?.clerk_user_id;

  // 2. Fall back to customer metadata
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      throw new Error("Subscription customer is deleted");
    }
    userId = (customer as Stripe.Customer).metadata?.clerk_user_id;
  }

  if (!userId) throw new Error("Subscription identity missing");
  const { error } = await supabase.rpc("apply_subscription_entitlement", {
    p_user_id: userId, p_provider: provider, p_active: isPro,
    p_version_ms: version, p_event_id: eventID,
  });
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "missing_signature", message: "The webhook signature is missing." }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Missing env var: STRIPE_WEBHOOK_SECRET");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "invalid_signature", message: "The webhook signature is invalid." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // ── One-time lifetime purchase ─────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Only handle one-time payments (mode: "payment"), not subscription checkouts
        if (session.mode === "payment" && session.payment_status === "paid") {
          const userId = session.metadata?.clerk_user_id;
          if (!userId) {
            console.error("[webhook] checkout.session.completed: no clerk_user_id in metadata");
            break;
          }
          await setProStatus(session.customer as string, true, session.metadata,
            "stripe_lifetime", event.created * 1000, event.id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const supplied = event.data.object as Stripe.Subscription;
        const observedAt = Date.now();
        const sub = await stripe.subscriptions.retrieve(supplied.id);
        const isPro = sub.status === "active" || sub.status === "trialing";
        await setProStatus(sub.customer as string, isPro, sub.metadata,
          `stripe:${sub.id}`, observedAt, event.id);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionID = typeof subscription === "string" ? subscription : subscription?.id;
        if (!subscriptionID) break;
        const observedAt = Date.now();
        const sub = await stripe.subscriptions.retrieve(subscriptionID);
        await setProStatus(sub.customer as string, sub.status === "active" || sub.status === "trialing",
          sub.metadata, `stripe:${sub.id}`, observedAt, event.id);
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "webhook_failed", message: "The webhook could not be processed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
