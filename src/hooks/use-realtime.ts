'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  realtimeManager, 
  type TableName, 
  type RealtimeCallbacks 
} from '@/lib/supabase/realtime';

export interface UseRealtimeOptions {
  table: TableName;
  filter?: { column: string; value: any };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export interface UseRealtimeReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
  subscriptionId: string | null;
}

/**
 * Hook for subscribing to real-time updates from Supabase tables
 */
export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onError,
  enabled = true
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onError });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete, onError };
  }, [onInsert, onUpdate, onDelete, onError]);

  const connect = useCallback(() => {
    if (!enabled || subscriptionIdRef.current) return;

    const callbacks: RealtimeCallbacks = {
      onInsert: (payload) => callbacksRef.current.onInsert?.(payload),
      onUpdate: (payload) => callbacksRef.current.onUpdate?.(payload),
      onDelete: (payload) => callbacksRef.current.onDelete?.(payload),
      onError: (errorMsg) => {
        setError(errorMsg);
        callbacksRef.current.onError?.(errorMsg);
      },
      onStatusChange: (status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          setError(null);
        }
      }
    };

    subscriptionIdRef.current = realtimeManager.subscribe(table, callbacks, filter);
  }, [table, filter, enabled]);

  const disconnect = useCallback(() => {
    if (subscriptionIdRef.current) {
      realtimeManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      setIsConnected(false);
      setError(null);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100); // Small delay to ensure cleanup
  }, [disconnect, connect]);

  // Setup subscription on mount and cleanup on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Update connection when filter changes
  useEffect(() => {
    if (enabled && subscriptionIdRef.current) {
      reconnect();
    }
  }, [filter?.column, filter?.value, reconnect, enabled]);

  return {
    isConnected,
    error,
    reconnect,
    disconnect,
    subscriptionId: subscriptionIdRef.current
  };
}

/**
 * Hook for subscribing to sales logs updates
 */
export function useSalesLogsRealtime(
  onUpdate: (payload: any) => void,
  userId?: string,
  enabled = true
) {
  return useRealtime({
    table: 'sales_logs',
    filter: userId ? { column: 'recorded_by', value: userId } : undefined,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
    enabled
  });
}

/**
 * Hook for subscribing to production logs updates
 */
export function useProductionLogsRealtime(
  onUpdate: (payload: any) => void,
  userId?: string,
  enabled = true
) {
  return useRealtime({
    table: 'production_logs',
    filter: userId ? { column: 'recorded_by', value: userId } : undefined,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
    enabled
  });
}

/**
 * Hook for subscribing to shift feedback updates
 */
export function useShiftFeedbackRealtime(
  onUpdate: (payload: any) => void,
  userId?: string,
  enabled = true
) {
  return useRealtime({
    table: 'shift_feedback',
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
    enabled
  });
}

/**
 * Hook for subscribing to bread types updates
 */
export function useBreadTypesRealtime(
  onUpdate: (payload: any) => void,
  enabled = true
) {
  return useRealtime({
    table: 'bread_types',
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
    enabled
  });
}

/**
 * Hook for subscribing to multiple tables at once
 */
export function useMultiTableRealtime(
  subscriptions: Array<{
    table: TableName;
    onUpdate: (payload: any) => void;
    filter?: { column: string; value: any };
  }>,
  enabled = true
) {
  const connections = subscriptions.map(({ table, onUpdate, filter }) =>
    useRealtime({
      table,
      filter,
      onInsert: onUpdate,
      onUpdate: onUpdate,
      onDelete: onUpdate,
      enabled
    })
  );

  return {
    isAllConnected: connections.every(conn => conn.isConnected),
    hasErrors: connections.some(conn => conn.error !== null),
    errors: connections.filter(conn => conn.error).map(conn => conn.error),
    reconnectAll: () => connections.forEach(conn => conn.reconnect()),
    disconnectAll: () => connections.forEach(conn => conn.disconnect()),
    connections
  };
}

/**
 * Hook for inventory updates (calculated from sales and production logs)
 */
export function useInventoryRealtime(
  onInventoryChange: () => void,
  enabled = true
) {
  const { isConnected: salesConnected } = useSalesLogsRealtime(
    () => onInventoryChange(),
    undefined,
    enabled
  );

  const { isConnected: productionConnected } = useProductionLogsRealtime(
    () => onInventoryChange(),
    undefined,
    enabled
  );

  return {
    isConnected: salesConnected && productionConnected,
    reconnect: () => {
      // Handled by individual hooks
    }
  };
}