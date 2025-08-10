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
      .lt('created_at', `${lagosDate}T23:59:59`);

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
      .lt('created_at', `${lagosDate}T23:59:59`);

    if (batchesError) throw batchesError;

    if (batchesData && batchesData.length > 0) {
      return batchesData.length;
    }

    // Fallback to all_batches for today
    const { data: allBatchesData, error: allBatchesError } = await supabase
      .from('all_batches')
      .select('id')
      .gte('created_at', `${lagosDate}T00:00:00`)
      .lt('created_at', `${lagosDate}T23:59:59`);

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
 * Get low stock count from available_stock (Server Action)
 * Matches the logic from sales-management: items with available <= 5 and > 0
 */
export async function getLowStockCount(): Promise<number> {
  const supabase = await createServer();
  
  try {
    const { data: stockData, error } = await supabase
      .from('available_stock')
      .select('quantity')
      .gt('quantity', 0)
      .lte('quantity', 5);

    if (error) throw error;

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