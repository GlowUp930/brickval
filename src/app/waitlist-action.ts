"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function joinWaitlist(
  email: string
): Promise<{ ok: boolean; duplicate: boolean }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, duplicate: false };
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: email.toLowerCase().trim() });

  // 23505 = unique_violation — already signed up
  if (error?.code === "23505") return { ok: true, duplicate: true };
  if (error) return { ok: false, duplicate: false };
  return { ok: true, duplicate: false };
}

export async function createLifetimeCheckout() {
  const priceId = process.env.STRIPE_LIFETIME_PRICE_ID;
  if (!priceId) throw new Error("Missing STRIPE_LIFETIME_PRICE_ID env var");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?lifetime=success`,
    cancel_url: `${appUrl}/#waitlist`,
  });

  redirect(session.url!);
}
