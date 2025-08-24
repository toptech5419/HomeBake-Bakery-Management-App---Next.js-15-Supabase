'use server';

/**
 * Production-ready server-side push notification helper
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

interface NotificationResponse {
  success: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

/**
 * Production-grade push notification trigger
 * Uses non-blocking API calls with proper error handling
 */
export async function triggerPushNotification(data: NotificationData): Promise<void> {
  try {
    console.log('🚀 Push notification triggered for:', data.activity_type);
    
    // Only send notifications for non-owner activities
    if (data.user_role === 'owner') {
      console.log('⏭️ Skipping notification for owner activity');
      return;
    }

    // Production-grade solution: Use fetch to call our push notification API
    // This prevents server component crashes by using proper API architecture
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/notifications/push`;
    
    console.log('📡 Sending push notification via API:', apiUrl);
    
    // Non-blocking API call with timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          activity_type: data.activity_type,
          user_name: data.user_name,
          message: data.message,
          metadata: data.metadata || {}
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result: NotificationResponse = await response.json();
        console.log(`✅ Push notification sent successfully:`, {
          sent: result.sent || 0,
          failed: result.failed || 0,
          total: (result.sent || 0) + (result.failed || 0)
        });
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`⚠️ Push notification API returned ${response.status}:`, errorText);
      }
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.warn('⏱️ Push notification request timed out (10s)');
      } else if (fetchError.code === 'ECONNREFUSED') {
        console.warn('🔌 Push notification service unavailable (connection refused)');
      } else {
        console.warn('📡 Push notification fetch failed:', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Push notification trigger failed:', error);
    // Don't throw - push notification failures shouldn't break main operations
  }
}

/**
 * Background job pattern for processing notification queues
 * This can be enhanced with a proper job queue like Bull/BullMQ in the future
 */
export async function processNotificationQueue(): Promise<void> {
  // Future enhancement: Process queued notifications
  // This could integrate with Redis/BullMQ for enterprise-grade job processing
  console.log('📋 Notification queue processing (placeholder for future enhancement)');
}

/**
 * Health check for push notification service
 */
export async function checkPushNotificationHealth(): Promise<{
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  apiReachable: boolean;
  vapidConfigured: boolean;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const healthUrl = `${baseUrl}/api/notifications/push`;
    
    const response = await fetch(healthUrl, { method: 'GET' });
    const healthData = await response.json();
    
    return {
      service: 'push-notifications',
      status: healthData.configured ? 'healthy' : 'degraded',
      apiReachable: response.ok,
      vapidConfigured: healthData.configured || false
    };
  } catch (error) {
    return {
      service: 'push-notifications',
      status: 'unhealthy',
      apiReachable: false,
      vapidConfigured: false
    };
  }
}