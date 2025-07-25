"use client";

import { useQuery } from '@tanstack/react-query';
import { useAutoShift } from '@/hooks/use-auto-shift';
import { useEffect, useState } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  size: string | null;
  price: number;
  quantity: number;
  batches?: number;
}

interface ShiftInventoryData {
  inventory: InventoryItem[];
  totalUnits: number;
  source: 'batches' | 'all_batches';
  recordCount: number;
}

// Fetch inventory data from the new API endpoint
async function fetchShiftInventory(shift: 'morning' | 'night', date?: string): Promise<ShiftInventoryData> {
  // Use the specific date where your batches exist
  const targetDate = date || '2025-07-25'; // Your batches are from July 25th
  
  const params = new URLSearchParams({
    shift,
    date: targetDate,
  });

  console.log(`🔍 Fetching inventory for ${shift} shift on ${targetDate}`);
  
  const response = await fetch(`/api/inventory/shift?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch inventory data');
  }

  const result = await response.json();
  console.log(`📊 Inventory result: ${result.data?.length || 0} items, source: ${result.source}`);
  
  return {
    inventory: result.data || [],
    totalUnits: result.totalUnits || 0,
    source: result.source || 'batches',
    recordCount: result.recordCount || 0,
  };
}

// Main hook for inventory data with automatic shift management
export function useInventoryData() {
  const { 
    currentShift, 
    shiftStartTime, 
    nextShiftTime, 
    shiftStartDateTime, 
    shiftEndDateTime 
  } = useAutoShift();

  // Use the specific date where your batches exist
  const targetDate = '2025-07-25'; // Your batches are from this date
  
  const { 
    data: inventoryData = { inventory: [], totalUnits: 0, source: 'batches', recordCount: 0 },
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['inventory', currentShift, targetDate],
    queryFn: () => fetchShiftInventory(currentShift, targetDate),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 15 * 1000, // Real-time updates every 15 seconds
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
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

  return {
    inventory: inventoryData.inventory,
    totalUnits: inventoryData.totalUnits,
    isLoading,
    error,
    currentShift,
    shiftStartTime,
    nextShiftTime,
    timeUntilNextShift,
    source: inventoryData.source,
    recordCount: inventoryData.recordCount,
    refreshData: refetch,
  };
}
