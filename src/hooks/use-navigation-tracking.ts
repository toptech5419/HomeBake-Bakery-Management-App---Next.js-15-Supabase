"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { setNavigationHistory } from '@/lib/utils/navigation-history';

interface UseNavigationTrackingProps {
  userRole?: string;
  fromPage?: string;
  enabled?: boolean;
}

/**
 * Hook to automatically track navigation history for back button functionality
 * @param userRole - Current user's role
 * @param fromPage - Optional identifier for the source page  
 * @param enabled - Whether tracking is enabled (default: true)
 */
export function useNavigationTracking({ 
  userRole, 
  fromPage, 
  enabled = true 
}: UseNavigationTrackingProps = {}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !pathname) return;

    // Don't track inventory page visits
    if (pathname.includes('/inventory')) return;

    // Track the current page for back navigation
    setNavigationHistory(pathname, userRole, fromPage);
  }, [pathname, userRole, fromPage, enabled]);

  return {
    currentPath: pathname,
    isTrackingEnabled: enabled
  };
}