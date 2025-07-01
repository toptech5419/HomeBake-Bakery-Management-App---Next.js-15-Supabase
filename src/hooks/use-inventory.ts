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

// Fetch bread types
async function fetchBreadTypes(): Promise<BreadType[]> {
  const { data, error } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching bread types:', error);
    throw new Error('Failed to fetch bread types');
  }

  return data || [];
}

// Calculate current inventory from production and sales logs
async function fetchCurrentInventory(): Promise<InventoryItem[]> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all bread types
  const breadTypes = await fetchBreadTypes();
  
  // Get today's production logs
  const { data: productionLogs, error: prodError } = await supabase
    .from('production_logs')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  if (prodError) {
    console.error('Error fetching production logs:', prodError);
    throw new Error('Failed to fetch production logs');
  }

  // Get today's sales logs
  const { data: salesLogs, error: salesError } = await supabase
    .from('sales_logs')
    .select('*')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  if (salesError) {
    console.error('Error fetching sales logs:', salesError);
    throw new Error('Failed to fetch sales logs');
  }

  // Calculate inventory for each bread type
  const inventory: InventoryItem[] = breadTypes.map(breadType => {
    const production = productionLogs?.filter(log => log.bread_type_id === breadType.id) || [];
    const sales = salesLogs?.filter(log => log.bread_type_id === breadType.id) || [];

    const totalProduced = production.reduce((sum, log) => sum + log.quantity, 0);
    const totalSold = sales.reduce((sum, log) => sum + log.quantity, 0);
    const totalLeftover = sales.reduce((sum, log) => sum + (log.leftover || 0), 0);
    
    // Current stock = produced - sold + leftover
    const currentStock = totalProduced - totalSold + totalLeftover;

    // Get last production and sale times
    const lastProduction = production.length > 0 
      ? production.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null;
    
    const lastSale = sales.length > 0
      ? sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : null;

    return {
      bread_type_id: breadType.id,
      bread_type_name: breadType.name,
      bread_type_size: breadType.size,
      unit_price: breadType.unit_price,
      total_produced: totalProduced,
      total_sold: totalSold,
      total_leftover: totalLeftover,
      current_stock: Math.max(0, currentStock), // Ensure non-negative
      last_production: lastProduction,
      last_sale: lastSale,
    };
  });

  return inventory;
}

// Fetch today's sales logs with bread type info
async function fetchTodaysSales(): Promise<SalesLogWithBreadType[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types!sales_logs_bread_type_id_fkey (name, size)
    `)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
    throw new Error('Failed to fetch sales');
  }

  return data || [];
}

// Fetch today's production logs with bread type info
async function fetchTodaysProduction(): Promise<ProductionLogWithBreadType[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('production_logs')
    .select(`
      *,
      bread_types!production_logs_bread_type_id_fkey (name, size)
    `)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching production:', error);
    throw new Error('Failed to fetch production');
  }

  return data || [];
}

// Hook for current inventory with polling
export function useInventory(pollingInterval = 30000) {
  return useQuery({
    queryKey: queryKeys.inventory.current(),
    queryFn: fetchCurrentInventory,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000, // 10 seconds
  });
}

// Hook for today's sales
export function useTodaysSales(pollingInterval = 30000) {
  return useQuery({
    queryKey: queryKeys.sales.today(),
    queryFn: fetchTodaysSales,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000,
  });
}

// Hook for today's production
export function useTodaysProduction(pollingInterval = 30000) {
  return useQuery({
    queryKey: queryKeys.production.today(),
    queryFn: fetchTodaysProduction,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000,
  });
}

// Hook for bread types
export function useBreadTypes() {
  return useQuery({
    queryKey: queryKeys.breadTypes.active(),
    queryFn: fetchBreadTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes - bread types change less frequently
  });
}

// Hook for invalidating cache after mutations
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const invalidateInventoryQueries = () => {
    // Invalidate all inventory-related queries
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
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
      const { error } = await supabase
        .from('production_logs')
        .insert(productionData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateInventoryQueries();
      toast.success('Production recorded successfully');
    },
    onError: (error) => {
      console.error('Error adding production:', error);
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

// Hook for manual refresh with loading state
export function useManualRefresh() {
  const queryClient = useQueryClient();
  
  const refreshAll = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sales.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.production.all }),
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  return { refreshAll };
}

// Auto-refresh hook for active usage
export function useAutoRefresh(enabled = true) {
  const { invalidateInventoryQueries } = useInventoryMutations();

  useEffect(() => {
    if (!enabled) return;

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        invalidateInventoryQueries();
      }
    };

    // Refresh when network comes back online
    const handleOnline = () => {
      invalidateInventoryQueries();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, invalidateInventoryQueries]);
}