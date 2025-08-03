"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useShift } from '@/contexts/ShiftContext';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ProductionItem {
  id: string;
  bread_type_id: string;
  name: string;
  size: string | null;
  unit_price: number;
  quantity: number;
  produced: number;
  sold: number;
  available: number;
  batch_number: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface SalesRepProductionData {
  productionItems: ProductionItem[];
  totalUnits: number;
  source: 'batches' | 'all_batches' | 'cleared';
  isEmpty: boolean;
  shift?: 'morning' | 'night';
  currentTime?: string;
  currentHour?: number;
  reason?: string;
  nextClearTime?: string;
}

// Fetch production items for sales rep via API
async function fetchSalesRepProduction(
  shift: 'morning' | 'night'
): Promise<SalesRepProductionData> {
  // Always use current Nigeria date for clearing logic
  const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
  const currentDate = nigeriaTime.toISOString().split('T')[0];
  
  const params = new URLSearchParams({
    shift,
    date: currentDate,
  });

  console.log('🔄 useSalesRepProduction: Starting fetch...', { shift, currentDate });

  const response = await fetch(`/api/sales-rep/production?${params.toString()}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    cache: 'no-store',
  });
  
  console.log('📡 API Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', response.status, errorText);
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ useSalesRepProduction: Data received:', {
    productionItemsLength: result.productionItems?.length || 0,
    totalUnits: result.totalUnits || 0,
    source: result.source || 'batches',
    isEmpty: result.isEmpty || false,
    shift: result.shift,
    currentTime: result.currentTime,
    currentHour: result.currentHour,
  });
  
  return {
    productionItems: result.productionItems || [],
    totalUnits: result.totalUnits || 0,
    source: result.source || 'batches',
    isEmpty: result.isEmpty || false,
    shift: result.shift,
    currentTime: result.currentTime,
    currentHour: result.currentHour,
    reason: result.reason,
    nextClearTime: result.nextClearTime,
  };
}

// Main hook for sales rep production items
export function useSalesRepProduction() {
  const { currentShift } = useShift();
  const queryClient = useQueryClient();
  
  // Real-time subscription callback
  const invalidateProductionData = useCallback(() => {
    console.log('🔄 Real-time update: Invalidating production data...');
    queryClient.invalidateQueries({ queryKey: ['sales-rep-production'] });
  }, [queryClient]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentShift) return;

    console.log('🔴 Setting up real-time subscriptions for:', currentShift);
    
    let batchesChannel: RealtimeChannel | null = null;
    let salesChannel: RealtimeChannel | null = null;

    try {
      // Subscribe to batches table changes
      batchesChannel = supabase
        .channel('batches-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'batches',
            filter: `shift=eq.${currentShift}`,
          },
          (payload) => {
            console.log('🔄 Batches real-time update:', payload);
            invalidateProductionData();
          }
        )
        .subscribe();

      // Subscribe to sales_logs changes to update available quantities
      salesChannel = supabase
        .channel('sales-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sales_logs',
            filter: `shift=eq.${currentShift}`,
          },
          (payload) => {
            console.log('🔄 Sales real-time update:', payload);
            invalidateProductionData();
          }
        )
        .subscribe();

      console.log('✅ Real-time subscriptions established');
    } catch (error) {
      console.error('❌ Error setting up real-time subscriptions:', error);
    }

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions...');
      if (batchesChannel) {
        supabase.removeChannel(batchesChannel);
      }
      if (salesChannel) {
        supabase.removeChannel(salesChannel);
      }
    };
  }, [currentShift, invalidateProductionData]);
  
  // Get Nigeria current date
  const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
  const targetDate = nigeriaTime.toISOString().split('T')[0];

  console.log('🔧 Hook Debug:', {
    currentShift,
    targetDate,
    nigeriaTime: nigeriaTime.toISOString(),
    note: 'Fetching ALL production items for shift (no user dependency)'
  });

  const {
    data: productionData = {
      productionItems: [],
      totalUnits: 0,
      source: 'batches' as const,
      isEmpty: false,
    },
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['sales-rep-production', currentShift, targetDate],
    queryFn: () => fetchSalesRepProduction(currentShift),
    enabled: !!currentShift, // Only need shift to be available
    staleTime: 30 * 1000, // 30 seconds (increased for better caching)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds (reduced frequency due to real-time updates)
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Log query state changes
  useEffect(() => {
    console.log('🔄 useSalesRepProduction query state:', {
      isLoading,
      isError: !!error,
      error: error?.message,
      dataLength: productionData.productionItems?.length || 0,
      isFetching,
      currentShift,
      isEmpty: productionData.isEmpty,
    });
  }, [isLoading, error, productionData, isFetching, currentShift]);

  // Invalidate every 10 seconds for precise shift boundary checks
  useEffect(() => {
    console.log('⏰ Setting up enhanced invalidation for precise shift checks...');
    const interval = setInterval(() => {
      const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
      const currentHour = nigeriaTime.getHours();
      const currentMinute = nigeriaTime.getMinutes();
      const currentSecond = nigeriaTime.getSeconds();
      
      // Check for exact clearing times
      const isMorningClearTime = currentHour === 0 && currentMinute === 0 && currentSecond < 30;
      const isNightClearTime = currentHour === 15 && currentMinute === 0 && currentSecond < 30;
      
      if (isMorningClearTime || isNightClearTime) {
        console.log('⏰ Exact clearing time detected - forcing invalidation...');
        queryClient.invalidateQueries({ queryKey: ['sales-rep-production'] });
      }
    }, 10 * 1000); // Check every 10 seconds for precise timing
    
    return () => {
      console.log('⏰ Cleaning up enhanced invalidation...');
      clearInterval(interval);
    };
  }, [queryClient]);

  return {
    productionItems: productionData.productionItems,
    totalUnits: productionData.totalUnits,
    source: productionData.source,
    isEmpty: productionData.isEmpty,
    shift: productionData.shift,
    currentTime: productionData.currentTime,
    currentHour: productionData.currentHour,
    reason: productionData.reason,
    nextClearTime: productionData.nextClearTime,
    isLoading,
    error,
    refetch,
    isFetching,
    // Helper functions
    invalidate: () => {
      console.log('🔄 Manual invalidation triggered...');
      return queryClient.invalidateQueries({ queryKey: ['sales-rep-production'] });
    },
    // Enhanced utilities
    isCleared: productionData.source === 'cleared',
    isRealTimeActive: true,
    // Debug info
    currentDate: targetDate
  };
}
