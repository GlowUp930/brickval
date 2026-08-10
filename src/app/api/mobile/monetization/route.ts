import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getMonetizationStatus } from "@/lib/scan-gate";

export async function GET() {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch (error) {
    console.warn("[monetization] Auth unavailable; returning guest policy.", error);
  }

  const status = await getMonetizationStatus(userId);
  return NextResponse.json(status, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
