'use client';

import { useQuery } from '@tanstack/react-query';
import { Logger } from '@/lib/utils/logger';

interface LowStockData {
  total: number;
  morningCount: number;
  nightCount: number;
  morningItems: Array<{
    id: string;
    name: string;
    available: number;
    produced: number;
  }>;
  nightItems: Array<{
    id: string;
    name: string;
    available: number;
    produced: number;
  }>;
  lastUpdated: string;
}

interface UseLowStockTrackerReturn {
  lowStockData: LowStockData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Real-time low stock tracker that monitors both performance pages
 * This replaces the complex database-based tracking with direct monitoring
 */
export function useLowStockTracker(): UseLowStockTrackerReturn {
  
  const fetchLowStockData = async (): Promise<LowStockData> => {
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

      // Filter items with low stock (available <= 5 and available > 0)
      const morningLowStock = (morningData.productionItems || []).filter((item: any) => 
        item.available <= 5 && item.available > 0
      );
      
      const nightLowStock = (nightData.productionItems || []).filter((item: any) => 
        item.available <= 5 && item.available > 0
      );

      const result: LowStockData = {
        total: morningLowStock.length + nightLowStock.length,
        morningCount: morningLowStock.length,
        nightCount: nightLowStock.length,
        morningItems: morningLowStock.map((item: any) => ({
          id: item.id,
          name: item.name,
          available: item.available,
          produced: item.produced
        })),
        nightItems: nightLowStock.map((item: any) => ({
          id: item.id,
          name: item.name,
          available: item.available,
          produced: item.produced
        })),
        lastUpdated: new Date().toISOString()
      };

      Logger.tracker('Low stock tracker result:', {
        total: result.total,
        morning: result.morningCount,
        night: result.nightCount,
        morningItems: result.morningItems,
        nightItems: result.nightItems
      });

      return result;
    } catch (error) {
      Logger.error('Error fetching low stock data:', error);
      // Return default data on error
      return {
        total: 0,
        morningCount: 0,
        nightCount: 0,
        morningItems: [],
        nightItems: [],
        lastUpdated: new Date().toISOString()
      };
    }
  };

  // React Query for low stock data with real-time polling
  const {
    data: lowStockData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['low-stock-tracker'],
    queryFn: fetchLowStockData,
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 1000, // Poll every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Keep polling even when tab not active
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Default data if loading or error
  const defaultLowStockData: LowStockData = {
    total: 0,
    morningCount: 0,
    nightCount: 0,
    morningItems: [],
    nightItems: [],
    lastUpdated: new Date().toISOString()
  };

  return {
    lowStockData: lowStockData || defaultLowStockData,
    isLoading,
    error: error?.message || null,
    refetch: () => refetch()
  };
}