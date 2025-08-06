'use client';

import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';

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
  const supabase = createClientComponentClient();

  // Query for manager reports (all_batches table)
  const { 
    data: managerReports, 
    isLoading: managerLoading,
    error: managerError 
  } = useQuery({
    queryKey: ['manager-reports-counter', today],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('all_batches')
          .select('id, created_at')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
          .limit(1);

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching manager reports:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Query for sales reports (shift_reports table)
  const { 
    data: salesReports, 
    isLoading: salesLoading,
    error: salesError 
  } = useQuery({
    queryKey: ['sales-reports-counter', today],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('shift_reports')
          .select('id, created_at')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
          .limit(1);

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching sales reports:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors
  useEffect(() => {
    if (managerError || salesError) {
      const errorMessage = managerError?.message || salesError?.message || 'Failed to fetch report data';
      setError(errorMessage);
    } else {
      setError(null);
    }
  }, [managerError, salesError]);

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

  // Calculate counters
  const rawManagerCount = (managerReports && managerReports.length > 0) ? 1 : 0;
  const rawSalesCount = (salesReports && salesReports.length > 0) ? 1 : 0;
  
  // Apply viewed state logic
  const managerCount = rawManagerCount && !hasViewed('manager') ? 1 : 0;
  const salesCount = rawSalesCount && !hasViewed('sales') ? 1 : 0;
  const totalCount = managerCount + salesCount;

  const isLoading = managerLoading || salesLoading;

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