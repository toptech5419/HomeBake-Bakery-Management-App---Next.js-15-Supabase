'use server'

import { createServer } from '@/lib/supabase/server'

/**
 * Get current date in YYYY-MM-DD format for Nigeria timezone (GMT+1)
 */
const getCurrentDate = () => {
  const now = new Date()
  // Adjust for Nigeria timezone (GMT+1)
  const nigeriaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000))
  return nigeriaTime.toISOString().split('T')[0]
}

/**
 * Get manager reports count for today (Server Action)
 * Counts production batches (all_batches) created today
 */
export async function getManagerReportsCount(): Promise<number> {
  const supabase = await createServer()
  const today = getCurrentDate()
  
  try {
    const { count, error } = await supabase
      .from('all_batches')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching manager reports count:', error)
    return 0
  }
}

/**
 * Get sales reports count for today (Server Action)
 * Counts shift reports created today
 */
export async function getSalesReportsCount(): Promise<number> {
  const supabase = await createServer()
  const today = getCurrentDate()
  
  try {
    const { count, error } = await supabase
      .from('shift_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching sales reports count:', error)
    return 0
  }
}

/**
 * Get both report counts at once for efficiency
 */
export async function getReportCounts(): Promise<{
  managerCount: number
  salesCount: number
  totalCount: number
}> {
  try {
    const [managerCount, salesCount] = await Promise.all([
      getManagerReportsCount(),
      getSalesReportsCount()
    ])

    return {
      managerCount: managerCount > 0 ? 1 : 0,
      salesCount: salesCount > 0 ? 1 : 0,
      totalCount: (managerCount > 0 ? 1 : 0) + (salesCount > 0 ? 1 : 0)
    }
  } catch (error) {
    console.error('Error fetching report counts:', error)
    return { managerCount: 0, salesCount: 0, totalCount: 0 }
  }
}