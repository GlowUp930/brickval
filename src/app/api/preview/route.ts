import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBrickLinkSetItem, getBrickLinkMinifigItem } from "@/lib/bricklink";
import type { CandidatePreview } from "@/types/scan";

// Preview does NOT increment scan count — it's a free lightweight lookup.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { mode?: string; ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode === "minifig" ? "minifig" : "set";
  const ids = (body.ids ?? []).slice(0, 3);

  if (ids.length === 0) return NextResponse.json({ previews: [] });

  const previews: CandidatePreview[] = await Promise.all(
    ids.map(async (id): Promise<CandidatePreview> => {
      try {
        const item = mode === "minifig"
          ? await getBrickLinkMinifigItem(id)
          : await getBrickLinkSetItem(id);
        return {
          id,
          name: item?.name ?? null,
          image_url: item?.image_url
            ? item.image_url.startsWith("//") ? `https:${item.image_url}` : item.image_url
            : null,
          year_released: item?.year_released ?? null,
          is_obsolete: mode === "set" ? (item?.is_obsolete ?? null) : null,
        };
      } catch {
        return { id, name: null, image_url: null, year_released: null, is_obsolete: null };
      }
    })
  );

  return NextResponse.json({ previews });
}
