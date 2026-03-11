"use server";

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
