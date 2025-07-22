'use server';

import { createServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SalesManagementData {
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  returned?: boolean;
  leftover?: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}

export interface ProductionManagementData {
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  recorded_by: string;
}

export interface StockUpdateData {
  bread_type_id: string;
  quantity: number;
  unit_price: number;
}

// Create a new sales log entry
export async function createSalesLog(data: SalesManagementData) {
  const supabase = await createServer();
  
  try {
    const { error } = await supabase.from('sales_logs').insert({
      bread_type_id: data.bread_type_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      discount: data.discount || 0,
      returned: data.returned || false,
      leftover: data.leftover || 0,
      shift: data.shift,
      recorded_by: data.recorded_by,
    });

    if (error) {
      console.error('Error creating sales log:', error);
      throw new Error(`Failed to create sales log: ${error.message}`);
    }

    revalidatePath('/dashboard/sales-management');
    return { success: true };
  } catch (error) {
    console.error('Error in createSalesLog:', error);
    throw error;
  }
}

// Create a new production log entry
export async function createProductionLog(data: ProductionManagementData) {
  const supabase = await createServer();
  
  try {
    const { error } = await supabase.from('production_logs').insert({
      bread_type_id: data.bread_type_id,
      quantity: data.quantity,
      shift: data.shift,
      recorded_by: data.recorded_by,
    });

    if (error) {
      console.error('Error creating production log:', error);
      throw new Error(`Failed to create production log: ${error.message}`);
    }

    revalidatePath('/dashboard/sales-management');
    return { success: true };
  } catch (error) {
    console.error('Error in createProductionLog:', error);
    throw error;
  }
}

// Get available stock for all bread types
export async function getAvailableStock() {
  const supabase = await createServer();
  
  try {
    const { data, error } = await supabase
      .from('available_stock')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .order('bread_type_name');

    if (error) {
      console.error('Error fetching available stock:', error);
      throw new Error(`Failed to fetch available stock: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAvailableStock:', error);
    throw error;
  }
}

// Get production items for current shift
export async function getProductionItems(shift: 'morning' | 'night') {
  const supabase = await createServer();
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data, error } = await supabase
      .from('production_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('shift', shift);

    if (error) {
      console.error('Error fetching production items:', error);
      throw new Error(`Failed to fetch production items: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getProductionItems:', error);
    throw error;
  }
}

// Get sales records for current shift
export async function getSalesRecords(shift: 'morning' | 'night') {
  const supabase = await createServer();
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data, error } = await supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('shift', shift)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales records:', error);
      throw new Error(`Failed to fetch sales records: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSalesRecords:', error);
    throw error;
  }
}

// Get dashboard metrics for current shift
export async function getDashboardMetrics(shift: 'morning' | 'night') {
  const supabase = await createServer();
  
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get sales data for metrics calculation
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price, discount')
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('shift', shift);

    if (salesError) {
      console.error('Error fetching sales data for metrics:', salesError);
      throw new Error(`Failed to fetch sales data: ${salesError.message}`);
    }

    // Calculate metrics
    const todaySales = (salesData || []).reduce((sum, sale) => {
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      return sum + amount;
    }, 0);

    const transactions = salesData?.length || 0;
    const itemsSold = (salesData || []).reduce((sum, sale) => sum + sale.quantity, 0);

    return {
      todaySales,
      transactions,
      itemsSold
    };
  } catch (error) {
    console.error('Error in getDashboardMetrics:', error);
    throw error;
  }
}

// Update available stock manually (for managers/owners)
export async function updateAvailableStock(data: StockUpdateData) {
  const supabase = await createServer();
  
  try {
    const { error } = await supabase
      .from('available_stock')
      .upsert({
        bread_type_id: data.bread_type_id,
        quantity: data.quantity,
        unit_price: data.unit_price,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating available stock:', error);
      throw new Error(`Failed to update available stock: ${error.message}`);
    }

    revalidatePath('/dashboard/sales-management');
    return { success: true };
  } catch (error) {
    console.error('Error in updateAvailableStock:', error);
    throw error;
  }
}

// Get sales summary for reporting
export async function getSalesSummary(shift: 'morning' | 'night', date?: string) {
  const supabase = await createServer();
  
  try {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const { data, error } = await supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('shift', shift)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales summary:', error);
      throw new Error(`Failed to fetch sales summary: ${error.message}`);
    }

    // Calculate summary statistics
    const totalRevenue = (data || []).reduce((sum, sale) => {
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      return sum + amount;
    }, 0);

    const totalItems = (data || []).reduce((sum, sale) => sum + sale.quantity, 0);
    const uniqueProducts = new Set((data || []).map(sale => sale.bread_type_id)).size;

    return {
      sales: data || [],
      summary: {
        totalRevenue,
        totalItems,
        uniqueProducts,
        transactionCount: data?.length || 0
      }
    };
  } catch (error) {
    console.error('Error in getSalesSummary:', error);
    throw error;
  }
}

// Bulk create sales records (for quick recording)
export async function bulkCreateSalesLogs(salesData: SalesManagementData[]) {
  const supabase = await createServer();
  
  try {
    const { error } = await supabase
      .from('sales_logs')
      .insert(salesData);

    if (error) {
      console.error('Error creating bulk sales logs:', error);
      throw new Error(`Failed to create bulk sales logs: ${error.message}`);
    }

    revalidatePath('/dashboard/sales-management');
    return { success: true };
  } catch (error) {
    console.error('Error in bulkCreateSalesLogs:', error);
    throw error;
  }
}

// Get real-time stock alerts
export async function getStockAlerts() {
  const supabase = await createServer();
  
  try {
    const { data, error } = await supabase
      .from('available_stock')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .lte('quantity', 5)
      .order('quantity', { ascending: true });

    if (error) {
      console.error('Error fetching stock alerts:', error);
      throw new Error(`Failed to fetch stock alerts: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStockAlerts:', error);
    throw error;
  }
} 