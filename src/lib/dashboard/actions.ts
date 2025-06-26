'use server';

import { createServer } from '@/lib/supabase/server';
import { getDashboardMetrics, getShiftMetrics } from './queries';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import type { ShiftType } from '@/types';

export async function fetchDashboardData() {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const metrics = await getDashboardMetrics();
    return { success: true, data: metrics };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' 
    };
  }
}

export async function fetchShiftData(shift: ShiftType) {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const metrics = await getShiftMetrics(shift);
    return { success: true, data: metrics };
  } catch (error) {
    console.error('Error fetching shift data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch shift data' 
    };
  }
}

export async function getQuickStats() {
  try {
    const supabase = await createServer();
    const today = formatDate(new Date());

    // Get today's quick stats
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

    const produced = todayProduction?.reduce((sum, prod) => sum + (prod.quantity || 0), 0) || 0;
    const sold = todaySales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;
    const revenue = todaySales?.reduce((sum, sale) => sum + ((sale.quantity || 0) * (sale.unit_price || 0)), 0) || 0;

    return {
      success: true,
      data: {
        produced,
        sold,
        revenue: formatCurrencyNGN(revenue),
        remaining: produced - sold,
      }
    };
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quick stats',
      data: {
        produced: 0,
        sold: 0,
        revenue: formatCurrencyNGN(0),
        remaining: 0,
      }
    };
  }
}

export async function getRoleBasedMetrics(role: string) {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const metrics = await getDashboardMetrics();

    switch (role) {
      case 'owner':
        return {
          success: true,
          data: {
            totalUsers: metrics.totalUsers,
            totalBreadTypes: metrics.totalBreadTypes,
            totalRevenue: formatCurrencyNGN(metrics.totalRevenue),
            totalProduced: metrics.totalProduced,
            todayRevenue: formatCurrencyNGN(metrics.todayRevenue),
            todayProduced: metrics.todayProduced,
          }
        };

      case 'manager':
        return {
          success: true,
          data: {
            todayProduced: metrics.todayProduced,
            todaySold: metrics.todaySold,
            morningProduced: metrics.shiftMetrics.morning.produced,
            nightProduced: metrics.shiftMetrics.night.produced,
            totalRevenue: formatCurrencyNGN(metrics.todayRevenue),
          }
        };

      case 'sales_rep':
        return {
          success: true,
          data: {
            todaySold: metrics.todaySold,
            todayRevenue: formatCurrencyNGN(metrics.todayRevenue),
            morningSold: metrics.shiftMetrics.morning.sold,
            nightSold: metrics.shiftMetrics.night.sold,
            remaining: metrics.todayProduced - metrics.todaySold,
          }
        };

      default:
        return { success: false, error: 'Invalid role' };
    }
  } catch (error) {
    console.error('Error fetching role-based metrics:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch role-based metrics' 
    };
  }
}
