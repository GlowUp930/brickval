"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";

const MAX_PIXELS_SET = 1_150_000;
const MAX_PIXELS_MINIFIG = 3_000_000;

async function compressImage(file: File, mode: "set" | "minifig"): Promise<Blob> {
  // Minifig mode: if the file is already small enough, send original to preserve detail
  if (mode === "minifig" && file.size <= 4 * 1024 * 1024) {
    return file;
  }

  const maxPixels = mode === "minifig" ? MAX_PIXELS_MINIFIG : MAX_PIXELS_SET;
  const quality = mode === "minifig" ? 0.92 : 0.85;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const currentPixels = width * height;
      let targetWidth = width, targetHeight = height;
      if (currentPixels > maxPixels) {
        const ratio = Math.sqrt(maxPixels / currentPixels);
        targetWidth = Math.round(width * ratio);
        targetHeight = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth; canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg", quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

interface Props { mode: "set" | "minifig"; onManualEntry: () => void; }

export function ImageUploader({ mode, onManualEntry }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  async function handleFile(file: File) {
    setIsLoading(true); setError(null);
    let compressed: Blob;
    try { compressed = await compressImage(file, mode); }
    catch { setError("Could not process this image. Try a different photo."); setIsLoading(false); return; }

    const formData = new FormData();
    formData.append("image", compressed, "scan.jpg");

    let data: { set_number: string | null; error?: string; message?: string };
    try {
      const res = await fetch(`/api/identify?mode=${mode}`, { method: "POST", body: formData });
      data = await res.json();
      if (!res.ok) { setError(data.message ?? "Something went wrong. Please try again."); setIsLoading(false); return; }
    } catch { setError("Network error. Check your connection and try again."); setIsLoading(false); return; }

    if (!data.set_number) {
      if (mode === "minifig") {
        setError("Couldn't identify this minifigure. Try a clearer photo with a plain background.");
      } else {
        setError("Couldn't find a set number. Try a clearer photo or enter it below.");
        onManualEntry();
      }
      setIsLoading(false); return;
    }
    if (mode === "minifig") {
      router.push(`/result/minifig/${data.set_number}`);
    } else {
      router.push(`/result/${data.set_number}`);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Drop zone */}
      <div
        className={`w-full rounded-2xl p-6 flex flex-col items-center gap-4 transition-all cursor-pointer ${
          dragActive ? "glow-accent-sm" : ""
        }`}
        style={{
          background: "var(--surface-2)",
          border: dragActive ? "1px solid var(--accent)" : "1px solid var(--border)",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Camera className="w-8 h-8" style={{ color: "var(--muted)" }} />
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: "var(--foreground)" }}>
            {mode === "minifig" ? "Photo of your minifigure" : "Upload a photo"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {mode === "minifig"
              ? "Clear photo on a plain background works best"
              : "Drag & drop or tap to take a photo"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning…
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Take Photo
            </>
          )}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <Upload className="w-4 h-4" />
          Choose file
        </button>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      {error && <p className="text-sm text-center mt-1" style={{ color: "var(--red)" }}>{error}</p>}
    </div>
  );
}
