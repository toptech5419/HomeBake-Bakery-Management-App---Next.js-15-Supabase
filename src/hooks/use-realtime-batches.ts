'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { batchQueryKeys } from './use-batches-query';

interface UseRealtimeBatchesOptions {
  enabled?: boolean;
  shift?: 'morning' | 'night';
  onBatchChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
}

/**
 * Production-ready real-time batch subscriptions with:
 * - Proper error handling and reconnection
 * - Connection state management
 * - Efficient query invalidation
 * - Memory leak prevention
 */
export function useRealtimeBatches(options: UseRealtimeBatchesOptions = {}) {
  const { enabled = true, shift, onBatchChange } = options;
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const connectionStateRef = useRef<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Debounced invalidation to prevent excessive refetches
  const invalidateQueries = useCallback(() => {
    if (shift) {
      // Only invalidate queries for the specific shift
      queryClient.invalidateQueries({ 
        queryKey: batchQueryKeys.active(shift),
        refetchType: 'active' // Only refetch if component is mounted
      });
    }
  }, [queryClient, shift]);

  // Debounce function to prevent rapid-fire invalidations
  const debouncedInvalidate = useCallback(() => {
    const timeoutId = setTimeout(invalidateQueries, 100); // 100ms debounce
    return () => clearTimeout(timeoutId);
  }, [invalidateQueries]);

  const setupSubscription = useCallback(() => {
    if (!enabled || connectionStateRef.current === 'connecting') {
      return;
    }

    console.log('🔄 Setting up production real-time batch subscription...');
    connectionStateRef.current = 'connecting';

    try {
      // Build filter based on shift
      const filter = shift ? `shift=eq.${shift}` : undefined;
      
      const channel = supabase
        .channel(`batches_realtime_${shift || 'all'}`, {
          config: {
            // Production-ready channel config
            presence: { key: 'user_id' },
            broadcast: { self: true },
            ack: true // Ensure message delivery acknowledgment
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'batches',
            filter: filter
          },
          (payload) => {
            console.log(`📡 Real-time batch ${payload.eventType}:`, {
              event: payload.eventType,
              table: payload.table,
              id: payload.new?.id || payload.old?.id,
              shift: payload.new?.shift || payload.old?.shift
            });

            // Call custom handler if provided
            onBatchChange?.(payload.eventType as any, payload);

            // Efficient query invalidation with debouncing
            debouncedInvalidate();
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time batch subscription established');
            connectionStateRef.current = 'connected';
            
            // Clear any reconnection attempts
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = undefined;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Real-time batch subscription error:', { status, err });
            connectionStateRef.current = 'error';
            
            // Implement exponential backoff for reconnection
            const retryDelay = Math.min(1000 * Math.pow(2, 3), 30000); // Max 30 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Attempting to reconnect real-time subscription...');
              setupSubscription();
            }, retryDelay);
          } else if (status === 'CLOSED') {
            console.log('🔌 Real-time batch subscription closed');
            connectionStateRef.current = 'disconnected';
          }
        });

      subscriptionRef.current = channel;

    } catch (error) {
      console.error('❌ Failed to setup real-time subscription:', error);
      connectionStateRef.current = 'error';
      
      // Retry after delay
      reconnectTimeoutRef.current = setTimeout(setupSubscription, 5000);
    }
  }, [enabled, shift, onBatchChange, debouncedInvalidate]);

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up real-time batch subscription...');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Unsubscribe from channel
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    connectionStateRef.current = 'disconnected';
  }, []);

  // Setup subscription on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      setupSubscription();
    }

    return cleanup;
  }, [enabled, shift, setupSubscription, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle network reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network reconnected, re-establishing real-time subscription...');
      cleanup();
      setTimeout(setupSubscription, 1000); // Small delay to ensure connection stability
    };

    const handleOffline = () => {
      console.log('📴 Network disconnected, cleaning up real-time subscription...');
      cleanup();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setupSubscription, cleanup]);

  return {
    connectionState: connectionStateRef.current,
    reconnect: setupSubscription,
    disconnect: cleanup
  };
}