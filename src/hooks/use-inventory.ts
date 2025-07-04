'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/react-query/query-client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Database } from '@/types/supabase';

type BreadType = Database['public']['Tables']['bread_types']['Row'];
type ProductionLog = Database['public']['Tables']['production_logs']['Row'];
type SalesLog = Database['public']['Tables']['sales_logs']['Row'];

export interface InventoryItem {
  bread_type_id: string;
  bread_type_name: string;
  bread_type_size: string | null;
  unit_price: number;
  total_produced: number;
  total_sold: number;
  total_leftover: number;
  current_stock: number;
  last_production: string | null;
  last_sale: string | null;
}

export interface SalesLogWithBreadType extends SalesLog {
  bread_types: {
    name: string;
    size: string | null;
  };
}

export interface ProductionLogWithBreadType extends ProductionLog {
  bread_types: {
    name: string;
    size: string | null;
  };
}

// Fetch bread types - OPTIMIZED with limit
async function fetchBreadTypes(): Promise<BreadType[]> {
  const { data, error } = await supabase
    .from('bread_types')
    .select('*')
    .order('name')
    .limit(20); // Limit to prevent excessive data

  if (error) {
    console.error('Error fetching bread types:', error);
    throw new Error('Failed to fetch bread types');
  }

  return data || [];
}

// Calculate current inventory - HEAVILY OPTIMIZED to prevent browser crashes
async function fetchCurrentInventory(): Promise<InventoryItem[]> {
  try {
    // Get bread types first with limit
    const breadTypes = await fetchBreadTypes();
    
    // CRITICAL FIX: Limit production logs to recent entries only
    const { data: productionLogs, error: prodError } = await supabase
      .from('production_logs')
      .select('bread_type_id, quantity, created_at')
      .order('created_at', { ascending: false })
      .limit(200); // Limit to last 200 entries to prevent memory overflow

    if (prodError) {
      console.error('Production logs error:', prodError);
      throw new Error('Failed to fetch production logs');
    }

    // CRITICAL FIX: Limit sales logs to recent entries only
    const { data: salesLogs, error: salesError } = await supabase
      .from('sales_logs')
      .select('bread_type_id, quantity, leftover, created_at')
      .order('created_at', { ascending: false })
      .limit(200); // Limit to last 200 entries to prevent memory overflow

    if (salesError) {
      console.error('Sales logs error:', salesError);
      throw new Error('Failed to fetch sales logs');
    }

    // OPTIMIZED: Calculate inventory for each bread type with efficient processing
    const inventory: InventoryItem[] = breadTypes.map(breadType => {
      // Filter logs for this bread type
      const production = productionLogs?.filter(log => log.bread_type_id === breadType.id) || [];
      const sales = salesLogs?.filter(log => log.bread_type_id === breadType.id) || [];

      // Calculate totals efficiently
      const totalProduced = production.reduce((sum, log) => sum + (log.quantity || 0), 0);
      const totalSold = sales.reduce((sum, log) => sum + (log.quantity || 0), 0);
      const totalLeftover = sales.reduce((sum, log) => sum + (log.leftover || 0), 0);
      
      // Current stock calculation
      const currentStock = Math.max(0, totalProduced - totalSold + totalLeftover);

      // Get last timestamps efficiently
      const lastProduction = production.length > 0 ? production[0].created_at : null;
      const lastSale = sales.length > 0 ? sales[0].created_at : null;

      return {
        bread_type_id: breadType.id,
        bread_type_name: breadType.name,
        bread_type_size: breadType.size,
        unit_price: breadType.unit_price,
        total_produced: totalProduced,
        total_sold: totalSold,
        total_leftover: totalLeftover,
        current_stock: currentStock,
        last_production: lastProduction,
        last_sale: lastSale,
      };
    });
    
    return inventory;
  } catch (error) {
    console.error('Error in fetchCurrentInventory:', error);
    // Return empty array instead of throwing to prevent crashes
    return [];
  }
}

// Fetch today's sales - OPTIMIZED with limits
async function fetchTodaysSales(): Promise<SalesLogWithBreadType[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types!sales_logs_bread_type_id_fkey (name, size)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to prevent excessive data

    if (error) {
      console.error('Error fetching sales:', error);
      throw new Error('Failed to fetch sales');
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchTodaysSales:', error);
    return [];
  }
}

