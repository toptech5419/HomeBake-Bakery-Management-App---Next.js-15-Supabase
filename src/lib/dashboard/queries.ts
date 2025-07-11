import { createServer } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/date';
import type { ShiftType } from '@/types';

export interface DashboardMetrics {
  totalUsers: number;
  totalBreadTypes: number;
  totalRevenue: number;
  totalProduced: number;
  totalSold: number;
  todayRevenue: number;
  todayProduced: number;
  todaySold: number;
  shiftMetrics: {
    morning: { produced: number; sold: number; revenue: number };
    night: { produced: number; sold: number; revenue: number };
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createServer();
  const today = formatDate(new Date());

  try {
    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total bread types count
    const { count: totalBreadTypes } = await supabase
      .from('bread_types')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total production count
    const { count: totalProduced } = await supabase
      .from('production_logs')
      .select('*', { count: 'exact', head: true });

    // Get total sales count and revenue
    const { data: salesData } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price')
      .eq('returned', false);

    const totalSold = salesData?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const totalRevenue = salesData?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0;

    // Get today's metrics
    const { data: todayProduction } = await supabase
      .from('production_logs')
      .select('quantity')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    const { data: todaySales } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('returned', false);

    const todayProduced = todayProduction?.reduce((sum, prod) => sum + (prod.quantity || 0), 0) || 0;
    const todaySold = todaySales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const todayRevenue = todaySales?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0;

    // Get shift-specific metrics for today
    const { data: morningProduction } = await supabase
      .from('production_logs')
      .select('quantity')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('shift', 'morning');

    const { data: nightProduction } = await supabase
      .from('production_logs')
      .select('quantity')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('shift', 'night');

    const { data: morningSales } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('shift', 'morning')
      .eq('returned', false);

    const { data: nightSales } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('shift', 'night')
      .eq('returned', false);

    const shiftMetrics = {
      morning: {
        produced: morningProduction?.reduce((sum, prod) => sum + (prod.quantity || 0), 0) || 0,
        sold: morningSales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0,
        revenue: morningSales?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0,
      },
      night: {
        produced: nightProduction?.reduce((sum, prod) => sum + (prod.quantity || 0), 0) || 0,
        sold: nightSales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0,
        revenue: nightSales?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0,
      },
    };

    return {
      totalUsers: totalUsers || 0,
      totalBreadTypes: totalBreadTypes || 0,
      totalRevenue,
      totalProduced: totalProduced || 0,
      totalSold,
      todayRevenue,
      todayProduced,
      todaySold,
      shiftMetrics,
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      totalUsers: 0,
      totalBreadTypes: 0,
      totalRevenue: 0,
      totalProduced: 0,
      totalSold: 0,
      todayRevenue: 0,
      todayProduced: 0,
      todaySold: 0,
      shiftMetrics: {
        morning: { produced: 0, sold: 0, revenue: 0 },
        night: { produced: 0, sold: 0, revenue: 0 },
      },
    };
  }
}

export async function getShiftMetrics(shift: ShiftType, date?: string) {
  const supabase = await createServer();
  const targetDate = date || formatDate(new Date());

  try {
    const { data: production } = await supabase
      .from('production_logs')
      .select('quantity')
      .gte('created_at', `${targetDate}T00:00:00`)
      .lt('created_at', `${targetDate}T23:59:59`)
      .eq('shift', shift);

    const { data: sales } = await supabase
      .from('sales_logs')
      .select('quantity, unit_price')
      .gte('created_at', `${targetDate}T00:00:00`)
      .lt('created_at', `${targetDate}T23:59:59`)
      .eq('shift', shift)
      .eq('returned', false);

    const produced = production?.reduce((sum, prod) => sum + (prod.quantity || 0), 0) || 0;
    const sold = sales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const revenue = sales?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0;

    return { produced, sold, revenue, remaining: produced - sold };
  } catch (error) {
    console.error('Error fetching shift metrics:', error);
    return { produced: 0, sold: 0, revenue: 0, remaining: 0 };
  }
}

// Get production logs for a specific date range
export async function getProductionLogs(startDate?: string, endDate?: string, shift?: ShiftType) {
  const supabase = await createServer();
  const today = formatDate(new Date());
  
  let query = supabase
    .from('production_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      ),
      users (
        id,
        name,
        role
      )
    `)
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00`);
  }
  
  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59`);
  }
  
  if (shift) {
    query = query.eq('shift', shift);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching production logs:', error);
    return [];
  }

  return data || [];
}

// Get today's sales data
export async function getTodaysSales(shift?: ShiftType) {
  const supabase = await createServer();
  const today = formatDate(new Date());
  
  let query = supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      ),
      users (
        id,
        name,
        role
      )
    `)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)
    .eq('returned', false)
    .order('created_at', { ascending: false });

  if (shift) {
    query = query.eq('shift', shift);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching today\'s sales:', error);
    return [];
  }

  return data || [];
}

export { getBreadTypes } from '@/lib/reports/queries';
