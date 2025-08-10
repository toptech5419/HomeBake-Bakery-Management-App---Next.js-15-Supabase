'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getReportCounts } from '@/lib/reports/server-actions';

export interface ReportCounters {
  managerCount: number;
  salesCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  markAsViewed: (type: 'manager' | 'sales') => void;
  hasViewed: (type: 'manager' | 'sales') => boolean;
}

export const useReportCounters = (): ReportCounters => {
  const [error, setError] = useState<string | null>(null);
  
  // Get current date in YYYY-MM-DD format for Nigeria timezone (GMT+1)
  const getCurrentDate = () => {
    const now = new Date();
    // Adjust for Nigeria timezone (GMT+1)
    const nigeriaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    return nigeriaTime.toISOString().split('T')[0];
  };

  const today = getCurrentDate();

  // Combined query for both report types using server action
  const { 
    data: reportCounts, 
    isLoading,
    error: queryError 
  } = useQuery({
    queryKey: ['report-counters', today],
    queryFn: () => getReportCounts(),
    refetchInterval: 30000, // 30 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors
  useEffect(() => {
    if (queryError) {
      const errorMessage = queryError?.message || 'Failed to fetch report data';
      setError(errorMessage);
    } else {
      setError(null);
    }
  }, [queryError]);

  // LocalStorage helpers with daily reset
  const getViewedKey = (type: 'manager' | 'sales') => `owner_viewed_${type}_${today}`;

  const markAsViewed = (type: 'manager' | 'sales') => {
    try {
      localStorage.setItem(getViewedKey(type), 'true');
      
      // Clean up old viewed states (older than 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('owner_viewed_')) {
          const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})$/);
          if (dateMatch) {
            const keyDate = new Date(dateMatch[1]);
            if (keyDate < sevenDaysAgo) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (err) {
      console.warn('Failed to update viewed state:', err);
    }
  };

  const hasViewed = (type: 'manager' | 'sales'): boolean => {
    try {
      return localStorage.getItem(getViewedKey(type)) === 'true';
    } catch (err) {
      console.warn('Failed to check viewed state:', err);
      return false;
    }
  };

  // Calculate counters with viewed state logic
  const rawManagerCount = reportCounts?.managerCount || 0;
  const rawSalesCount = reportCounts?.salesCount || 0;
  
  // Apply viewed state logic
  const managerCount = rawManagerCount && !hasViewed('manager') ? 1 : 0;
  const salesCount = rawSalesCount && !hasViewed('sales') ? 1 : 0;
  const totalCount = managerCount + salesCount;

  return {
    managerCount,
    salesCount,
    totalCount,
    isLoading,
    error,
    markAsViewed,
    hasViewed,
  };
};