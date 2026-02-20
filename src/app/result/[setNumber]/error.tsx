"use client";

import Link from "next/link";

export default function ResultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
      <p className="text-gray-500 text-sm max-w-xs">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Try again
        </button>
        <Link
          href="/scan"
          className="border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Back to scan
        </Link>
      </div>
    </main>
  );
}
