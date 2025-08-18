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
 * Get staff online count using recent login activities (Server Action)
 * Considers staff "online" if they have login activity in the last 4 hours
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

    // Get recent login activities (within the last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    const { data: recentLoginActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('user_id')
      .eq('activity_type', 'login')
      .gte('created_at', fourHoursAgo);

    if (activitiesError) throw activitiesError;

    const totalStaff = allStaff?.length || 0;
    
    // Get unique user IDs from recent login activities
    const uniqueOnlineUsers = new Set(
      recentLoginActivities?.map(activity => activity.user_id) || []
    );
    
    const onlineStaff = uniqueOnlineUsers.size;

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
    // Use available_stock table (simplified approach - RPC functions may not exist)
    // Direct query to available_stock table for low stock items
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
      .select('*')
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .order('created_at', { ascending: false });

    if (salesError) throw salesError;

    // Fetch remaining bread data - ALL SALES REPS should see remaining bread
    const { data: remainingBreadData, error: remainingBreadError } = await supabase
      .from('remaining_bread')
      .select('*')
      .gt('quantity', 0);

    if (remainingBreadError) throw remainingBreadError;

    // Get bread types separately for manual join
    const { data: breadTypes, error: breadTypesError } = await supabase
      .from('bread_types')
      .select('id, name, unit_price');
    
    if (breadTypesError) throw breadTypesError;

    // Manual join - attach bread type info to sales and remaining bread data
    const salesWithBreadTypes = salesData?.map(sale => {
      const breadType = breadTypes?.find(bt => bt.id === sale.bread_type_id);
      return {
        ...sale,
        bread_types: breadType || { id: sale.bread_type_id, name: 'Unknown', unit_price: 0 }
      };
    });

    const remainingWithBreadTypes = remainingBreadData?.map(remaining => {
      const breadType = breadTypes?.find(bt => bt.id === remaining.bread_type_id);
      return {
        ...remaining,
        bread_types: breadType || { id: remaining.bread_type_id, name: 'Unknown', unit_price: 0 }
      };
    });

    // Calculate metrics
    const todaySales = salesData?.reduce((sum, sale) => {
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      return sum + amount;
    }, 0) || 0;

    const transactions = salesData?.length || 0;
    const totalUnitsSold = salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;

    // Calculate total monetary value of remaining bread using manually joined data
    const totalRemainingMonetaryValue = remainingWithBreadTypes?.reduce((sum, item) => {
      const unitPrice = item.unit_price || item.bread_types?.unit_price || 0;
      return sum + (item.quantity * unitPrice);
    }, 0) || 0;

    // Calculate top products using manually joined sales data
    const productSales = new Map();
    salesWithBreadTypes?.forEach((sale) => {
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

    // Format recent sales using manually joined data
    const recentSales = salesWithBreadTypes?.slice(0, 3).map((sale) => ({
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