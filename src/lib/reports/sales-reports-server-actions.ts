'use server'

import { createServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SalesDataItem {
  breadType?: string
  quantity?: number
  unitPrice?: number
  totalAmount?: number
  timestamp?: string
}

export interface RemainingBreadItem {
  breadType?: string
  quantity?: number
  unitPrice?: number
  totalAmount?: number
}

export interface SalesReport {
  id: string
  user_id: string
  shift: string
  report_date: string
  total_revenue: number
  total_items_sold: number
  total_remaining: number
  feedback?: string | null
  sales_data: SalesDataItem[]
  remaining_breads: RemainingBreadItem[]
  created_at: string
  updated_at: string
  // User information from JOIN
  users?: {
    name: string
    role: string
  }
}

/**
 * Fetch sales reports (from shift_reports table) - Server Action
 */
export async function getSalesReports(): Promise<SalesReport[]> {
  const supabase = await createServer()
  
  try {
    const { data: reportsData, error } = await supabase
      .from('shift_reports')
      .select(`
        *,
        users!shift_reports_user_id_fkey (
          name,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales reports:', error)
      return []
    }

    return reportsData || []
  } catch (error) {
    console.error('Error fetching sales reports:', error)
    return []
  }
}

/**
 * Get sales data for a specific user and shift
 */
export async function getSalesDataForShift(userId: string, shift: 'morning' | 'night') {
  const supabase = await createServer()
  
  try {
    // Get sales logs first
    const { data: salesData, error: salesError } = await supabase
      .from('sales_logs')
      .select('*')
      .eq('recorded_by', userId)
      .eq('shift', shift)
      .order('created_at', { ascending: false })

    if (salesError) {
      throw salesError
    }

    if (!salesData || salesData.length === 0) {
      return []
    }

    // Get bread types separately
    const { data: breadTypes, error: breadTypesError } = await supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .eq('is_active', true)

    if (breadTypesError) {
      throw breadTypesError
    }

    // Manual join - attach bread type info to sales data
    const salesWithBreadTypes = salesData.map(sale => {
      const breadType = breadTypes?.find(bt => bt.id === sale.bread_type_id)
      return {
        ...sale,
        bread_types: breadType || { id: sale.bread_type_id, name: 'Unknown', unit_price: 0 }
      }
    })

    return salesWithBreadTypes
  } catch (error) {
    console.error('Error fetching sales data:', error)
    throw error
  }
}

/**
 * Get remaining bread data for a user
 */
export async function getRemainingBreadData(userId?: string) {
  const supabase = await createServer()
  
  try {
    // Get remaining bread data first
    let query = supabase
      .from('remaining_bread')
      .select('*')
      .gt('quantity', 0)
    
    // Only filter by userId if explicitly requested (for specific use cases)
    // By default, all sales reps should see all remaining bread
    if (userId && false) { // Disabled user filtering for now
      query = query.eq('recorded_by', userId)
    }
    
    const { data: remainingData, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    if (!remainingData || remainingData.length === 0) {
      return []
    }

    // Get bread types separately
    const { data: breadTypes, error: breadTypesError } = await supabase
      .from('bread_types')
      .select('id, name, unit_price')
      .eq('is_active', true)

    if (breadTypesError) {
      throw breadTypesError
    }

    // Manual join - attach bread type info to remaining bread data
    const remainingWithBreadTypes = remainingData.map(remaining => {
      const breadType = breadTypes?.find(bt => bt.id === remaining.bread_type_id)
      return {
        ...remaining,
        bread_types: breadType || { id: remaining.bread_type_id, name: 'Unknown', unit_price: 0 }
      }
    })

    return remainingWithBreadTypes
  } catch (error) {
    console.error('Error fetching remaining bread data:', error)
    throw error
  }
}

/**
 * Get bread types for sales recording
 */
export async function getBreadTypesForSales() {
  const supabase = await createServer()
  
  try {
    const { data, error } = await supabase
      .from('bread_types')
      .select('id, name, unit_price, size')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching bread types:', error)
    throw error
  }
}

/**
 * Create or update shift report
 */
export async function createShiftReport(reportData: {
  user_id: string
  shift: 'morning' | 'night'
  total_revenue: number
  total_items_sold: number
  total_remaining: number
  feedback?: string
  sales_data: SalesDataItem[]
  remaining_breads: RemainingBreadItem[]
}) {
  const supabase = await createServer()
  
  try {
    // Get current date in Nigeria timezone  
    const nigeriaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos"}));
    const reportDate = nigeriaTime.toISOString().split('T')[0];
    
    console.log('📊 Creating shift report with data:', {
      user_id: reportData.user_id,
      shift: reportData.shift,
      report_date: reportDate,
      sales_data_count: reportData.sales_data.length,
      remaining_breads_count: reportData.remaining_breads.length
    });

    // UPSERT logic: Check if report exists for user + shift + date
    const { data: existingReport, error: checkError } = await supabase
      .from('shift_reports')
      .select('id')
      .eq('user_id', reportData.user_id)
      .eq('shift', reportData.shift)
      .eq('report_date', reportDate)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let data, error;
    
    if (existingReport) {
      // Update existing report
      const updateResult = await supabase
        .from('shift_reports')
        .update({
          total_revenue: reportData.total_revenue,
          total_items_sold: reportData.total_items_sold,
          total_remaining: reportData.total_remaining,
          feedback: reportData.feedback,
          sales_data: reportData.sales_data,
          remaining_breads: reportData.remaining_breads,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReport.id)
        .select()
        .single();
      
      data = updateResult.data;
      error = updateResult.error;
      
      console.log('📊 Shift report UPDATED:', { reportId: existingReport.id, success: !error });
    } else {
      // Insert new report
      const insertResult = await supabase
        .from('shift_reports')
        .insert([
          {
            user_id: reportData.user_id,
            shift: reportData.shift,
            report_date: reportDate,
            total_revenue: reportData.total_revenue,
            total_items_sold: reportData.total_items_sold,
            total_remaining: reportData.total_remaining,
            feedback: reportData.feedback,
            sales_data: reportData.sales_data,
            remaining_breads: reportData.remaining_breads
          }
        ])
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
      
      console.log('📊 Shift report INSERTED:', { reportId: data?.id, success: !error });
    }

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating shift report:', error)
    throw error
  }
}