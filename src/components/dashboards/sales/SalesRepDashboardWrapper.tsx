'use client';

import { useState, useEffect } from 'react';
import { SalesRepDashboard } from './SalesRepDashboard';
import { FreshSalesLoading } from './FreshSalesLoading';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Cache-busting component identifier
const CACHE_VERSION = Date.now().toString();

interface SalesRepDashboardWrapperProps {
  userId: string;
  userName: string;
}

// Removed old SimpleLoading component

export function SalesRepDashboardWrapper({ userId, userName }: SalesRepDashboardWrapperProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [cacheKey] = useState(() => `sales-dash-${CACHE_VERSION}-${userId}`);

  useEffect(() => {
    // Very quick initialization to prevent flash but ensure smooth transition
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100); // Slightly longer to ensure loading screen is visible

    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return <FreshSalesLoading />;
  }

  return (
    <div key={cacheKey} className="w-full">
      <ErrorBoundary 
        fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 text-center max-w-md">
              Something went wrong while loading the dashboard. Please refresh the page and try again.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        }
      >
        <SalesRepDashboard
          userId={userId}
          userName={userName}
        />
      </ErrorBoundary>
    </div>
  );
}