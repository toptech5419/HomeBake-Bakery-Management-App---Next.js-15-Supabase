"use client";

import { useState, useEffect, useCallback } from 'react';
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
