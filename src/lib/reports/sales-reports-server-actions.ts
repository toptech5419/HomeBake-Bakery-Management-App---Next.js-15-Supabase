'use server'

import { createServer } from '@/lib/supabase/server'

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