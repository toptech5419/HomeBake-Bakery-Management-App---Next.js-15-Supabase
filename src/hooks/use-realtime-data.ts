'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { RealtimePostgresChangesPayload, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';

// TEMPORARY: Disable realtime subscriptions to prevent browser freezing
const DISABLE_REALTIME = true;

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
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Check if realtime is disabled
    if (DISABLE_REALTIME) {
      console.log(`Realtime subscriptions disabled for ${tableName}`);
      setConnectionStatus('disconnected');
      return;
    }
    
    // Prevent multiple simultaneous subscriptions
    if (isSubscribedRef.current || isCleaningUpRef.current) {
      console.log(`Skipping subscription setup for ${tableName} - already subscribed or cleaning up`);
      return;
    }

    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      setConnectionStatus('connecting');
      
      // Create a unique channel name to avoid conflicts
      const channelName = `realtime-${tableName}-${Date.now()}`;
      
      // Create channel
      const channel = supabase.channel(channelName);
      channelRef.current = channel;
      
      // Set up listener
      channel.on(
        'postgres_changes' as any,
        {
          event: options.event || '*',
          schema: 'public',
          table: tableName,
          ...(options.filter && { filter: options.filter })
        },
        handleRealtimeChange
      );
      
      // Subscribe to channel
      const subscription = channel.subscribe((status: string) => {
        console.log(`Subscription status for ${tableName}:`, status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          isSubscribedRef.current = true;
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          isSubscribedRef.current = false;
          
          // Schedule retry with exponential backoff
          const retryDelay = Math.min(5000 * Math.pow(2, 0), 30000); // Max 30 seconds
          console.log(`Will retry subscription for ${tableName} in ${retryDelay}ms`);
          
          retryTimeoutRef.current = setTimeout(() => {
            cleanupSubscription();
            setupSubscription();
          }, retryDelay);
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          isSubscribedRef.current = false;
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          isSubscribedRef.current = false;
        }
      });

      subscriptionRef.current = subscription;

    } catch (err) {
      console.error('Error setting up subscription:', err);
      setConnectionStatus('error');
      setError(err instanceof Error ? err : new Error('Subscription error'));
      isSubscribedRef.current = false;
    }
  }, [tableName, options, handleRealtimeChange]);

  // Cleanup subscription
  const cleanupSubscription = useCallback(async () => {
    if (isCleaningUpRef.current) {
      console.log(`Already cleaning up subscription for ${tableName}`);
      return;
    }
    
    isCleaningUpRef.current = true;
    
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Unsubscribe from channel
    if (channelRef.current) {
      console.log(`Cleaning up subscription for ${tableName}`);
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.error(`Error removing channel for ${tableName}:`, err);
      }
      channelRef.current = null;
    }
    
    subscriptionRef.current = null;
    isSubscribedRef.current = false;
    isCleaningUpRef.current = false;
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

  // Initial setup and cleanup
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (!mounted) return;
      
      // Fetch initial data
      await fetchInitialData();
      
      // Set up subscription only if component is still mounted
      if (mounted && !DISABLE_REALTIME) {
        setupSubscription();
      } else if (DISABLE_REALTIME) {
        console.log(`[${tableName}] Realtime subscriptions temporarily disabled`);
        setConnectionStatus('disconnected');
      }
    };
    
    init();

    // Cleanup function
    return () => {
      mounted = false;
      if (!DISABLE_REALTIME) {
        cleanupSubscription();
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

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