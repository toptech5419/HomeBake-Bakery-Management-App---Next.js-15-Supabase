'use server';

import { createServer } from '@/lib/supabase/server';
import { triggerPushNotification } from '@/lib/push-notifications/server';
import { withRetry } from '@/lib/push-notifications/monitoring';

export interface ActivityData {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  shift?: 'morning' | 'night';
  message: string;
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: unknown;
  };
}

export interface Activity extends ActivityData {
  id: string;
  created_at: string;
}

/**
 * Log a new activity to the activities table (server-side)
 */
async function logActivity(data: ActivityData): Promise<void> {
  try {
    console.log('🏃‍♂️ logActivity called with data:', data);
    
    const supabase = await createServer();
    console.log('✅ Supabase server client created');
    
    const activityRecord = {
      user_id: data.user_id,
      user_name: data.user_name,
      user_role: data.user_role,
      activity_type: data.activity_type,
      shift: data.shift,
      message: data.message,
      metadata: data.metadata || {}
    };
    
    console.log('📝 Inserting activity record:', activityRecord);
    
    const { data: insertResult, error } = await supabase
      .from('activities')
      .insert(activityRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging activity:', error);
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      throw error;
    }
    
    console.log('✅ Activity logged successfully:', insertResult);
    
    // Trigger push notification to owners with retry logic (async, don't await)
    withRetry(
      () => triggerPushNotification({
        activity_type: data.activity_type,
        user_id: data.user_id,
        user_name: data.user_name,
        user_role: data.user_role,
        message: data.message,
        metadata: data.metadata
      }),
      {
        maxAttempts: 3,
        baseDelay: 1000,
        exponentialBackoff: true
      },
      {
        activity_type: data.activity_type,
        user_name: data.user_name,
        message: data.message
      }
    ).catch(error => {
      console.error('🔔 Push notification failed after retries (non-blocking):', error);
    });
    
  } catch (error) {
    console.error('💥 Failed to log activity with exception:', error);
    // Don't throw error to prevent breaking main operations
  }
}

/**
 * Log when a user logs out
 */
export async function logLogoutActivity(data: {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    activity_type: 'end_shift', // Using 'end_shift' as closest to logout
    message: `${data.user_name} logged out`
  });
}

/**
 * Log when a sales rep records a sale
 */
export async function logSaleActivity(data: {
  user_id: string;
  user_name: string;
  shift: 'morning' | 'night';
  bread_type: string;
  quantity: number;
  revenue: number;
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: 'sales_rep',
    activity_type: 'sale',
    shift: data.shift,
    message: `Recorded sale: ${data.quantity}x ${data.bread_type}`,
    metadata: {
      bread_type: data.bread_type,
      quantity: data.quantity,
      revenue: data.revenue
    }
  });
}

/**
 * Log when a manager records a batch
 */
export async function logBatchActivity(data: {
  user_id: string;
  user_name: string;
  shift: 'morning' | 'night';
  bread_type: string;
  quantity: number;
  batch_number: string;
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: 'manager',
    activity_type: 'batch',
    shift: data.shift,
    message: `Created batch: ${data.quantity}x ${data.bread_type}`,
    metadata: {
      bread_type: data.bread_type,
      quantity: data.quantity,
      batch_number: data.batch_number
    }
  });
}

/**
 * Log when a user generates a report
 */
export async function logReportActivity(data: {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
  shift: 'morning' | 'night';
  report_type: string;
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    activity_type: 'report',
    shift: data.shift,
    message: `Generated ${data.report_type} report for ${data.shift} shift`,
    metadata: {
      report_type: data.report_type
    }
  });
}

/**
 * Log when a user logs in
 */
export async function logLoginActivity(data: {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    activity_type: 'login',
    message: `${data.user_name} logged in`
  });
}

/**
 * Log when a user ends their shift
 */
export async function logEndShiftActivity(data: {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
  shift: 'morning' | 'night';
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    activity_type: 'end_shift',
    shift: data.shift,
    message: `${data.user_name} ended ${data.shift} shift`
  });
}

/**
 * Log when a new user account is created
 */
export async function logAccountCreatedActivity(data: {
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
}): Promise<void> {
  await logActivity({
    user_id: data.user_id,
    user_name: data.user_name,
    user_role: data.user_role,
    activity_type: 'created',
    message: `New ${data.user_role} account created: ${data.user_name}`
  });
}