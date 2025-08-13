'use client';

import { useQuery } from '@tanstack/react-query';

interface TodayBatchesData {
  total: number;
  morningCount: number;
  nightCount: number;
  morningBatches: Array<{
    id: string;
    name: string;
    batch_number: string;
    produced: number;
    status: string;
  }>;
  nightBatches: Array<{
    id: string;
    name: string;
    batch_number: string;
    produced: number;
    status: string;
  }>;
  lastUpdated: string;
}

interface UseTodayBatchesTrackerReturn {
  todayBatchesData: TodayBatchesData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Real-time today batches tracker that monitors both shifts
 * This follows the exact same pattern as useLowStockTracker
 */
export function useTodayBatchesTracker(): UseTodayBatchesTrackerReturn {
  
  const fetchTodayBatchesData = async (): Promise<TodayBatchesData> => {
    try {
      const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
      const currentDate = nigeriaTime.toISOString().split('T')[0];
      
      // Fetch data from both performance pages in parallel
      const [morningResponse, nightResponse] = await Promise.all([
        fetch(`/api/sales-rep/production?shift=morning&date=${currentDate}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        }),
        fetch(`/api/sales-rep/production?shift=night&date=${currentDate}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        })
      ]);

      if (!morningResponse.ok || !nightResponse.ok) {
        throw new Error('Failed to fetch production data');
      }

      const [morningData, nightData] = await Promise.all([
        morningResponse.json(),
        nightResponse.json()
      ]);

      // Get all production items (no filtering needed for batch count)
      const morningBatches = (morningData.productionItems || []);
      const nightBatches = (nightData.productionItems || []);

      const result: TodayBatchesData = {
        total: morningBatches.length + nightBatches.length,
        morningCount: morningBatches.length,
        nightCount: nightBatches.length,
        morningBatches: morningBatches.map((item: any) => ({
          id: item.id,
          name: item.name,
          batch_number: item.batch_number,
          produced: item.produced,
          status: item.status
        })),
        nightBatches: nightBatches.map((item: any) => ({
          id: item.id,
          name: item.name,
          batch_number: item.batch_number,
          produced: item.produced,
          status: item.status
        })),
        lastUpdated: new Date().toISOString()
      };

      console.log('📊 Today batches tracker result:', {
        total: result.total,
        morning: result.morningCount,
        night: result.nightCount,
        morningBatches: result.morningBatches,
        nightBatches: result.nightBatches
      });

      return result;
    } catch (error) {
      console.error('❌ Error fetching today batches data:', error);
      // Return default data on error
      return {
        total: 0,
        morningCount: 0,
        nightCount: 0,
        morningBatches: [],
        nightBatches: [],
        lastUpdated: new Date().toISOString()
      };
    }
  };

  // React Query for today batches data with real-time polling
  const {
    data: todayBatchesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['today-batches-tracker'],
    queryFn: fetchTodayBatchesData,
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 1000, // Poll every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Keep polling even when tab not active
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Default data if loading or error
  const defaultTodayBatchesData: TodayBatchesData = {
    total: 0,
    morningCount: 0,
    nightCount: 0,
    morningBatches: [],
    nightBatches: [],
    lastUpdated: new Date().toISOString()
  };

  return {
    todayBatchesData: todayBatchesData || defaultTodayBatchesData,
    isLoading,
    error: error?.message || null,
    refetch: () => refetch()
  };
}