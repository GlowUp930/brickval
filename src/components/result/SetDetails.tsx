import Image from "next/image";
import type { BricksetSet } from "@/types/brickset";
import { getRetirementStatus } from "@/types/brickset";

interface Props {
  set: BricksetSet | null;
}

const RETIREMENT_BADGE = {
  retired: {
    label: "Retired",
    bg: "var(--red)",
    color: "#fff",
  },
  active: {
    label: "Available",
    bg: "var(--green)",
    color: "#fff",
  },
  unknown: {
    label: "Status unknown",
    bg: "var(--surface-2)",
    color: "var(--muted)",
  },
} as const;

export function SetDetails({ set }: Props) {
  if (!set) return null;

  const status = getRetirementStatus(set);
  const badge = RETIREMENT_BADGE[status];

  const imageUrl =
    set.image?.imageURL || set.image?.thumbnailURL || null;

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Set image */}
      {imageUrl ? (
        <div
          className="relative w-full aspect-square rounded-2xl overflow-hidden"
          style={{ background: "var(--surface-2)", maxWidth: 320 }}
        >
          <Image
            src={imageUrl}
            alt={set.name}
            fill
            className="object-contain p-6"
            sizes="(max-width: 400px) 100vw, 320px"
            priority
          />
        </div>
      ) : (
        <div
          className="w-full aspect-square rounded-2xl flex items-center justify-center text-6xl"
          style={{ background: "var(--surface-2)", maxWidth: 320 }}
        >
          🧱
        </div>
      )}

      {/* Set info */}
      <div className="text-center">
        <h2 className="text-2xl font-black leading-tight" style={{ color: "var(--foreground)" }}>
          {set.name}
        </h2>
        <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
          #{set.number} · {set.year}
          {set.pieces ? ` · ${set.pieces.toLocaleString()} pcs` : ""}
        </p>

        {/* Retirement badge */}
        <span
          className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}
