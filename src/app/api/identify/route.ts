import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@/lib/anthropic";

const VISION_PROMPT = `Look at this LEGO box image. Find the LEGO set number — it is typically a 4–6 digit number printed on the front lower-right corner, back panel, or near the barcode. Return ONLY valid JSON: {"set_number": "75192"} or {"set_number": null} if you cannot find a set number with confidence. Do not guess. Do not include hyphens or suffixes.`;

const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];

function isAcceptedMediaType(type: string): type is AcceptedMediaType {
  return ACCEPTED_MEDIA_TYPES.includes(type as AcceptedMediaType);
}

export async function POST(req: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const imageFile = formData.get("image") as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const mediaType = imageFile.type;
  if (!isAcceptedMediaType(mediaType)) {
    return NextResponse.json(
      {
        error: "Unsupported image type",
        message: "Please upload a JPEG, PNG, or WebP image.",
      },
      { status: 415 }
    );
  }

  // Convert to base64 for Claude Vision
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  let responseText: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    });

    responseText =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";
  } catch (err) {
    console.error("[identify] Claude Vision error:", err);
    return NextResponse.json(
      { error: "Vision API failed", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  // Parse the JSON response from Claude
  let parsed: { set_number: string | null };
  try {
    // Claude should return only JSON, but strip any markdown code fences just in case
    const cleaned = responseText
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[identify] Failed to parse Claude response:", responseText);
    // Treat unparseable response as "not found"
    return NextResponse.json({ set_number: null });
  }

  // Validate the set number format (4–6 digits)
  if (parsed.set_number) {
    const cleaned = parsed.set_number.replace(/[^0-9]/g, "");
    if (cleaned.length < 4 || cleaned.length > 8) {
      return NextResponse.json({ set_number: null });
    }
    parsed.set_number = cleaned;
  }

  return NextResponse.json({ set_number: parsed.set_number ?? null });
}
