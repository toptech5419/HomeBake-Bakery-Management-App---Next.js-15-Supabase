'use client';

import { useState, useCallback } from 'react';
import type { Database } from '@/types/supabase';

// TEMPORARILY DISABLED: This hook was causing browser crashes due to memory leaks
// and infinite subscription loops. Returning safe empty data until fixed.

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

interface RealtimeOptions {
  filter?: string;
  eq?: Record<string, any>;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface UseRealtimeDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  refetch: () => Promise<void>;
}

export function useRealtimeData<T = any>(
  tableName: TableName,
  initialQuery: string = '*',
  options: RealtimeOptions = {}
): UseRealtimeDataReturn<T[]> {
  // SAFE FALLBACK: Return empty data to prevent crashes
  const [data] = useState<T[] | null>(null);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);
  const [connectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Safe refetch function that does nothing
  const refetch = useCallback(async () => {
    // Do nothing to prevent crashes
  }, []);

  return {
    data,
    loading,
    error,
    connectionStatus,
    refetch
  };
}

// Specialized hooks for specific tables - DISABLED for safety
export function useRealtimeSales(userId?: string) {
  return useRealtimeData<Database['public']['Tables']['sales_logs']['Row']>(
    'sales_logs',
    'id, bread_type_id, quantity, unit_price, discount, shift, recorded_by, created_at',
    {}
  );
}

export function useRealtimeProduction() {
  return useRealtimeData<Database['public']['Tables']['production_logs']['Row']>(
    'production_logs',
    'id, bread_type_id, quantity, shift, recorded_by, created_at',
    {}
  );
}

export function useRealtimeUsers() {
  return useRealtimeData<Database['public']['Tables']['users']['Row']>(
    'users',
    'id, name, role, created_at',
    {}
  );
}

// Connection status hook for UI indicators
export function useConnectionStatus() {
  // Return offline to prevent any real-time operations
  return false;
}