// Fetch today's production - OPTIMIZED with limits
async function fetchTodaysProduction(): Promise<ProductionLogWithBreadType[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('production_logs')
      .select(`
        *,
        bread_types!production_logs_bread_type_id_fkey (name, size)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(50); // Limit to prevent excessive data

    if (error) {
      console.error('Error fetching production:', error);
      throw new Error('Failed to fetch production');
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchTodaysProduction:', error);
    return [];
  }
}

// Hook for current inventory - HEAVILY OPTIMIZED polling
export function useInventory(pollingInterval = 120000) { // Reduced from 60s to 2 minutes
  return useQuery({
    queryKey: queryKeys.inventory.current(),
    queryFn: fetchCurrentInventory,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false, // Don't poll in background
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: true,
    staleTime: 60000, // Increased from 30s to 1 minute
    retry: 2, // Limit retries
    retryDelay: 1000, // 1 second retry delay
  });
}

// Hook for today's sales - OPTIMIZED polling
export function useTodaysSales(pollingInterval = 180000) { // Reduced from 60s to 3 minutes
  return useQuery({
    queryKey: queryKeys.sales.today(),
    queryFn: fetchTodaysSales,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 90000, // 1.5 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook for today's production - OPTIMIZED polling
export function useTodaysProduction(pollingInterval = 180000) { // Reduced from 60s to 3 minutes
  return useQuery({
    queryKey: queryKeys.production.today(),
    queryFn: fetchTodaysProduction,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 90000, // 1.5 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook for bread types - OPTIMIZED caching
export function useBreadTypes() {
  return useQuery({
    queryKey: queryKeys.breadTypes.active(),
    queryFn: fetchBreadTypes,
    staleTime: 10 * 60 * 1000, // 10 minutes - bread types change infrequently
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook for inventory mutations - OPTIMIZED
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const invalidateInventoryQueries = () => {
    // Throttled invalidation to prevent excessive requests
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
  };

  const addSale = useMutation({
    mutationFn: async (saleData: Database['public']['Tables']['sales_logs']['Insert']) => {
      const { error } = await supabase
        .from('sales_logs')
        .insert(saleData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateInventoryQueries();
      toast.success('Sale recorded successfully');
    },
    onError: (error) => {
      console.error('Error adding sale:', error);
      toast.error('Failed to record sale');
    },
  });

  const addProduction = useMutation({
    mutationFn: async (productionData: Database['public']['Tables']['production_logs']['Insert']) => {
      const { data, error } = await supabase
        .from('production_logs')
        .insert(productionData)
        .select();
      
      if (error) {
        console.error('Production insert error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      invalidateInventoryQueries();
      toast.success('Production recorded successfully');
    },
    onError: (error) => {
      console.error('Production mutation error:', error);
      toast.error('Failed to record production');
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Database['public']['Tables']['sales_logs']['Update'] 
    }) => {
      const { error } = await supabase
        .from('sales_logs')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateInventoryQueries();
      toast.success('Sale updated successfully');
    },
    onError: (error) => {
      console.error('Error updating sale:', error);
      toast.error('Failed to update sale');
    },
  });

  const updateProduction = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Database['public']['Tables']['production_logs']['Update'] 
    }) => {
      const { error } = await supabase
        .from('production_logs')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateInventoryQueries();
      toast.success('Production updated successfully');
    },
    onError: (error) => {
      console.error('Error updating production:', error);
      toast.error('Failed to update production');
    },
  });

  return {
    addSale,
    addProduction,
    updateSale,
    updateProduction,
    invalidateInventoryQueries,
  };
}

// Hook for manual refresh - OPTIMIZED
export function useManualRefresh() {
  const queryClient = useQueryClient();
  
  const refreshAll = async () => {
    try {
      // Throttled refresh to prevent overwhelming the system
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      await queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      await queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  return { refreshAll };
}

// Auto-refresh hook - HEAVILY OPTIMIZED to prevent excessive calls
export function useAutoRefresh(enabled = true) {
  const { invalidateInventoryQueries } = useInventoryMutations();

  useEffect(() => {
    if (!enabled) return;

    let refreshTimeout: NodeJS.Timeout;

    // Throttled refresh function
    const throttledRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        invalidateInventoryQueries();
      }, 2000); // 2 second delay to prevent rapid calls
    };

    // Refresh when tab becomes visible (throttled)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        throttledRefresh();
      }
    };

    // Refresh when network comes back online (throttled)
    const handleOnline = () => {
      throttledRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(refreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, invalidateInventoryQueries]);
}