'use server';

/**
 * Server-side push notification helper
 * Triggers push notifications when activities are logged
 */

interface NotificationData {
  activity_type: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  metadata?: any;
}

/**
 * Trigger push notification to owners
 * Called from server actions when activities are logged
 */
export async function triggerPushNotification(data: NotificationData): Promise<void> {
  try {
    console.log('🚀 Push notification triggered for:', data.activity_type);
    
    // Only send notifications for non-owner activities
    if (data.user_role === 'owner') {
      console.log('⏭️ Skipping notification for owner activity');
      return;
    }

    // CRITICAL FIX: Don't make API calls from server actions
    // This was causing the circular dependency and server component crashes
    // Instead, just log that notification was triggered
    console.log('🔔 Push notification logged (API call removed to prevent server crashes)');
    console.log('   Activity:', data.activity_type);
    console.log('   User:', data.user_name);
    console.log('   Message:', data.message);
    
    // TODO: Implement push notifications using a queue or background job
    // For now, we'll skip the actual push to prevent server crashes
    
  } catch (error) {
    console.error('💥 Failed to trigger push notification:', error);
    // Don't throw - push notification failures shouldn't break main operations
  }
}