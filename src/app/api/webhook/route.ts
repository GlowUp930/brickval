import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import type Stripe from "stripe";

// In App Router, use req.text() to get the raw body for Stripe signature verification.
// Do NOT use req.json() — it will break the signature check.

async function setProStatus(customerId: string, isPro: boolean) {
  // The Stripe customer must have clerk_user_id in metadata (set at checkout creation)
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    console.error(`[webhook] Customer ${customerId} is deleted`);
    return;
  }

  const userId = (customer as Stripe.Customer).metadata?.clerk_user_id;
  if (!userId) {
    console.error(
      `[webhook] No clerk_user_id in metadata for customer ${customerId}`
    );
    return;
  }

  const { error } = await supabase
    .from("users")
    .upsert({ id: userId, is_pro: isPro }, { onConflict: "id" });

  if (error) {
    console.error(`[webhook] Failed to update is_pro for ${userId}:`, error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
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
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // Activate Pro
      case "customer.subscription.created":
      case "customer.subscription.resumed":
      case "invoice.payment_succeeded": {
        const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
        const customerId =
          "customer" in obj ? (obj.customer as string) : "";
        if (customerId) {
          const sub =
            event.type === "invoice.payment_succeeded"
              ? (obj as Stripe.Invoice)
              : (obj as Stripe.Subscription);
          const status =
            "status" in sub ? sub.status : "active";
          const isPro = status === "active" || status === "trialing";
          await setProStatus(customerId, isPro);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const isPro = sub.status === "active" || sub.status === "trialing";
        await setProStatus(sub.customer as string, isPro);
        break;
      }

      // Deactivate Pro
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "invoice.payment_failed": {
        const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
        const customerId =
          "customer" in obj ? (obj.customer as string) : "";
        if (customerId) {
          await setProStatus(customerId, false);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
