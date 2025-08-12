'use client';

import { useState, useEffect } from 'react';
import { SalesRepDashboard } from './SalesRepDashboard';
import { FreshSalesLoading } from './FreshSalesLoading';

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
      <SalesRepDashboard
        userId={userId}
        userName={userName}
      />
    </div>
  );
}