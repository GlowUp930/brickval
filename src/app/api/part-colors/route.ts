import { NextResponse } from "next/server";
import { getBrickLinkColors } from "@/lib/bricklink";

export async function GET() {
  try {
    const colors = await getBrickLinkColors();
    return NextResponse.json({ colors });
  } catch (err) {
    console.error("[part-colors] Failed to load BrickLink colors:", err);
    return NextResponse.json(
      { error: "internal", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
