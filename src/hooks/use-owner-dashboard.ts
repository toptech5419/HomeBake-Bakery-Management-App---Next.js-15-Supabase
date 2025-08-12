'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getOwnerDashboardStats, getTodayRevenue, getTodayBatchCount, getStaffOnlineCount } from '@/lib/dashboard/server-actions';
import { useLowStockTracker } from './use-low-stock-tracker';

interface OwnerDashboardStats {
  todayRevenue: number;
  todayBatches: number;
  staffOnline: number;
  staffTotal: number;
  lowStockCount: number;
  lowStockMorning: number;
  lowStockNight: number;
  lowStockRealTime: boolean;
  lastUpdate: string;
}

interface UseOwnerDashboardReturn {
  stats: OwnerDashboardStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOwnerDashboard(): UseOwnerDashboardReturn {
  const [stats, setStats] = useState<OwnerDashboardStats>({
    todayRevenue: 0,
    todayBatches: 0,
    staffOnline: 0,
    staffTotal: 0,
    lowStockCount: 0,
    lowStockMorning: 0,
    lowStockNight: 0,
    lowStockRealTime: false,
    lastUpdate: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time low stock tracking hook
  const { 
    lowStockData, 
    isLoading: lowStockLoading, 
    error: lowStockError,
    refetch: refreshLowStock 
  } = useLowStockTracker();

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      
      // Get basic stats (without low stock count since we have real-time tracking)
      const [todayRevenue, todayBatches, staffCounts] = await Promise.all([
        getTodayRevenue(),
        getTodayBatchCount(),
        getStaffOnlineCount()
      ]);

      setStats(prevStats => ({
        ...prevStats,
        todayRevenue,
        todayBatches,
        staffOnline: staffCounts.online,
        staffTotal: staffCounts.total,
        lastUpdate: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error fetching owner dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchStats();
    // Also refresh low stock data
    refreshLowStock();
  }, [fetchStats, refreshLowStock]);

  // Update stats when real-time low stock data changes
  useEffect(() => {
    if (!lowStockLoading && lowStockData) {
      setStats(prevStats => ({
        ...prevStats,
        lowStockCount: lowStockData.total,
        lowStockMorning: lowStockData.morningCount,
        lowStockNight: lowStockData.nightCount,
        lowStockRealTime: lowStockData.total > 0,
      }));
    }

    // Combine errors
    if (lowStockError && !error) {
      setError(`Low stock tracking: ${lowStockError}`);
    }
  }, [lowStockData, lowStockLoading, lowStockError, error]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh at midnight Lagos time (no need to reset counters anymore)
  useEffect(() => {
    const checkMidnight = async () => {
      const now = new Date();
      const lagosTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
      
      // Check if we've crossed midnight
      if (lagosTime.getHours() === 0 && lagosTime.getMinutes() === 0) {
        // Refetch all dashboard data for new day
        refetch();
        console.log('Dashboard refreshed at midnight for new day');
      }
    };

    const interval = setInterval(checkMidnight, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [refetch]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    // Sales logs subscription for revenue updates
    const salesSubscription = supabase
      .channel('owner_dashboard_sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_logs'
        },
        () => {
          // Refetch revenue when new sale is recorded
          getTodayRevenue().then(revenue => {
            setStats(prev => ({
              ...prev,
              todayRevenue: revenue,
              lastUpdate: new Date().toISOString()
            }));
          });
        }
      )
      .subscribe();

    // Batches subscription for batch count updates
    const batchesSubscription = supabase
      .channel('owner_dashboard_batches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'batches'
        },
        () => {
          // Refetch batch count when new batch is created
          getTodayBatchCount().then(count => {
            setStats(prev => ({
              ...prev,
              todayBatches: count,
              lastUpdate: new Date().toISOString()
            }));
          });
        }
      )
      .subscribe();

    // Note: Low stock tracking is now handled by useLowStockTracker hook
    // No need for manual available_stock subscription

    // Sessions subscription for staff online count
    const sessionsSubscription = supabase
      .channel('owner_dashboard_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          // Refetch staff counts when sessions change
          getStaffOnlineCount().then(counts => {
            setStats(prev => ({
              ...prev,
              staffOnline: counts.online,
              staffTotal: counts.total,
              lastUpdate: new Date().toISOString()
            }));
          });
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
      batchesSubscription.unsubscribe();
      sessionsSubscription.unsubscribe();
    };
  }, []);

  // Periodic refresh every 5 minutes for accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch
  };
}