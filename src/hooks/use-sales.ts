import { useState, useCallback } from 'react';

interface SalesLog {
  id: string;
  quantity_sold: number;
  discount_percentage: number;
  shift: 'morning' | 'night';
  bread_types?: { 
    name: string;
    unit_price: number;
  };
}

export function useSales() {
  const [salesLogs, setSalesLogs] = useState<SalesLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addSalesLog = useCallback((log: SalesLog) => {
    setSalesLogs(prev => [log, ...prev]);
  }, []);

  const updateSalesLogs = useCallback((logs: SalesLog[]) => {
    setSalesLogs(logs);
  }, []);

  const clearSalesLogs = useCallback(() => {
    setSalesLogs([]);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setSubmittingState = useCallback((isSubmitting: boolean) => {
    setSubmitting(isSubmitting);
  }, []);

  const getTotalSales = useCallback(() => {
    return salesLogs.reduce((sum, log) => sum + log.quantity_sold, 0);
  }, [salesLogs]);

  const getTotalRevenue = useCallback(() => {
    return salesLogs.reduce((sum, log) => {
      const discountMultiplier = (100 - (log.discount_percentage || 0)) / 100;
      const unitPrice = log.bread_types?.unit_price || 0;
      return sum + (log.quantity_sold * unitPrice * discountMultiplier);
    }, 0);
  }, [salesLogs]);

  const getSalesByShift = useCallback((shift: 'morning' | 'night') => {
    return salesLogs.filter(log => log.shift === shift);
  }, [salesLogs]);

  return {
    salesLogs,
    loading,
    submitting,
    addSalesLog,
    updateSalesLogs,
    clearSalesLogs,
    setLoadingState,
    setSubmittingState,
    getTotalSales,
    getTotalRevenue,
    getSalesByShift,
  };
} 