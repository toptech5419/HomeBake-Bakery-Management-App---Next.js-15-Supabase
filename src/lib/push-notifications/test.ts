/**
 * Test function to manually trigger push notifications
 * Use this to test the push notification flow during development
 */

export async function testPushNotificationFlow() {
  try {
    console.log('🧪 Testing push notification flow...');
    
    const testNotification = {
      activity_type: 'sale',
      user_id: 'test-user-id',
      user_name: 'Test Sales Rep',
      user_role: 'sales_rep',
      message: 'Recorded sale: 2x Whole Wheat Bread',
      metadata: {
        bread_type: 'Whole Wheat Bread',
        quantity: 2,
        revenue: 1000
      }
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/push-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testNotification)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test push notification sent successfully:', result);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Test push notification failed:', response.status, error);
      throw new Error(`Push notification test failed: ${error}`);
    }
  } catch (error) {
    console.error('💥 Test push notification error:', error);
    throw error;
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testPushNotifications = testPushNotificationFlow;
  console.log('🧪 Push notification test function available: testPushNotifications()');
}