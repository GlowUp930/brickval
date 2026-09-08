import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getMonetizationStatus, refreshProEntitlement } from "@/lib/scan-gate";

export async function POST() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    return NextResponse.json({ error: "authentication_unavailable", message: "Sign-in is temporarily unavailable." }, { status: 401 });
  }
  if (!userId) {
    return NextResponse.json({ error: "authentication_required", message: "Sign in to sync your subscription." }, { status: 401 });
  }

  const verifiedPro = await refreshProEntitlement(userId);
  const status = await getMonetizationStatus(userId);

  return NextResponse.json({
    verified: verifiedPro !== null,
    isPro: status.usage.isPro,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
