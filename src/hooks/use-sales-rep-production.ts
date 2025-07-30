"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useShift } from '@/contexts/ShiftContext';

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
  source: 'batches' | 'all_batches';
  isEmpty: boolean;
  shift?: 'morning' | 'night';
  currentTime?: string;
  currentHour?: number;
}

// Fetch production items for sales rep via API
async function fetchSalesRepProduction(
  shift: 'morning' | 'night',
  date: string
): Promise<SalesRepProductionData> {
  const params = new URLSearchParams({
    shift,
    date,
  });

  console.log('🔄 useSalesRepProduction: Starting fetch...', { shift, date });

  const response = await fetch(`/api/sales-rep/production?${params.toString()}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
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
  };
}

// Main hook for sales rep production items
export function useSalesRepProduction() {
  const { currentShift } = useShift();
  const queryClient = useQueryClient();
  
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
    queryFn: () => fetchSalesRepProduction(currentShift, targetDate),
    enabled: !!currentShift, // Only need shift to be available
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
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

  // Invalidate every minute for shift boundary checks
  useEffect(() => {
    console.log('⏰ Setting up minute-based invalidation for shift checks...');
    const interval = setInterval(() => {
      console.log('⏰ Minute passed - invalidating for shift boundary check...');
      queryClient.invalidateQueries({ queryKey: ['sales-rep-production'] });
    }, 60 * 1000); // Check every minute for shift changes
    
    return () => {
      console.log('⏰ Cleaning up minute-based invalidation...');
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
    isLoading,
    error,
    refetch,
    isFetching,
    // Helper functions
    invalidate: () => {
      console.log('🔄 Manual invalidation triggered...');
      return queryClient.invalidateQueries({ queryKey: ['sales-rep-production'] });
    },
    // Debug info
    currentDate: targetDate
  };
}
