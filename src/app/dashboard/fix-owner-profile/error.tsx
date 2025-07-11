"use client";
import { Button } from '@/components/ui/button';

export default function FixOwnerProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border p-8 text-center shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-red-600">Profile Error</h1>
        <p className="mb-4 text-gray-600">
          Something went wrong while setting up your profile.
        </p>
        <p className="mb-6 text-sm text-gray-500">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button 
          onClick={reset}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
} 