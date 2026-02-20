"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_PIXELS = 1_150_000;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const currentPixels = width * height;
      let targetWidth = width, targetHeight = height;
      if (currentPixels > MAX_PIXELS) {
        const ratio = Math.sqrt(MAX_PIXELS / currentPixels);
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
        "image/jpeg", 0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

interface Props { onManualEntry: () => void; }

export function ImageUploader({ onManualEntry }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setIsLoading(true); setError(null);
    let compressed: Blob;
    try { compressed = await compressImage(file); }
    catch { setError("Could not process this image. Try a different photo."); setIsLoading(false); return; }

    const formData = new FormData();
    formData.append("image", compressed, "scan.jpg");

    let data: { set_number: string | null; error?: string; message?: string };
    try {
      const res = await fetch("/api/identify", { method: "POST", body: formData });
      data = await res.json();
      if (!res.ok) { setError(data.message ?? "Something went wrong. Please try again."); setIsLoading(false); return; }
    } catch { setError("Network error. Check your connection and try again."); setIsLoading(false); return; }

    if (!data.set_number) {
      setError("Couldn't find a set number. Try a clearer photo or enter it below.");
      onManualEntry(); setIsLoading(false); return;
    }
    router.push(`/result/${data.set_number}`);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={() => cameraInputRef.current?.click()}
        disabled={isLoading}
        className="w-full font-black py-4 px-6 rounded-2xl text-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Scanning…
          </>
        ) : <>📷 Take Photo</>}
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="w-full font-semibold py-4 px-6 rounded-2xl text-lg border-2 transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "transparent", color: "var(--foreground)", borderColor: "var(--border)" }}
      >
        Upload Photo
      </button>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      {error && <p className="text-sm text-center mt-1" style={{ color: "var(--red)" }}>{error}</p>}
    </div>
  );
}
