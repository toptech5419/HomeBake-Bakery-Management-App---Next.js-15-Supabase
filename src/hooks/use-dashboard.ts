"use client";

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { DashboardMetrics } from '@/types';

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch sales metrics
      const { data: salesData, error: salesError } = await supabase
        .from('sales_logs')
        .select('quantity, unit_price, discount')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (salesError) throw salesError;

      const totalSales = salesData?.reduce((sum, sale) => {
        const revenue = (sale.unit_price || 0) * sale.quantity - (sale.discount || 0);
        return sum + revenue;
      }, 0) || 0;

      // Fetch production metrics
      const { data: productionData, error: productionError } = await supabase
        .from('production_logs')
        .select('quantity')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (productionError) throw productionError;

      const totalProduction = productionData?.reduce((sum, prod) => sum + prod.quantity, 0) || 0;

      setMetrics({
        totalSales,
        totalProduction,
        salesCount: salesData?.length || 0,
        productionCount: productionData?.length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}

export function useManagerDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch manager-specific metrics
      const { data: productionData, error: productionError } = await supabase
        .from('production_logs')
        .select('quantity, shift')
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (productionError) throw productionError;

      const morningProduction = productionData
        ?.filter(prod => prod.shift === 'morning')
        .reduce((sum, prod) => sum + prod.quantity, 0) || 0;

      const nightProduction = productionData
        ?.filter(prod => prod.shift === 'night')
        .reduce((sum, prod) => sum + prod.quantity, 0) || 0;

      setMetrics({
        totalProduction: morningProduction + nightProduction,
        morningProduction,
        nightProduction,
        productionCount: productionData?.length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}

// New React Query-based manager dashboard hook
export function useManagerDashboardData() {
  const queryClient = useQueryClient();

  // Fetch manager dashboard data with React Query
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all dashboard data in parallel
      const [
        { data: activeBatches },
        { data: completedBatches },
        { data: recentBatches },
        { data: breadTypes }
      ] = await Promise.all([
        // Active batches (today)
        supabase
          .from('batches')
          .select('id')
          .eq('status', 'active')
          .gte('created_at', `${today}T00:00:00+01:00`)
          .lte('created_at', `${today}T23:59:59+01:00`),
        
        // Completed batches (today)
        supabase
          .from('batches')
          .select('id, actual_quantity, end_time')
          .eq('status', 'completed')
          .gte('end_time', `${today}T00:00:00+01:00`)
          .lte('end_time', `${today}T23:59:59+01:00`),
        
        // Recent batches (today, 5 latest)
        supabase
          .from('batches')
          .select('id, bread_type_id, actual_quantity, status, created_at')
          .gte('created_at', `${today}T00:00:00+01:00`)
          .lte('created_at', `${today}T23:59:59+01:00`)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Bread types for mapping
        supabase
          .from('bread_types')
          .select('id, name')
          .eq('is_active', true)
      ]);

      // Create bread type map
      const breadTypeMap = (breadTypes || []).reduce((acc: Record<string, string>, bt: any) => {
        acc[bt.id] = bt.name;
        return acc;
      }, {});

      // Calculate metrics
      const activeBatchesCount = activeBatches?.length || 0;
      const completedTodayCount = completedBatches?.length || 0;
      const totalUnits = completedBatches?.reduce((sum: number, b: any) => sum + (b.actual_quantity || 0), 0) || 0;
      
      // Calculate efficiency
      const totalToday = (activeBatchesCount + completedTodayCount) || 1;
      const efficiency = Math.round((completedTodayCount / totalToday) * 100);
      const efficiencyStatus = efficiency >= 80 ? 'On track' : 'Behind schedule';

      // Transform recent batches
      const transformedRecentBatches = (recentBatches || []).map((b: any) => ({
        id: b.id,
        product: breadTypeMap[b.bread_type_id] || 'Unknown',
        quantity: b.actual_quantity,
        status: b.status,
        time: getRelativeTime(b.created_at),
      }));

      return {
        activeBatchesCount,
        completedTodayCount,
        totalUnits,
        recentBatches: transformedRecentBatches,
        efficiency,
        efficiencyStatus
      };
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Invalidate dashboard data
  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'manager'] });
  }, [queryClient]);

  return {
    dashboardData,
    isLoading,
    error,
    refetchDashboard,
    invalidateDashboard
  };
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}
