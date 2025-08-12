'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useFreshNavigation() {
  const router = useRouter();

  const navigateToSalesDashboard = useCallback(() => {
    // Clear any potential cached state
    if (typeof window !== 'undefined') {
      // Force a fresh navigation to sales dashboard
      window.history.replaceState(null, '', '/dashboard/sales');
      
      // Add cache-busting parameter
      const freshUrl = `/dashboard/sales?t=${Date.now()}`;
      
      // Force router refresh and navigate
      router.refresh();
      router.replace(freshUrl);
    }
  }, [router]);

  const navigateWithFreshLoad = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      // Add timestamp to break caching
      const separator = path.includes('?') ? '&' : '?';
      const freshUrl = `${path}${separator}t=${Date.now()}`;
      
      router.refresh();
      router.push(freshUrl);
    }
  }, [router]);

  return {
    navigateToSalesDashboard,
    navigateWithFreshLoad
  };
}