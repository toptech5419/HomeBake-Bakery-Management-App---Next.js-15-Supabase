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
    console.log('🚀 Triggering push notification for:', data);
    
    // Only send notifications for non-owner activities
    if (data.user_role === 'owner') {
      console.log('⏭️ Skipping notification for owner activity');
      return;
    }

    // Call the push notification API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/push-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Push notification API failed:', response.status, error);
      return;
    }

    const result = await response.json();
    console.log('✅ Push notification result:', result);
    
  } catch (error) {
    console.error('💥 Failed to trigger push notification:', error);
    // Don't throw - push notification failures shouldn't break main operations
  }
}