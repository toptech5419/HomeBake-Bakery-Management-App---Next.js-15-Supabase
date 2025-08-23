import { NextRequest, NextResponse } from 'next/server';
import { triggerPushNotification } from '@/lib/push-notifications/server';

/**
 * Test endpoint to manually trigger push notifications
 * Usage: POST /api/test-push
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create test notification data
    const testData = {
      activity_type: body.activity_type || 'batch',
      user_id: body.user_id || 'test-user-id',
      user_name: body.user_name || 'Test Manager',
      user_role: body.user_role || 'manager', // Force non-owner role
      message: body.message || 'Test push notification from HomeBake!',
      metadata: body.metadata || {
        bread_type: 'White Bread',
        quantity: 50,
        batch_number: 'TEST-BATCH-001'
      }
    };

    console.log('🧪 Triggering test push notification:', testData);
    
    // Trigger the notification
    await triggerPushNotification(testData);
    
    return NextResponse.json({
      success: true,
      message: 'Test push notification triggered',
      data: testData
    });
    
  } catch (error: unknown) {
    const serverError = error as Error;
    console.error('❌ Test push notification failed:', serverError);
    return NextResponse.json(
      { error: 'Failed to send test notification', details: serverError.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check push notification configuration
 */
export async function GET() {
  return NextResponse.json({
    message: 'Push notification test endpoint',
    usage: 'POST with optional { user_name, message, activity_type }',
    vapid_configured: !!(process.env.NEXT_PUBLIC_VAPID_KEY && process.env.VAPID_PRIVATE_KEY)
  });
}