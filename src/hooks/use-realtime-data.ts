'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { RealtimePostgresChangesPayload, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';

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
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from(tableName).select(initialQuery);
      
      // Apply filters if provided
      if (options.eq) {
        Object.entries(options.eq).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      }
      
      if (options.filter) {
        // For more complex filters, you can extend this
        query = query.filter(options.filter.split(' ')[0], options.filter.split(' ')[1], options.filter.split(' ')[2]);
      }

      const { data: result, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setData(result as T[]);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [tableName, initialQuery, options, supabase]);

  // Handle real-time updates
  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Real-time update received:', payload);
    
    setData(currentData => {
      if (!currentData) return currentData;

      const newData = [...currentData];

      switch (payload.eventType) {
        case 'INSERT':
          // Add new record at the beginning (most recent first)
          newData.unshift(payload.new as T);
          break;
          
        case 'UPDATE':
          // Update existing record
          const updateIndex = newData.findIndex((item: any) => item.id === payload.new.id);
          if (updateIndex !== -1) {
            newData[updateIndex] = { ...newData[updateIndex], ...payload.new };
          }
          break;
          
        case 'DELETE':
          // Remove deleted record
          return newData.filter((item: any) => item.id !== payload.old.id);
      }

      return newData;
    });
  }, []);

  // Set up real-time subscription
  const setupSubscription = useCallback(() => {
    if (isSubscribedRef.current) return;

    try {
      setConnectionStatus('connecting');
      
      let subscription = supabase
        .channel(`realtime-${tableName}`)
        .on(
          'postgres_changes' as any,
          {
            event: options.event || '*',
            schema: 'public',
            table: tableName,
            ...(options.filter && { filter: options.filter })
          },
          handleRealtimeChange
        )
        .subscribe((status: string) => {
          console.log(`Subscription status for ${tableName}:`, status);
          
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            isSubscribedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            isSubscribedRef.current = false;
          } else if (status === 'TIMED_OUT') {
            setConnectionStatus('disconnected');
            isSubscribedRef.current = false;
            
            // Retry connection after delay
            setTimeout(() => {
              if (!isSubscribedRef.current) {
                setupSubscription();
              }
            }, 5000);
          }
        });

      subscriptionRef.current = subscription;

    } catch (err) {
      console.error('Error setting up subscription:', err);
      setConnectionStatus('error');
      setError(err instanceof Error ? err : new Error('Subscription error'));
    }
  }, [tableName, options, handleRealtimeChange, supabase]);

  // Cleanup subscription
  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      console.log(`Cleaning up subscription for ${tableName}`);
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
      isSubscribedRef.current = false;
    }
  }, [tableName]);

  // Refetch data manually
  const refetch = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online - reconnecting...');
      setConnectionStatus('connecting');
      if (!isSubscribedRef.current) {
        setupSubscription();
      }
      refetch();
    };

    const handleOffline = () => {
      console.log('Network offline');
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setupSubscription, refetch]);

  // Initial setup
  useEffect(() => {
    fetchInitialData();
    setupSubscription();

    return () => {
      cleanupSubscription();
    };
  }, [fetchInitialData, setupSubscription, cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  return {
    data,
    loading,
    error,
    connectionStatus,
    refetch
  };
}

// Specialized hooks for specific tables
export function useRealtimeSales(userId?: string) {
  const options: RealtimeOptions = userId ? { eq: { recorded_by: userId } } : {};
  
  return useRealtimeData<Database['public']['Tables']['sales_logs']['Row']>(
    'sales_logs',
    'id, bread_type_id, quantity, unit_price, discount, shift, recorded_by, created_at',
    options
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}