'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getTodayRevenue, getTodayBatchCount } from '@/lib/dashboard/server-actions';
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

// Owner dashboard query keys
const ownerDashboardKeys = {
  all: () => ['ownerDashboard'] as const,
  stats: () => [...ownerDashboardKeys.all(), 'stats'] as const,
  staffOnline: () => [...ownerDashboardKeys.all(), 'staffOnline'] as const,
};

// API fetcher for staff online count
const fetchStaffOnlineCount = async (): Promise<{ online: number; total: number }> => {
  const response = await fetch('/api/dashboard/staff-online', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch staff online count: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Staff online count API returned unsuccessful response');
  }

  return {
    online: data.online,
    total: data.total
  };
};

export function useOwnerDashboard(): UseOwnerDashboardReturn {
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

  // React Query for staff online count with 15-second polling (same as active batches)
  const { data: staffData, error: staffError, refetch: refetchStaff } = useQuery({
    queryKey: ownerDashboardKeys.staffOnline(),
    queryFn: fetchStaffOnlineCount,
    refetchInterval: 15000, // 15 seconds - same as active batches for staff responsiveness
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000, // 10 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // React Query for revenue with 30-second polling (less critical)
  const { data: revenueData, error: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: [...ownerDashboardKeys.all(), 'revenue'],
    queryFn: getTodayRevenue,
    refetchInterval: 30000, // 30 seconds for revenue
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 20000, // 20 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Combine all data into stats format
  const stats: OwnerDashboardStats = {
    todayRevenue: typeof revenueData === 'number' ? revenueData : 0,
    todayBatches: todayBatchesData?.total || 0,
    todayBatchesMorning: todayBatchesData?.morningCount || 0,
    todayBatchesNight: todayBatchesData?.nightCount || 0,
    staffOnline: staffData?.online || 0,
    staffTotal: staffData?.total || 0,
    lowStockCount: lowStockData?.total || 0,
    lowStockMorning: lowStockData?.morningCount || 0,
    lowStockNight: lowStockData?.nightCount || 0,
    lowStockRealTime: (lowStockData?.total || 0) > 0,
    lastUpdate: new Date().toISOString()
  };

  const isLoading = lowStockLoading || todayBatchesLoading;
  const error = staffError || revenueError || lowStockError || todayBatchesError;

  const refetch = () => {
    refetchStaff();
    refetchRevenue();
    refreshLowStock();
    refreshTodayBatches();
  };

  console.log('📊 Owner Dashboard Stats:', {
    staffOnline: `${stats.staffOnline}/${stats.staffTotal}`,
    revenue: stats.todayRevenue,
    batches: `${stats.todayBatches} (M:${stats.todayBatchesMorning}, N:${stats.todayBatchesNight})`,
    lowStock: `${stats.lowStockCount} (M:${stats.lowStockMorning}, N:${stats.lowStockNight})`
  });

  // React Query handles all the polling, focus refetch, reconnect logic automatically
  // No need for manual useEffect polling or event listeners

  return {
    stats,
    isLoading,
    error,
    refetch
  };
}