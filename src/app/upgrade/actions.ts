"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";

// Set this to your actual Stripe Price ID for $12.99 AUD/month
// Create it in: Stripe Dashboard → Products → Add product → $12.99 AUD recurring
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

export async function createCheckoutSession() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  if (!STRIPE_PRICE_ID) {
    throw new Error(
      "Missing STRIPE_PRICE_ID env var. Create the product in Stripe and add the price ID."
    );
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    currency: "aud",
    ...(email ? { customer_email: email } : {}),
    // clerk_user_id in metadata links the Stripe customer to our Supabase user row
    // The webhook reads this to update is_pro
    metadata: {
      clerk_user_id: userId,
    },
    subscription_data: {
      metadata: {
        clerk_user_id: userId,
      },
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
