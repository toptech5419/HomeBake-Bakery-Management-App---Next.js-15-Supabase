"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useShift } from '@/contexts/ShiftContext';
import { useEffect, useState } from 'react';

interface BreadType {
  id: string;
  name: string;
  size: string | null;
  unit_price: number;
  created_at: string;
}

interface InventoryItem {
  id: string;
  name: string;
  size: string | null;
  price: number;
  quantity: number;
}

interface ShiftInfo {
  currentShift: 'morning' | 'night';
  shiftStartTime: string;
  isValidTime: boolean;
}

// Helper function to determine current shift based on Nigeria time (UTC+1)
function getNigeriaShiftInfo(): ShiftInfo {
  const now = new Date();
  // Convert to Nigeria time (UTC+1)
  const nigeriaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
  const hours = nigeriaTime.getHours();
  
  // Morning shift: 10 AM – 9:59 PM (10:00 - 21:59)
  // Night shift: 10 PM – 9:59 AM (22:00 - 09:59)
  const isMorningShift = hours >= 10 && hours < 22;
  const currentShift = isMorningShift ? 'morning' : 'night';
  
  // Calculate shift start time
  const shiftStartHour = isMorningShift ? 10 : 22;
  const shiftStart = new Date(nigeriaTime);
  shiftStart.setHours(shiftStartHour, 0, 0, 0);
  
  return {
    currentShift,
    shiftStartTime: shiftStart.toLocaleTimeString('en-NG', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }),
    isValidTime: true
  };
}

// Fetch bread types from Supabase
async function fetchBreadTypes(): Promise<BreadType[]> {
  const { data, error } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching bread types:', error);
    throw new Error('Failed to fetch bread types');
  }

  return data || [];
}

// Check all valid tables for production data
async function findProductionData() {
  console.log('🔍 Searching for production data in valid tables...');
  
  // Check batches table
  const { data: batchesData, error: batchesError } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (batchesError) console.error('❌ batches error:', batchesError);
  console.log('📊 batches count:', batchesData?.length || 0);

  // Check all_batches table
  const { data: allBatchesData, error: allBatchesError } = await supabase
    .from('all_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (allBatchesError) console.error('❌ all_batches error:', allBatchesError);
  console.log('📊 all_batches count:', allBatchesData?.length || 0);

  // Check production_logs table
  const { data: productionLogsData, error: productionLogsError } = await supabase
    .from('production_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (productionLogsError) console.error('❌ production_logs error:', productionLogsError);
  console.log('📊 production_logs count:', productionLogsData?.length || 0);

  // Check remaining_bread table
  const { data: remainingBreadData, error: remainingBreadError } = await supabase
    .from('remaining_bread')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (remainingBreadError) console.error('❌ remaining_bread error:', remainingBreadError);
  console.log('📊 remaining_bread count:', remainingBreadData?.length || 0);

  // Return the first available data source
  const sources = [
    { name: 'batches', data: batchesData },
    { name: 'all_batches', data: allBatchesData },
    { name: 'production_logs', data: productionLogsData },
    { name: 'remaining_bread', data: remainingBreadData }
  ];

  for (const source of sources) {
    if (source.data && source.data.length > 0) {
      console.log('✅ Found data in:', source.name, source.data.length, 'records');
      console.log('📋 Sample:', source.data[0]);
      return { source: source.name, data: source.data };
    }
  }

  console.log('⚠️ No production data found in any table');
  return { source: 'none', data: [] };
}

// Calculate inventory based on available data
async function calculateInventory(
  breadTypes: BreadType[], 
  shift: 'morning' | 'night', 
  date: string
): Promise<InventoryItem[]> {
  console.log('🧮 === CALCULATING INVENTORY ===');
  console.log('📅 Date:', date, 'Shift:', shift);
  console.log('🍞 Bread types:', breadTypes.length);

  // Find available production data
  const { source, data: productionData } = await findProductionData();

  if (productionData.length === 0) {
    console.log('⚠️ No production data found in any table');
    return breadTypes.map(bt => ({
      id: bt.id,
      name: bt.name,
      size: bt.size,
      price: bt.unit_price,
      quantity: 0
    }));
  }

  console.log(`📊 Using data from: ${source} (${productionData.length} records)`);

  // Calculate quantities based on the data source
  const inventory: InventoryItem[] = [];

  if (source === 'batches' || source === 'all_batches') {
    for (const breadType of breadTypes) {
      const breadTypeBatches = productionData.filter(
        (batch: any) => batch.bread_type_id === breadType.id
      );
      
      const totalQuantity = breadTypeBatches.reduce(
        (sum: number, batch: any) => sum + (batch.actual_quantity || 0), 
        0
      );
      
      console.log(`🍞 ${breadType.name}: ${totalQuantity} units from ${breadTypeBatches.length} batches`);
      inventory.push({
        id: breadType.id,
        name: breadType.name,
        size: breadType.size,
        price: breadType.unit_price,
        quantity: totalQuantity
      });
    }
  } else if (source === 'production_logs') {
    for (const breadType of breadTypes) {
      const breadTypeLogs = productionData.filter(
        (log: any) => log.bread_type_id === breadType.id && log.shift === shift
      );
      
      const totalQuantity = breadTypeLogs.reduce(
        (sum: number, log: any) => sum + (log.quantity || 0), 
        0
      );
      
      console.log(`🍞 ${breadType.name}: ${totalQuantity} units from ${breadTypeLogs.length} logs`);
      inventory.push({
        id: breadType.id,
        name: breadType.name,
        size: breadType.size,
        price: breadType.unit_price,
        quantity: totalQuantity
      });
    }
  } else if (source === 'remaining_bread') {
    for (const breadType of breadTypes) {
      const breadTypeRemaining = productionData.filter(
        (item: any) => item.bread_type_id === breadType.id
      );
      
      const totalQuantity = breadTypeRemaining.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0), 
        0
      );
      
      console.log(`🍞 ${breadType.name}: ${totalQuantity} units from remaining_bread`);
      inventory.push({
        id: breadType.id,
        name: breadType.name,
        size: breadType.size,
        price: breadType.unit_price,
        quantity: totalQuantity
      });
    }
  } else {
    for (const breadType of breadTypes) {
      inventory.push({
        id: breadType.id,
        name: breadType.name,
        size: breadType.size,
        price: breadType.unit_price,
        quantity: 0
      });
    }
  }

  console.log('📈 Final inventory:', inventory.map(i => `${i.name}: ${i.quantity}`));
  return inventory;
}

// Main hook for inventory data
export function useInventoryData() {
  const { currentShift } = useShift();
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(getNigeriaShiftInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setShiftInfo(getNigeriaShiftInfo());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getNigeriaDate = () => {
    const now = new Date();
    const nigeriaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    return nigeriaTime.toISOString().split('T')[0];
  };

  const today = getNigeriaDate();

  // Fetch bread types
  const { data: breadTypes = [], isLoading: isLoadingBreadTypes, error: breadTypesError } = useQuery({
    queryKey: ['bread-types'],
    queryFn: fetchBreadTypes,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch inventory data
  const { data: inventory = [], isLoading: isLoadingInventory, error: inventoryError } = useQuery({
    queryKey: ['inventory', today, currentShift],
    queryFn: () => calculateInventory(breadTypes, currentShift, today),
    enabled: !!breadTypes.length,
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
  });

  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return {
    inventory,
    totalUnits,
    isLoading: isLoadingBreadTypes || isLoadingInventory,
    error: breadTypesError || inventoryError,
    currentShift: currentShift,
    shiftStartTime: shiftInfo.shiftStartTime,
    today
  };
}
