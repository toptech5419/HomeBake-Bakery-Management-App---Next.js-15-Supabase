"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {}, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <h2 className="text-2xl font-bold text-destructive mb-4">Logout Error</h2>
      <p className="mb-2 text-muted-foreground">{error.message || "An error occurred during logout."}</p>
      <button
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
        onClick={() => reset()}
      >
        Try Again
      </button>
    </div>
  );
} 