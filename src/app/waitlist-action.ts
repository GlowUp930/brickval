"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  if (error) {
    console.error("[waitlist] Supabase insert error:", error);
    return { ok: false, duplicate: false };
  }
  return { ok: true, duplicate: false };
}

export async function createLifetimeCheckout() {
  const priceId = process.env.STRIPE_LIFETIME_PRICE_ID;
  if (!priceId) redirect("/#waitlist");

  const h = await headers();
  const host = h.get("host") ?? "brickvalue.live";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const appUrl = `${proto}://${host}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?lifetime=success`,
    cancel_url: `${appUrl}/#waitlist`,
  });

  redirect(session.url!);
}
