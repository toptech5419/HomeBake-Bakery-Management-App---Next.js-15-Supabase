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
}

/**
 * Fetch sales reports (from shift_reports table) - Server Action
 */
export async function getSalesReports(): Promise<SalesReport[]> {
  const supabase = await createServer()
  
  try {
    const { data: reportsData, error } = await supabase
      .from('shift_reports')
      .select('*')
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
      .order('created_at', { ascending: false })

    if (salesError) {
      throw salesError
    }

    return salesData || []
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
    let query = supabase
      .from('remaining_bread')
      .select(`
        *,
        bread_types!remaining_bread_bread_type_id_fkey (
          id,
          name,
          unit_price
        )
      `)
    
    if (userId) {
      query = query.eq('recorded_by', userId)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
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
    
    const { data, error } = await supabase
      .from('shift_reports')
      .upsert([
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
      ], {
        onConflict: 'user_id,shift,report_date'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error creating shift report:', error)
    throw error
  }
}