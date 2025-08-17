/**
 * Enhanced Real-time Data Synchronization
 * Production-ready real-time updates with React Query integration
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { QUERY_KEYS } from '@/lib/react-query/config';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseEnhancedRealTimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  queryKeys: readonly unknown[][];
  enabled?: boolean;
  throttleMs?: number;
  onError?: (error: Error) => void;
  onUpdate?: (payload: any) => void;
}

/**
 * Enhanced real-time hook with React Query integration
 */
export function useEnhancedRealTime({
  table,
  schema = 'public',
  filter,
  queryKeys,
  enabled = true,
  throttleMs = 1000,
  onError,
  onUpdate,
}: UseEnhancedRealTimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled invalidation to prevent excessive re-renders
  const throttledInvalidation = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ 
          queryKey,
          refetchType: 'active' // Only refetch active queries
        });
      });
    }, throttleMs);
  }, [queryClient, queryKeys, throttleMs]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log(`📡 Real-time ${payload.eventType} on ${table}:`, payload);
    
    // Call custom update handler
    onUpdate?.(payload);
    
    // Optimistic update for better UX
    if (payload.eventType === 'INSERT') {
      queryKeys.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (old: any[]) => {
          if (!old) return [payload.new];
          
          // Check if item already exists (prevent duplicates)
          const exists = old.some(item => item.id === payload.new.id);
          if (!exists) {
            return [payload.new, ...old];
          }
          return old;
        });
      });
    } else if (payload.eventType === 'UPDATE') {
      queryKeys.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (old: any[]) => {
          if (!old) return [payload.new];
          
          return old.map(item => 
            item.id === payload.new.id ? payload.new : item
          );
        });
      });
    } else if (payload.eventType === 'DELETE') {
      queryKeys.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (old: any[]) => {
          if (!old) return [];
          
          return old.filter(item => item.id !== payload.old.id);
        });
      });
    }
    
    // Throttled invalidation for consistency
    throttledInvalidation();
  }, [queryClient, queryKeys, throttledInvalidation, onUpdate, table]);

  // Handle real-time errors
  const handleRealtimeError = useCallback((error: any) => {
    console.error(`❌ Real-time error on ${table}:`, error);
    onError?.(new Error(`Real-time connection error: ${error.message || 'Unknown error'}`));
  }, [table, onError]);

  useEffect(() => {
    if (!enabled) return;

    console.log(`🔄 Setting up real-time subscription for ${table}`);

    // Create unique channel name
    const channelName = `realtime_${table}_${filter || 'all'}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          filter,
        },
        handleRealtimeUpdate
      )
      .on('error', handleRealtimeError)
      .subscribe((status) => {
        console.log(`📡 Real-time subscription status for ${table}:`, status);
        
        if (status === 'CHANNEL_ERROR') {
          handleRealtimeError(new Error('Channel subscription failed'));
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔌 Cleaning up real-time subscription for ${table}`);
      
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, table, schema, filter, handleRealtimeUpdate, handleRealtimeError]);

  // Return channel status and utilities
  return {
    isConnected: channelRef.current?.state === 'joined',
    channel: channelRef.current,
    forceRefresh: () => {
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  };
}

/**
 * Pre-configured real-time hooks for common use cases
 */

export function useRealtimeBatches(shift?: string) {
  const queryKeys = [
    QUERY_KEYS.batches.active(shift),
    QUERY_KEYS.batches.all(),
  ];

  return useEnhancedRealTime({
    table: 'batches',
    queryKeys,
    throttleMs: 500, // Faster updates for active production
    filter: shift ? `shift=eq.${shift}` : undefined,
  });
}

export function useRealtimeSales(shift?: string) {
  const queryKeys = [
    ['sales', 'current', shift],
    QUERY_KEYS.reports.all(),
  ];

  return useEnhancedRealTime({
    table: 'sales_logs',
    queryKeys,
    throttleMs: 1000,
    filter: shift ? `shift=eq.${shift}` : undefined,
  });
}

export function useRealtimeInventory() {
  const queryKeys = [
    QUERY_KEYS.inventory.all(),
    QUERY_KEYS.inventory.current(),
  ];

  return useEnhancedRealTime({
    table: 'available_stock',
    queryKeys,
    throttleMs: 2000, // Slower updates for inventory
  });
}

export function useRealtimeActivities(limit?: number) {
  const queryKeys = [
    QUERY_KEYS.activities.recent(limit),
    QUERY_KEYS.activities.all(),
  ];

  return useEnhancedRealTime({
    table: 'activities',
    queryKeys,
    throttleMs: 1500,
  });
}

/**
 * Connection health monitoring
 */
export function useRealtimeConnectionHealth() {
  const lastPingRef = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Monitor Supabase connection health
    const checkConnection = async () => {
      try {
        const startTime = Date.now();
        const { error } = await supabase
          .from('bread_types')
          .select('count', { count: 'exact', head: true });
        
        const latency = Date.now() - startTime;
        lastPingRef.current = Date.now();
        
        if (error) {
          console.warn('⚠️ Connection health check failed:', error.message);
        } else {
          console.log(`✅ Connection healthy (${latency}ms)`);
        }
      } catch (error) {
        console.error('❌ Connection health check error:', error);
      }
    };

    // Check connection every 30 seconds
    healthCheckIntervalRef.current = setInterval(checkConnection, 30000);
    checkConnection(); // Initial check

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    lastPing: lastPingRef.current,
    isHealthy: Date.now() - lastPingRef.current < 60000, // Healthy if pinged within 1 minute
  };
}

/**
 * Smart real-time management based on user activity
 */
export function useSmartRealTime(options: UseEnhancedRealTimeOptions) {
  const isActiveRef = useRef(true);
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity every 30 seconds
    const inactivityCheck = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current > 5 * 60 * 1000; // 5 minutes
      if (inactive !== !isActiveRef.current) {
        isActiveRef.current = !inactive;
        console.log(`👤 User ${isActiveRef.current ? 'active' : 'inactive'}`);
      }
    }, 30000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, []);

  // Use real-time with dynamic throttling based on activity
  return useEnhancedRealTime({
    ...options,
    enabled: options.enabled && isActiveRef.current,
    throttleMs: isActiveRef.current ? (options.throttleMs || 1000) : 5000, // Slower when inactive
  });
}

/**
 * Batch operations with real-time updates
 */
export function useRealtimeBatchOperations() {
  const { isConnected } = useRealtimeBatches();
  
  return {
    isRealTimeConnected: isConnected,
    // Add more batch operation utilities here
  };
}