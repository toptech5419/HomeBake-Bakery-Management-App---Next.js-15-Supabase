'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Refresh functions
  refreshData: () => Promise<void>;
  refreshProduction: () => Promise<void>;
  refreshSales: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [productionLogs, setProductionLogs] = useState<Tables['production_logs']['Row'][]>([]);
  const [salesLogs, setSalesLogs] = useState<Tables['sales_logs']['Row'][]>([]);
  const [breadTypes, setBreadTypes] = useState<Tables['bread_types']['Row'][]>([]);
  const [users, setUsers] = useState<Tables['users']['Row'][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bread types (rarely changes)
  const fetchBreadTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bread_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBreadTypes(data || []);
    } catch (err) {
      console.error('Error fetching bread types:', err);
    }
  }, []);

  // Fetch users (for reference)
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  // Fetch production logs (last 7 days for performance)
  const fetchProductionLogs = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProductionLogs(data || []);
    } catch (err) {
      console.error('Error fetching production logs:', err);
      setError('Failed to load production data');
    }
  }, []);

  // Fetch sales logs (last 7 days for performance)
  const fetchSalesLogs = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('sales_logs')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSalesLogs(data || []);
    } catch (err) {
      console.error('Error fetching sales logs:', err);
      setError('Failed to load sales data');
    }
  }, []);

  // Add production log
  const addProductionLog = useCallback(async (log: Omit<Tables['production_logs']['Insert'], 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('production_logs')
        .insert([log])
        .select()
        .single();
      
      if (error) throw error;
      
      // Optimistically update local state
      if (data) {
        setProductionLogs(prev => [data, ...prev]);
      }
      
      // Refresh data to ensure consistency
      setTimeout(() => {
        fetchProductionLogs();
        fetchSalesLogs(); // Refresh sales too as inventory depends on both
      }, 500);
      
    } catch (err) {
      console.error('Error adding production log:', err);
      throw err;
    }
  }, [fetchProductionLogs, fetchSalesLogs]);

  // Add sales log
  const addSalesLog = useCallback(async (log: Omit<Tables['sales_logs']['Insert'], 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('sales_logs')
        .insert([log])
        .select()
        .single();
      
      if (error) throw error;
      
      // Optimistically update local state
      if (data) {
        setSalesLogs(prev => [data, ...prev]);
      }
      
      // Refresh data to ensure consistency
      setTimeout(() => {
        fetchSalesLogs();
        fetchProductionLogs(); // Refresh production too as inventory depends on both
      }, 500);
      
    } catch (err) {
      console.error('Error adding sales log:', err);
      throw err;
    }
  }, [fetchProductionLogs, fetchSalesLogs]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchBreadTypes(),
        fetchUsers(),
        fetchProductionLogs(),
        fetchSalesLogs()
      ]);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchBreadTypes, fetchUsers, fetchProductionLogs, fetchSalesLogs]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up periodic refresh (every 30 seconds for active data)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProductionLogs();
      fetchSalesLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchProductionLogs, fetchSalesLogs]);

  const value: DataContextType = {
    productionLogs,
    salesLogs,
    breadTypes,
    users,
    isLoading,
    error,
    addProductionLog,
    addSalesLog,
    refreshData,
    refreshProduction: fetchProductionLogs,
    refreshSales: fetchSalesLogs
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

// Computed values hooks
export function useInventory() {
  const { productionLogs, salesLogs, breadTypes } = useData();
  
  const inventory = breadTypes.map(breadType => {
    const produced = productionLogs
      .filter(log => log.bread_type_id === breadType.id)
      .reduce((sum, log) => sum + log.quantity, 0);
    
    const sold = salesLogs
      .filter(log => log.bread_type_id === breadType.id)
      .reduce((sum, log) => sum + log.quantity, 0);
    
    const available = produced - sold;
    
    return {
      breadType,
      produced,
      sold,
      available,
      value: available * breadType.unit_price
    };
  });

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0);

  return { inventory, totalValue };
}