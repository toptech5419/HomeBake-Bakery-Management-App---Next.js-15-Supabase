'use server'

import { createServer } from '@/lib/supabase/server'

/**
 * Get current Lagos date string (YYYY-MM-DD)
 * Helper function - not a server action
 */
const getLagosDateString = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
};

/**
 * Get today's revenue using Lagos timezone (Server Action)
 * Uses sales_logs as primary source, shift_reports as backup
 */
export async function getTodayRevenue(): Promise<number> {
  const supabase = await createServer();
  const lagosDate = getLagosDateString();
  
  try {
    // First try sales_logs for today (Lagos time)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price, discount')
      .gte('created_at', `${lagosDate}T00:00:00`)
      .lte('created_at', `${lagosDate}T23:59:59.999`);

    if (salesError) throw salesError;

    if (salesData && salesData.length > 0) {
      return salesData.reduce((sum, sale) => {
        const saleAmount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
        return sum + saleAmount;
      }, 0);
    }

    // Fallback to shift_reports for today
    const { data: reportsData, error: reportsError } = await supabase
      .from('shift_reports')
      .select('total_revenue')
      .eq('report_date', lagosDate);

    if (reportsError) throw reportsError;

    if (reportsData && reportsData.length > 0) {
      return reportsData.reduce((sum, report) => sum + (report.total_revenue || 0), 0);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching today revenue:', error);
    return 0;
  }
}

/**
 * Get today's batch count using Lagos timezone (Server Action)
 * Uses batches as primary source, all_batches as backup
 */
export async function getTodayBatchCount(): Promise<number> {
  const supabase = await createServer();
  const lagosDate = getLagosDateString();
  
  try {
    // First try batches table for today (Lagos time)
    const { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select('id')
      .gte('created_at', `${lagosDate}T00:00:00`)
      .lte('created_at', `${lagosDate}T23:59:59.999`);

    if (batchesError) throw batchesError;

    if (batchesData && batchesData.length > 0) {
      return batchesData.length;
    }

    // Fallback to all_batches for today
    const { data: allBatchesData, error: allBatchesError } = await supabase
      .from('all_batches')
      .select('id')
      .gte('created_at', `${lagosDate}T00:00:00`)
      .lte('created_at', `${lagosDate}T23:59:59.999`);

    if (allBatchesError) throw allBatchesError;

    return allBatchesData?.length || 0;
  } catch (error) {
    console.error('Error fetching today batch count:', error);
    return 0;
  }
}

/**
 * Get staff online count using sessions table (Server Action)
 */
export async function getStaffOnlineCount(): Promise<{ online: number; total: number }> {
  const supabase = await createServer();
  
  try {
    // Get total staff count (excluding owners)
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('id')
      .neq('role', 'owner')
      .eq('is_active', true);

    if (staffError) throw staffError;

    // Get active sessions count
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('user_id')
      .gt('expires_at', new Date().toISOString());

    if (sessionsError) throw sessionsError;

    const totalStaff = allStaff?.length || 0;
    const onlineStaff = activeSessions?.length || 0;

    return {
      online: Math.min(onlineStaff, totalStaff), // Cap at total staff
      total: totalStaff
    };
  } catch (error) {
    console.error('Error fetching staff online count:', error);
    return { online: 0, total: 0 };
  }
}

/**
 * Get low stock count from real-time tracking system (Server Action)
 * Uses the new daily_low_stock_counts table with automatic triggers
 * Falls back to available_stock table if real-time tracking is unavailable
 */
export async function getLowStockCount(): Promise<number> {
  const supabase = await createServer();
  const lagosDate = getLagosDateString();
  
  try {
    // Primary: Try to get from real-time daily tracking system
    const { data: dailyCount, error: dailyError } = await supabase.rpc('get_daily_low_stock_count', {
      p_date: lagosDate
    });

    // If real-time tracking works and has data, use it
    if (!dailyError && dailyCount !== null && dailyCount !== undefined) {
      return dailyCount;
    }

    // Secondary: Try manual refresh if no data exists for today
    console.log('No daily data found, attempting auto-refresh...');
    const { error: refreshError } = await supabase.rpc('auto_update_low_stock_counts');
    
    if (!refreshError) {
      // Try getting the data again after refresh
      const { data: refreshedCount } = await supabase.rpc('get_daily_low_stock_count', {
        p_date: lagosDate
      });
      
      if (refreshedCount !== null && refreshedCount !== undefined) {
        return refreshedCount;
      }
    }

    // Fallback: Use available_stock table (original logic)
    console.warn('Real-time low stock tracking unavailable, using fallback logic');
    const { data: stockData, error: stockError } = await supabase
      .from('available_stock')
      .select('quantity')
      .gt('quantity', 0)
      .lte('quantity', 5);

    if (stockError) throw stockError;

    return stockData?.length || 0;
  } catch (error) {
    console.error('Error fetching low stock count:', error);
    return 0;
  }
}

/**
 * Get all owner dashboard stats in one server action call
 */
export async function getOwnerDashboardStats() {
  try {
    const [
      todayRevenue,
      todayBatches,
      staffCounts,
      lowStockCount
    ] = await Promise.all([
      getTodayRevenue(),
      getTodayBatchCount(),
      getStaffOnlineCount(),
      getLowStockCount()
    ]);

    return {
      todayRevenue,
      todayBatches,
      staffOnline: staffCounts.online,
      staffTotal: staffCounts.total,
      lowStockCount,
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching owner dashboard stats:', error);
    throw error;
  }
}

/**
 * Get sales rep dashboard metrics for a specific user and shift (NO DATE FILTERING)
 * Used for main dashboard at /dashboard/sales
 */
export async function getSalesRepDashboardMetrics(userId: string, shift: 'morning' | 'night') {
  const supabase = await createServer();
  
  try {
    // Fetch sales data for current shift and user (NO DATE FILTERING)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        )
      `)
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    // Fetch remaining bread data
    const { data: remainingBreadData, error: remainingBreadError } = await supabase
      .from('remaining_bread')
      .select(`
        *,
        bread_types!remaining_bread_bread_type_id_fkey (
          id,
          name,
          unit_price
        )
      `)
      .eq('recorded_by', userId);

    if (remainingBreadError) throw remainingBreadError;

    // Calculate metrics
    const todaySales = salesData?.reduce((sum, sale) => {
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      return sum + amount;
    }, 0) || 0;

    const transactions = salesData?.length || 0;
    const totalUnitsSold = salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;

    // Calculate total monetary value of remaining bread
    const totalRemainingMonetaryValue = remainingBreadData?.reduce((sum, item) => {
      const unitPrice = item.unit_price || item.bread_types?.unit_price || 0;
      return sum + (item.quantity * unitPrice);
    }, 0) || 0;

    // Calculate top products
    const productSales = new Map();
    salesData?.forEach((sale) => {
      const key = sale.bread_type_id;
      const existing = productSales.get(key) || { 
        breadTypeId: key, 
        name: sale.bread_types?.name || 'Unknown', 
        quantity: 0, 
        revenue: 0 
      };
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      existing.quantity += sale.quantity;
      existing.revenue += amount;
      productSales.set(key, existing);
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Format recent sales
    const recentSales = salesData?.slice(0, 3).map((sale) => ({
      id: sale.id,
      breadType: sale.bread_types?.name || 'Unknown',
      quantity: sale.quantity,
      totalAmount: (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0),
      paymentMethod: 'cash' as const,
      timestamp: sale.created_at
    })) || [];

    return {
      todaySales,
      transactions,
      itemsSold: totalUnitsSold,
      remainingTarget: totalRemainingMonetaryValue,
      topProducts,
      recentSales
    };
  } catch (error) {
    console.error('Error fetching sales rep dashboard metrics:', error);
    throw error;
  }
}

/**
 * Get all sales for a user/shift combination (NO DATE FILTERING)
 * Used for all-sales page where historical data is needed
 */
export async function getAllSalesForShift(userId: string, shift: 'morning' | 'night') {
  const supabase = await createServer();
  
  try {
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select(`
        *,
        bread_types (
          id,
          name,
          unit_price
        ),
        recorded_by_user:users!sales_logs_recorded_by_fkey (
          name
        )
      `)
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    return salesData || [];
  } catch (error) {
    console.error('Error fetching all sales for shift:', error);
    throw error;
  }
}

/**
 * Get bread types for sales operations
 */
export async function getBreadTypesForSalesRep() {
  const supabase = await createServer();
  
  try {
    const { data, error } = await supabase
      .from('bread_types')
      .select('id, name, unit_price, size')
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching bread types:', error);
    throw error;
  }
}