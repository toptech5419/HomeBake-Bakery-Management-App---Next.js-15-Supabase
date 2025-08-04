'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getTodayRevenue, getTodayBatchCount, getStaffOnlineCount, getLowStockCount, getLagosDateString } from '@/lib/dashboard/owner-stats';

interface OwnerDashboardStats {
  todayRevenue: number;
  todayBatches: number;
  staffOnline: number;
  staffTotal: number;
  lowStockCount: number;
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
    lastUpdate: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      
      const [
        todayRevenue,
        todayBatches,
        staffCounts,
        lowStockCount
      ] = await Promise.all([
        getTodayRevenue(),
        getTodayBatchCount(),
        getStaffOnlineCount(),
        getLowStockCount()
      ]);

      setStats({
        todayRevenue,
        todayBatches,
        staffOnline: staffCounts.online,
        staffTotal: staffCounts.total,
        lowStockCount,
        lastUpdate: new Date().toISOString()
      });
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
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh at midnight Lagos time
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const lagosTime = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
      
      // Check if we've crossed midnight
      if (lagosTime.getHours() === 0 && lagosTime.getMinutes() === 0) {
        refetch();
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

    // Available stock subscription for low stock updates
    const stockSubscription = supabase
      .channel('owner_dashboard_stock')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'available_stock'
        },
        () => {
          // Refetch low stock count when inventory changes
          getLowStockCount().then(count => {
            setStats(prev => ({
              ...prev,
              lowStockCount: count,
              lastUpdate: new Date().toISOString()
            }));
          });
        }
      )
      .subscribe();

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
      stockSubscription.unsubscribe();
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