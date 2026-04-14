"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

// Set to the Price ID from your $29.99 one-time product in Stripe Dashboard
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

export async function createCheckoutSession() {
  const { userId } = await auth();
  if (!userId) redirect("/account");

  if (!STRIPE_PRICE_ID) {
    throw new Error(
      "Missing STRIPE_PRICE_ID env var. Add your $29.99 lifetime price ID from Stripe."
    );
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    ...(email ? { customer_email: email } : {}),
    // clerk_user_id in session metadata so webhook can resolve the BrickVal user
    // on checkout.session.completed.
    metadata: {
      clerk_user_id: userId,
    },
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/scan?upgraded=true`,
    cancel_url: `${appUrl}/upgrade`,
  });

  redirect(session.url!);
}
