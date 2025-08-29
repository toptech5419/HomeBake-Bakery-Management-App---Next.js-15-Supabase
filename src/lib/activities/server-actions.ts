'use server'

import { createServer } from '@/lib/supabase/server'
import { Activity } from './activity-service'

/**
 * Get recent activities with role-based filtering (Server Action)
 */
export async function getRecentActivities(limit: number = 50): Promise<Activity[]> {
  const supabase = await createServer()
  
  try {
    // Get current user and role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return []
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userProfile?.role || 'sales_rep'
    
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    let query = supabase
      .from('activities')
      .select('*')
      .gte('created_at', threeDaysAgo.toISOString())

    // Role-based filtering: Manager isolation, Owner/Sales Rep see all
    if (userRole === 'manager') {
      query = query.eq('user_id', user.id)
    }
    // Owner and sales_rep see all activities (no filter)

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching activities:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

/**
 * Log a new activity to the activities table (Server Action)
 */
export async function logActivity(data: {
  user_id: string
  user_name: string
  user_role: 'manager' | 'sales_rep'
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created'
  shift?: 'morning' | 'night'
  message: string
  metadata?: any
}): Promise<void> {
  const supabase = await createServer()
  
  try {
    const { error } = await supabase
      .from('activities')
      .insert([{
        user_id: data.user_id,
        user_name: data.user_name,
        user_role: data.user_role,
        activity_type: data.activity_type,
        shift: data.shift,
        message: data.message,
        metadata: data.metadata || {}
      }])

    if (error) {
      console.error('Error logging activity:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw error to prevent breaking main operations
  }
}

/**
 * Clean up activities older than 3 days (Server Action)
 */
export async function cleanupOldActivities(): Promise<void> {
  const supabase = await createServer()
  
  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const { error } = await supabase
      .from('activities')
      .delete()
      .lt('created_at', threeDaysAgo.toISOString())

    if (error) {
      console.error('Error cleaning up old activities:', error)
      throw error
    }
  } catch (error) {
    console.error('Error cleaning up old activities:', error)
  }
}