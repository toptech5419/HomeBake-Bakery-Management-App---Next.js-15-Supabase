'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getOwnerDashboardStats, getTodayRevenue, getTodayBatchCount, getStaffOnlineCount } from '@/lib/dashboard/server-actions';
import { useLowStockTracker } from './use-low-stock-tracker';
import { useTodayBatchesTracker } from './use-today-batches-tracker';

interface OwnerDashboardStats {
  todayRevenue: number;
  todayBatches: number;
  todayBatchesMorning: number;
  todayBatchesNight: number;
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
    todayBatchesMorning: 0,
    todayBatchesNight: 0,
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

  // Real-time today batches tracking hook
  const { 
    todayBatchesData, 
    isLoading: todayBatchesLoading, 
    error: todayBatchesError,
    refetch: refreshTodayBatches 
  } = useTodayBatchesTracker();

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      
      // Get basic stats (without low stock count and batch count since we have real-time tracking)
      const [todayRevenue, staffCounts] = await Promise.all([
        getTodayRevenue().catch(() => 0),
        getStaffOnlineCount().catch(() => ({ online: 0, total: 0 }))
      ]);

      // Defensive check to ensure staffCounts is defined and has the expected structure
      const safeStaffCounts = staffCounts && typeof staffCounts === 'object' && 'online' in staffCounts 
        ? staffCounts 
        : { online: 0, total: 0 };

      setStats(prevStats => ({
        ...prevStats,
        todayRevenue: typeof todayRevenue === 'number' ? todayRevenue : 0,
        staffOnline: safeStaffCounts.online || 0,
        staffTotal: safeStaffCounts.total || 0,
        lastUpdate: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error fetching owner dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      
      // Set safe fallback values
      setStats(prevStats => ({
        ...prevStats,
        todayRevenue: 0,
        staffOnline: 0,
        staffTotal: 0,
        lastUpdate: new Date().toISOString()
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchStats();
    // Also refresh real-time trackers
    refreshLowStock();
    refreshTodayBatches();
  }, [fetchStats, refreshLowStock, refreshTodayBatches]);

  // Update stats when real-time data changes
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

  // Update stats when real-time today batches data changes
  useEffect(() => {
    if (!todayBatchesLoading && todayBatchesData) {
      setStats(prevStats => ({
        ...prevStats,
        todayBatches: todayBatchesData.total,
        todayBatchesMorning: todayBatchesData.morningCount,
        todayBatchesNight: todayBatchesData.nightCount,
      }));
    }

    // Combine errors
    if (todayBatchesError && !error) {
      setError(`Today batches tracking: ${todayBatchesError}`);
    }
  }, [todayBatchesData, todayBatchesLoading, todayBatchesError, error]);

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
              todayRevenue: typeof revenue === 'number' ? revenue : 0,
              lastUpdate: new Date().toISOString()
            }));
          }).catch(err => {
            console.warn('Failed to fetch revenue on sales update:', err);
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
              todayBatches: typeof count === 'number' ? count : 0,
              lastUpdate: new Date().toISOString()
            }));
          }).catch(err => {
            console.warn('Failed to fetch batch count on batch update:', err);
          });
        }
      )
      .subscribe();

    // Note: Low stock tracking is now handled by useLowStockTracker hook
    // No need for manual available_stock subscription

    // Enhanced Activities subscription for immediate staff online updates
    const activitiesSubscription = supabase
      .channel('owner_dashboard_activities_enhanced')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: 'activity_type=eq.login'
        },
        (payload) => {
          console.log('🔄 Real-time login detected:', payload);
          // Immediate staff count update with small delay to ensure data consistency
          setTimeout(() => {
            getStaffOnlineCount().then(counts => {
              const safeCounts = counts && typeof counts === 'object' && 'online' in counts 
                ? counts 
                : { online: 0, total: 0 };
              
              console.log('📊 Real-time staff update:', safeCounts);
              setStats(prev => ({
                ...prev,
                staffOnline: safeCounts.online || 0,
                staffTotal: safeCounts.total || 0,
                lastUpdate: new Date().toISOString()
              }));
            }).catch(err => {
              console.warn('Failed to fetch staff counts on login activity:', err);
            });
          }, 500); // 500ms delay for data consistency
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
      batchesSubscription.unsubscribe();
      activitiesSubscription.unsubscribe();
    };
  }, []);

  // More frequent refresh every 30 seconds for staff online accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30 * 1000); // 30 seconds instead of 5 minutes

    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch
  };
}