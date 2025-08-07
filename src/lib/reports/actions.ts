'use server';

import { getReportData, getShiftDetails, getBreadTypes, ReportFilters } from './queries';
import { revalidatePath } from 'next/cache';
import { createServer } from '@/lib/supabase/server';
import { logReportActivity } from '@/lib/activities/server-activity-service';

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

    // Check for existing report before inserting
    const { data: existingReport, error: checkError } = await supabase
      .from('shift_reports')
      .select('id, created_at, updated_at')
      .eq('user_id', payload.user_id)
      .eq('shift', payload.shift)
      .eq('report_date', payload.report_date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - that's expected if no existing report
      console.error('Error checking for existing report:', checkError);
      return { success: false, error: 'Failed to check for existing report' };
    }

    if (existingReport) {
      // Report already exists - update it instead
      const { data, error: updateError } = await supabase
        .from('shift_reports')
        .update({
          total_revenue: payload.total_revenue,
          total_items_sold: payload.total_items_sold,
          total_remaining: payload.total_remaining,
          feedback: payload.feedback,
          sales_data: payload.sales_data,
          remaining_breads: payload.remaining_breads,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing shift report:', updateError);
        return { success: false, error: updateError.message };
      }

      // Log activity for report update
      await logReportActivityHelper(supabase, payload.user_id, payload.shift as 'morning' | 'night', 'update');

      return { 
        success: true, 
        data,
        message: 'Existing shift report updated successfully',
        wasUpdated: true
      };
    }

    // No existing report found - insert new one
    const { data, error } = await supabase
      .from('shift_reports')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error inserting shift report:', error);
      
      // Handle unique constraint violation specifically
      if (error.code === '23505' && error.message.includes('shift_reports_unique_user_shift_date')) {
        return { 
          success: false, 
          error: 'A shift report already exists for this date and shift. The system will attempt to update the existing report.',
          code: 'DUPLICATE_REPORT'
        };
      }
      
      return { success: false, error: error.message };
    }

    // Log activity for new report
    await logReportActivityHelper(supabase, payload.user_id, payload.shift as 'morning' | 'night', 'create');

    return { 
      success: true, 
      data,
      message: 'New shift report created successfully',
      wasUpdated: false
    };
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

// Helper function to log report activity
async function logReportActivityHelper(supabase: Awaited<ReturnType<typeof createServer>>, userId: string, shift: 'morning' | 'night', action: 'create' | 'update') {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', userId)
      .single();

    if (userData && userData.role !== 'owner') {
      await logReportActivity({
        user_id: userId,
        user_name: userData.name,
        user_role: userData.role as 'manager' | 'sales_rep',
        shift: shift,
        report_type: `shift_report_${action}`
      });
    }
  } catch (activityError) {
    console.error('Failed to log report activity:', activityError);
  }
}