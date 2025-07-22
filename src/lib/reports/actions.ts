'use server';

import { getReportData, getShiftDetails, getBreadTypes, ReportFilters } from './queries';
import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';

export async function fetchReportData(filters: ReportFilters) {
  try {
    const data = await getReportData(filters);
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching report data:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch report data' 
    };
  }
}

export async function fetchShiftDetails(shiftId: string) {
  try {
    const data = await getShiftDetails(shiftId);
    if (!data) {
      return { success: false, error: 'Shift not found' };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching shift details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch shift details' 
    };
  }
}

export async function fetchBreadTypes() {
  try {
    const data = await getBreadTypes();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bread types:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch bread types' 
    };
  }
}

export async function refreshReports() {
  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/reports/[shiftId]', 'page');
  return { success: true };
}

export async function createShiftReport(reportData: any) {
  try {
    const supabase = await createServer();
    // Accept both camelCase and snake_case keys for compatibility
    const payload = {
      user_id: reportData.user_id || reportData.userId,
      shift: reportData.shift,
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      total_revenue: reportData.total_revenue ?? reportData.totalRevenue,
      total_items_sold: reportData.total_items_sold ?? reportData.totalItemsSold,
      total_remaining: reportData.total_remaining ?? reportData.totalRemaining,
      feedback: reportData.feedback || null,
      sales_data: reportData.sales_data ?? reportData.salesRecords ?? [],
      remaining_breads: reportData.remaining_breads ?? reportData.remainingBreads ?? [],
    };
    if (!payload.user_id) {
      return { success: false, error: 'Missing user_id for shift report' };
    }
    const { data, error } = await supabase
      .from('shift_reports')
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error('Error inserting shift report:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error creating shift report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shift report',
    };
  }
}