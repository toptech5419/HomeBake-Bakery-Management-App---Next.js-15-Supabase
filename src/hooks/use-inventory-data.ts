"use client";

import { useQuery } from '@tanstack/react-query';
import { useAutoShift } from '@/hooks/use-auto-shift';
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

// Main hook for inventory data with enhanced shift management
export function useInventoryData(user?: any) {
  const { currentShift, shiftStartDateTime, shiftEndDateTime, isLoading: shiftLoading } = useAutoShift();

  const targetDate = new Date().toISOString().split('T')[0];

  // Use fallback user ID if no user is provided (for immediate data loading)
  const effectiveUser = user || { id: 'f45d8ffb-50a1-4e73-8d5c-d2a2f9a160c9' };

  const fetchShiftInventory = async (shift: string, date: string) => {
    try {
      console.log(`🔍 Fetching inventory for shift: ${shift}, date: ${date}`);
      console.log(`🔍 User authenticated: ${!!effectiveUser}`);
      console.log(`🔍 User ID: ${effectiveUser?.id}`);
      console.log(`🔍 Making API call to: /api/inventory/shift?shift=${shift}&date=${date}`);

      const response = await fetch(`/api/inventory/shift?shift=${shift}&date=${date}`, {
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
      console.log(`📊 API Response data:`, data);
      console.log(`📊 API Response data length: ${data.data?.length || 0}`);

      return data;
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      throw error;
    }
  };

  // Production-ready React Query configuration
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
    queryKey: ['inventory', currentShift, targetDate, effectiveUser?.id],
    queryFn: () => {
      console.log(`🔍 React Query: Executing query function`);
      console.log(`🔍 React Query: Query key: ['inventory', ${currentShift}, ${targetDate}, ${effectiveUser?.id}]`);
      return fetchShiftInventory(currentShift, targetDate);
    },
    enabled: !!currentShift && !shiftLoading,
    staleTime: 15 * 1000, // 15 seconds - data is fresh for 15 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching in background
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  // Calculate time until next shift
  const [timeUntilNextShift, setTimeUntilNextShift] = useState<string>('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = shiftEndDateTime.getTime() - now.getTime();
      
      if (timeLeft > 0) {
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilNextShift(`${hours}h ${minutes}m`);
      } else {
        setTimeUntilNextShift('Refreshing...');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [shiftEndDateTime]);

  const shiftStatus = inventoryData.shiftContext || {
    shouldShowArchivedData: false,
    isManager: false,
  };

  const dataSourceInfo = {
    source: inventoryData.source || 'batches',
    totalBatches: inventoryData.totalBatches || 0,
    totalArchivedBatches: inventoryData.totalArchivedBatches || 0,
    recordCount: inventoryData.recordCount || 0,
    timeUntilNextShift,
    nextShiftTime: currentShift === 'morning' ? '10:00 PM' : '10:00 AM',
    refreshData: refetch,
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
  };
}
