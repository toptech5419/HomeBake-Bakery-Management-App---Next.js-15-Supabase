'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];

interface DataContextType {
  // Production data
  productionLogs: Tables['production_logs']['Row'][];
  addProductionLog: (log: Omit<Tables['production_logs']['Insert'], 'id' | 'created_at'>) => Promise<void>;
  
  // Sales data
  salesLogs: Tables['sales_logs']['Row'][];
  addSalesLog: (log: Omit<Tables['sales_logs']['Insert'], 'id' | 'created_at'>) => Promise<void>;
  
  // Bread types
  breadTypes: Tables['bread_types']['Row'][];
  
  // Users
  users: Tables['users']['Row'][];
  
  // Batches
  batches: Tables['batches']['Row'][];
  activeBatches: Tables['batches']['Row'][];
  batchStats: any;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Connection status
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  
  // Refresh functions
  refreshData: () => Promise<void>;
  refreshProduction: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshBatches: (shift?: 'morning' | 'night') => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Configuration
const FETCH_CONFIG = {
  DAYS_TO_FETCH: 3, // Reduced from 7 to 3 days for mobile performance
  REFRESH_INTERVAL: 60000, // Increased from 30s to 60s to reduce load
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [productionLogs, setProductionLogs] = useState<Tables['production_logs']['Row'][]>([]);
  const [salesLogs, setSalesLogs] = useState<Tables['sales_logs']['Row'][]>([]);
  const [breadTypes, setBreadTypes] = useState<Tables['bread_types']['Row'][]>([]);
  const [users, setUsers] = useState<Tables['users']['Row'][]>([]);
  const [batches, setBatches] = useState<Tables['batches']['Row'][]>([]);
  const [activeBatches, setActiveBatches] = useState<Tables['batches']['Row'][]>([]);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(true);

  // Enhanced retry function with exponential backoff
  const withRetry = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = FETCH_CONFIG.RETRY_ATTEMPTS
  ) => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err as Error;
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff: 1s, 2s, 4s...
        const delay = FETCH_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }, []);

  // Optimized data fetchers with better error handling
  const fetchBreadTypes = useCallback(async () => {
    try {
      console.log('🔄 Fetching bread types...');
      setConnectionStatus('connecting');
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('bread_types')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (result.error) throw result.error;
        return result;
      });
      
      console.log('✅ Bread types fetched:', data?.length || 0, 'records');
      setBreadTypes(data || []);
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('❌ Error fetching bread types:', err);
      setConnectionStatus('error');
      throw err;
    }
  }, [withRetry]);

  const fetchUsers = useCallback(async () => {
    try {
      console.log('🔄 Fetching users...');
      setConnectionStatus('connecting');
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('users')
          .select('*')
          .order('name');
        
        if (result.error) throw result.error;
        return result;
      });
      
      console.log('✅ Users fetched:', data?.length || 0, 'records');
      setUsers(data || []);
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setConnectionStatus('error');
      throw err;
    }
  }, [withRetry]);

  // Optimized production logs fetch (only last 3 days)
  const fetchProductionLogs = useCallback(async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - FETCH_CONFIG.DAYS_TO_FETCH);
      
      console.log('🔄 Fetching production logs...');
      setConnectionStatus('connecting');
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('production_logs')
          .select('*')
          .gte('created_at', daysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100); // Limit to 100 most recent records
        
        if (result.error) throw result.error;
        return result;
      });
      
      console.log('✅ Production logs fetched:', data?.length || 0, 'records');
      setProductionLogs(data || []);
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('💥 Error fetching production logs:', err);
      setConnectionStatus('error');
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Connection failed. Please check your internet connection.');
      } else {
        setError('Failed to load production data. Please try again.');
      }
      throw err;
    }
  }, [withRetry]);

  // Add batch fetching function with shift filtering
  const fetchBatches = useCallback(async (shift?: 'morning' | 'night') => {
    try {
      console.log(`🔄 Fetching batches${shift ? ` for ${shift} shift` : ''}...`);
      setConnectionStatus('connecting');
      
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      if (!userId) {
        console.log('⚠️ No user found, skipping batch fetch');
        setBatches([]);
        setActiveBatches([]);
        return;
      }
      
      const { data, error } = await withRetry(async () => {
        let query = supabase
          .from('batches')
          .select(`
            *,
            bread_type:bread_types(name, unit_price)
          `)
          .eq('created_by', userId) // Filter by current user
          .order('created_at', { ascending: false });
        
        // Add shift filtering if provided
        if (shift) {
          query = query.eq('shift', shift);
        }
        
        const result = await query;
        if (result.error) throw result.error;
        return result;
      });
      
      console.log(`✅ Batches fetched: ${data?.length || 0} records${shift ? ` for ${shift} shift` : ''} for user ${userId}`);
      setBatches(data || []);
      
      // Separate active batches
      const active = (data || []).filter((batch: any) => batch.status === 'active');
      setActiveBatches(active);
      
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('❌ Error fetching batches:', err);
      setConnectionStatus('error');
      throw err;
    }
  }, [withRetry]);

  // Optimized sales logs fetch with better error handling
  const fetchSalesLogs = useCallback(async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - FETCH_CONFIG.DAYS_TO_FETCH);
      
      console.log('🔄 Fetching sales logs...');
      setConnectionStatus('connecting');
      
      const { data, error } = await withRetry(async () => {
        const result = await supabase
          .from('sales_logs')
          .select('*')
          .gte('created_at', daysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100); // Limit to 100 most recent records
        
        if (result.error) throw result.error;
        return result;
      });
      
      console.log('✅ Sales logs fetched:', data?.length || 0, 'records');
      setSalesLogs(data || []);
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('💥 Error fetching sales logs:', err);
      setConnectionStatus('error');
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Connection failed. Check internet and try again.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        setError('Database access issue. Please contact support.');
      } else {
        setError('Failed to load sales data. Please try again.');
      }
      throw err;
    }
  }, [withRetry]);

  // Optimized add production log with immediate UI update
  const addProductionLog = useCallback(async (log: Omit<Tables['production_logs']['Insert'], 'id' | 'created_at'>) => {
    try {
      console.log('📝 Adding production log...');
      
      const { data, error } = await supabase
        .from('production_logs')
        .insert([log])
        .select()
        .single();
      
      if (error) throw error;
      
      // Immediate optimistic update
      if (data) {
        setProductionLogs(prev => [data, ...prev.slice(0, 99)]); // Keep only 100 records
        console.log('✅ Production log added successfully');
      }
      
      // Background refresh sales to update inventory calculations
      setTimeout(() => {
        fetchSalesLogs().catch(console.error);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error adding production log:', err);
      throw err;
    }
  }, [fetchSalesLogs]);

  // Optimized add sales log with immediate UI update
  const addSalesLog = useCallback(async (log: Omit<Tables['sales_logs']['Insert'], 'id' | 'created_at'>) => {
    try {
      console.log('📝 Adding sales log...');
      
      const { data, error } = await supabase
        .from('sales_logs')
        .insert([log])
        .select()
        .single();
      
      if (error) throw error;
      
      // Immediate optimistic update
      if (data) {
        setSalesLogs(prev => [data, ...prev.slice(0, 99)]); // Keep only 100 records
        console.log('✅ Sales log added successfully');
      }
      
      // Background refresh production to update inventory calculations
      setTimeout(() => {
        fetchProductionLogs().catch(console.error);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error adding sales log:', err);
      throw err;
    }
  }, [fetchProductionLogs]);

  // Smart refresh function - only refresh data, not static references
  const refreshData = useCallback(async (force = false) => {
    if (!isOnlineRef.current && !force) {
      console.log('🔄 Skipping refresh - offline');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Always refresh bread types and users (they rarely change)
      if (breadTypes.length === 0) {
        await fetchBreadTypes();
      }
      if (users.length === 0) {
        await fetchUsers();
      }
      
      // Fetch logs in parallel but handle errors separately
      const promises = [
        fetchProductionLogs().catch(err => console.error('Production fetch failed:', err)),
        fetchSalesLogs().catch(err => console.error('Sales fetch failed:', err)),
        fetchBatches().catch(err => console.error('Batches fetch failed:', err))
      ];
      
      await Promise.allSettled(promises);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('❌ Refresh failed:', err);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [breadTypes.length, users.length, fetchBreadTypes, fetchUsers, fetchProductionLogs, fetchSalesLogs]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network back online');
      isOnlineRef.current = true;
      setConnectionStatus('connecting');
      refreshData(true);
    };

    const handleOffline = () => {
      console.log('📴 Network offline');
      isOnlineRef.current = false;
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // ✅ FIXED: Empty dependencies - only run on mount

  // Smart refresh interval
  useEffect(() => {
    // Initial load
    refreshData();

    // Set up intelligent refresh interval
    refreshIntervalRef.current = setInterval(() => {
      if (isOnlineRef.current && document.visibilityState === 'visible') {
        // Only refresh logs, not static data
        fetchProductionLogs().catch(console.error);
        fetchSalesLogs().catch(console.error);
        fetchBatches().catch(console.error);
      }
    }, FETCH_CONFIG.REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // ✅ FIXED: Empty dependencies - only run on mount

  // Pause refresh when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - refresh data
        fetchProductionLogs().catch(console.error);
        fetchSalesLogs().catch(console.error);
        fetchBatches().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchProductionLogs, fetchSalesLogs, fetchBatches]);

  const value: DataContextType = {
    productionLogs,
    salesLogs,
    breadTypes,
    users,
    batches,
    activeBatches,
    batchStats,
    isLoading,
    error,
    lastUpdated,
    connectionStatus,
    addProductionLog,
    addSalesLog,
    refreshData: () => refreshData(true),
    refreshProduction: fetchProductionLogs,
    refreshSales: fetchSalesLogs,
    refreshBatches: (shift?: 'morning' | 'night') => fetchBatches(shift)
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}

// Optimized inventory hook with real-time calculations
export function useInventory() {
  const { productionLogs, salesLogs, breadTypes, lastUpdated } = useData();
  
  const inventory = breadTypes.map(breadType => {
    const produced = productionLogs
      .filter(log => log.bread_type_id === breadType.id)
      .reduce((sum, log) => sum + log.quantity, 0);
    
    const sold = salesLogs
      .filter(log => log.bread_type_id === breadType.id)
      .reduce((sum, log) => sum + log.quantity, 0);
    
    const available = Math.max(0, produced - sold); // Ensure non-negative
    
    return {
      breadType,
      produced,
      sold,
      available,
      value: available * breadType.unit_price,
      lastUpdated
    };
  });

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0);
  const totalAvailable = inventory.reduce((sum, item) => sum + item.available, 0);

  return { 
    inventory, 
    totalValue, 
    totalAvailable,
    lastUpdated 
  };
}