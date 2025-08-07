'use client';

import { supabase } from '@/lib/supabase/client';

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
    [key: string]: any;
  };
}

export interface Activity extends ActivityData {
  id: string;
  created_at: string;
}

class ActivityService {
  /**
   * Log a new activity to the activities table
   */
  async logActivity(data: ActivityData): Promise<void> {
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
        }]);

      if (error) {
        console.error('Error logging activity:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to prevent breaking main operations
    }
  }

  /**
   * Get recent activities (last 3 days) for owner dashboard
   */
  async getRecentActivities(limit: number = 50): Promise<Activity[]> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Clean up activities older than 3 days (run periodically)
   */
  async cleanupOldActivities(): Promise<void> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { error } = await supabase
        .from('activities')
        .delete()
        .lt('created_at', threeDaysAgo.toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
    }
  }

  // Helper methods for specific activity types
  
  /**
   * Log when a sales rep records a sale
   */
  async logSaleActivity(data: {
    user_id: string;
    user_name: string;
    shift: 'morning' | 'night';
    bread_type: string;
    quantity: number;
    revenue: number;
  }): Promise<void> {
    await this.logActivity({
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
  async logBatchActivity(data: {
    user_id: string;
    user_name: string;
    shift: 'morning' | 'night';
    bread_type: string;
    quantity: number;
    batch_number: string;
  }): Promise<void> {
    await this.logActivity({
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
  async logReportActivity(data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
    shift: 'morning' | 'night';
    report_type: string;
  }): Promise<void> {
    await this.logActivity({
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
  async logLoginActivity(data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
  }): Promise<void> {
    await this.logActivity({
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
  async logEndShiftActivity(data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
    shift: 'morning' | 'night';
  }): Promise<void> {
    await this.logActivity({
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
  async logAccountCreatedActivity(data: {
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
  }): Promise<void> {
    await this.logActivity({
      user_id: data.user_id,
      user_name: data.user_name,
      user_role: data.user_role,
      activity_type: 'created',
      message: `New ${data.user_role} account created: ${data.user_name}`
    });
  }
}

export const activityService = new ActivityService();