'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ManagerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Manager Dashboard Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 shadow-lg max-w-md w-full text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Dashboard Error
        </h2>
        <p className="text-gray-600 mb-6">
          Something went wrong while loading the manager dashboard. This might be due to a recent end shift operation.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-orange-500 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/manager'}
            className="w-full bg-gray-100 text-gray-700 rounded-lg py-2 px-4 hover:bg-gray-200 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}