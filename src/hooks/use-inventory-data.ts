"use client";

import { useQuery } from '@tanstack/react-query';
import { useInventoryShift } from '@/hooks/use-inventory-shift';
import { useRealtimeBatches } from '@/hooks/use-realtime-batches';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import React from 'react'; // Added missing import for React

interface InventoryItem {
  id: string;
  name: string;
  size: string | null;
  price: number;
  quantity: number;
  batches?: number;
  archivedBatches?: number;
}

interface ShiftInventoryData {
  inventory: InventoryItem[];
  totalUnits: number;
  totalBatches: number;
  totalArchivedBatches: number;
  source: 'batches' | 'all_batches' | 'archived';
  recordCount: number;
  shiftContext: {
    shouldShowArchivedData: boolean;
    isManager: boolean;
  };
}

// Fetch inventory data from the enhanced API endpoint
async function fetchShiftInventory(shift: 'morning' | 'night', date?: string): Promise<ShiftInventoryData> {
  // Use current date if no date provided, or use the provided date
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const params = new URLSearchParams({
    shift,
    date: targetDate,
  });

  console.log(`🔍 Fetching enhanced inventory for ${shift} shift on ${targetDate}`);
  
  const response = await fetch(`/api/inventory/shift?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory data');
  }

  const result = await response.json();
  console.log(`📊 Enhanced inventory result: ${result.data?.length || 0} items, source: ${result.source}`);
  console.log(`📊 Shift context: ${JSON.stringify(result.shiftContext)}`);
  
  return {
    inventory: result.data || [],
    totalUnits: result.totalUnits || 0,
    totalBatches: result.totalBatches || 0,
    totalArchivedBatches: result.totalArchivedBatches || 0,
    source: result.source || 'batches',
    recordCount: result.recordCount || 0,
    shiftContext: result.shiftContext || {
      shouldShowArchivedData: false,
      isManager: false,
    },
  };
}

// Main hook for inventory data with production-ready automatic shift management
export function useInventoryData(user?: any) {
  // Use dedicated inventory shift logic (10AM/10PM automatic switching)
  const {
    currentShift,
    shiftStartDateTime,
    shiftEndDateTime,
    dataFetchRange,
    timeUntilNextShift,
    isLoading: shiftLoading
  } = useInventoryShift();
  
  console.log(`🔄 Inventory automatic shift: ${currentShift}`);
  console.log(`📅 Data range: ${dataFetchRange.description}`);

  // Use fallback user ID if no user is provided (for immediate data loading)
  const effectiveUser = user || { id: 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9' };

  const fetchInventoryData = async () => {
    try {
      console.log(`🔍 Fetching inventory for ${currentShift} shift`);
      console.log(`📅 Using data range: ${dataFetchRange.description}`);
      console.log(`🔍 User authenticated: ${!!effectiveUser}`);

      const params = new URLSearchParams({
        shift: currentShift,
        // Pass additional context for production debugging
        debug: 'true'
      });

      const response = await fetch(`/api/inventory/shift?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📊 API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Inventory API Response:`, {
        items: data.data?.length || 0,
        totalUnits: data.totalUnits || 0,
        source: data.source,
        shift: data.shift,
        debug: data.debug
      });

      return data;
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      throw error;
    }
  };

  // Production-ready React Query configuration with improved performance
  const {
    data: inventoryData = { 
      data: [], 
      totalUnits: 0, 
      totalBatches: 0,
      totalArchivedBatches: 0,
      source: 'batches' as const, 
      recordCount: 0,
      shiftContext: {
        shouldShowArchivedData: false,
        isManager: false,
      }
    },
    isLoading, 
    error, 
    refetch,
    isError,
    isFetching
  } = useQuery({
    queryKey: ['inventory', currentShift, dataFetchRange.startTime, dataFetchRange.endTime],
    queryFn: fetchInventoryData,
    enabled: !!currentShift && !shiftLoading,
    staleTime: 5 * 1000, // 5 seconds - data is fresh for 5 seconds (faster updates)
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for near real-time updates
    refetchIntervalInBackground: false, // Conserve resources when tab not active
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnReconnect: true, // Refetch when network reconnects
    networkMode: 'offlineFirst', // Better offline experience
  });

  // Add real-time subscriptions for instant updates (after refetch is defined)
  const { connectionState } = useRealtimeBatches({
    enabled: true,
    shift: currentShift,
    onBatchChange: (event, payload) => {
      console.log(`📡 Inventory received real-time batch ${event} for ${currentShift} shift`);
      // Force immediate refetch when batch changes occur
      refetch();
    }
  });

  // Time until next shift is provided by useInventoryShift hook

  const shiftStatus = inventoryData.shiftContext || {
    shouldShowArchivedData: false,
    isManager: false,
  };

  const dataSourceInfo = {
    source: inventoryData.source || 'batches',
    totalBatches: inventoryData.totalBatches || 0,
    totalArchivedBatches: inventoryData.totalArchivedBatches || 0,
    recordCount: inventoryData.recordCount || 0,
    timeUntilNextShift: timeUntilNextShift,
    nextShiftTime: currentShift === 'morning' ? '10:00 PM' : '10:00 AM',
    refreshData: refetch,
    // Production debugging info
    currentShift: currentShift,
    dataWindow: dataFetchRange.description,
  };

  return {
    inventory: inventoryData.data || [],
    totalUnits: inventoryData.totalUnits || 0,
    isLoading: isLoading || shiftLoading,
    error,
    refetch,
    shiftStatus,
    dataSourceInfo,
    isFetching, // Expose fetching state for UI feedback
    isError, // Expose error state for better error handling
    realtimeConnectionState: connectionState, // Expose real-time connection status
  };
}
