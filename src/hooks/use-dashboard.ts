'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardData, getRoleBasedMetrics } from '@/lib/dashboard/actions';
import { DashboardMetrics } from '@/lib/dashboard/queries';

interface UseDashboardReturn {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetchDashboardData();
      
      if (result.success && result.data) {
        setMetrics(result.data);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  const refreshMetrics = useCallback(async () => {
    // Quick refresh without full loading state
    try {
      const result = await fetchDashboardData();
      if (result.success && result.data) {
        setMetrics(result.data);
      }
    } catch (err) {
      console.error('Error refreshing metrics:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshMetrics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading, refreshMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
    refreshMetrics,
  };
}

export function useRoleMetrics(role: string) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoleMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getRoleBasedMetrics(role);
      
      if (result.success && result.data) {
        setMetrics(result.data);
      } else {
        setError(result.error || 'Failed to fetch role metrics');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error fetching role metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchRoleMetrics();
  }, [fetchRoleMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchRoleMetrics,
  };
}
