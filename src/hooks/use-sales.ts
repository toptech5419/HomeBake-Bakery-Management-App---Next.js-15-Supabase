"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { SalesLog, SalesFormData } from '@/types';
import { createSalesLog } from '@/lib/sales/actions';

export function useSales() {
  const [salesLogs, setSalesLogs] = useState<SalesLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSalesLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_logs')
        .select(`
          *,
          bread_types (
            name,
            unit_price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSalesLogs(data || []);
    } catch (error) {
      console.error('Error fetching sales logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitSales = useCallback(async (formData: SalesFormData) => {
    setSubmitting(true);
    try {
      await createSalesLog(formData);
      await fetchSalesLogs(); // Refresh the list
    } catch (error) {
      console.error('Error submitting sales:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [fetchSalesLogs]);

  return {
    salesLogs,
    loading,
    submitting,
    fetchSalesLogs,
    submitSales,
  };
} 