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
    // Validate required fields first
    if (!reportData.user_id && !reportData.userId) {
      return { success: false, error: 'Missing user_id for shift report' };
    }
    
    if (!reportData.shift) {
      return { success: false, error: 'Missing shift information' };
    }

    // Create server client with error handling
    let supabase;
    try {
      supabase = await createServer();
    } catch (serverError: any) {
      console.error('Error creating server client:', serverError);
      return { 
        success: false, 
        error: 'Failed to initialize database connection. Please try again.' 
      };
    }

    // Accept both camelCase and snake_case keys for compatibility
    const payload = {
      user_id: reportData.user_id || reportData.userId,
      shift: reportData.shift,
      report_date: reportData.report_date || new Date().toISOString().split('T')[0],
      total_revenue: reportData.total_revenue ?? reportData.totalRevenue ?? 0,
      total_items_sold: reportData.total_items_sold ?? reportData.totalItemsSold ?? 0,
      total_remaining: reportData.total_remaining ?? reportData.totalRemaining ?? 0,
      feedback: reportData.feedback || null,
      sales_data: reportData.sales_data ?? reportData.salesRecords ?? [],
      remaining_breads: reportData.remaining_breads ?? reportData.remainingBreads ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert with timeout handling
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
  } catch (error: any) {
    console.error('Error creating shift report:', error);
    
    // Handle specific network errors
    if (error.message?.includes('fetch failed') || 
        error.message?.includes('network') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    // Handle timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shift report',
    };
  }
}