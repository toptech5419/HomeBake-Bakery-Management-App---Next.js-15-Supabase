import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint for real-time activity-triggered notifications
 * This endpoint can be called by Supabase database functions or external services
 * to trigger push notifications based on database changes
 */

interface WebhookActivityData {
  table: string;
  record: {
    id: string;
    user_id: string;
    user_name: string;
    user_role: 'manager' | 'sales_rep';
    activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
    shift?: 'morning' | 'night';
    message: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  };
  type: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface WebhookResponse {
  success: boolean;
  message: string;
  processed?: boolean;
  error?: string;
}

/**
 * Handle incoming webhook for activity-based notifications
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
  try {
    console.log('🪝 Activity notification webhook triggered');
    
    // Validate webhook signature or token if needed
    const webhookToken = request.headers.get('x-webhook-token');
    const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;
    
    if (expectedToken && webhookToken !== expectedToken) {
      console.warn('❌ Invalid webhook token');
      return NextResponse.json({
        success: false,
        message: 'Invalid webhook token'
      }, { status: 401 });
    }
    
    // Parse webhook payload
    let webhookData: WebhookActivityData;
    try {
      webhookData = await request.json();
    } catch (parseError) {
      console.error('❌ Invalid webhook payload:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid webhook payload'
      }, { status: 400 });
    }
    
    // Validate required fields
    if (!webhookData.record || !webhookData.record.user_name || !webhookData.record.activity_type) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields in webhook data'
      }, { status: 400 });
    }
    
    const { record, type } = webhookData;
    
    // Only process INSERT events (new activities)
    if (type !== 'INSERT') {
      console.log(`⏭️ Skipping ${type} event for activity notifications`);
      return NextResponse.json({
        success: true,
        message: `Ignored ${type} event`,
        processed: false
      });
    }
    
    // Skip owner activities (note: webhook should only receive manager/sales_rep activities)
    if (record.user_role === 'owner' as any) {
      console.log('⏭️ Skipping notification for owner activity');
      return NextResponse.json({
        success: true,
        message: 'Skipped owner activity',
        processed: false
      });
    }
    
    console.log('📬 Processing activity notification:', {
      activity: record.activity_type,
      user: record.user_name,
      role: record.user_role
    });
    
    // Trigger push notification via internal API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const pushApiUrl = `${baseUrl}/api/notifications/push`;
    
    try {
      const pushResponse = await fetch(pushApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          activity_type: record.activity_type,
          user_name: record.user_name,
          message: record.message,
          metadata: record.metadata || {}
        })
      });
      
      if (pushResponse.ok) {
        const pushResult = await pushResponse.json();
        console.log('✅ Webhook notification sent successfully:', {
          sent: pushResult.sent || 0,
          failed: pushResult.failed || 0
        });
        
        return NextResponse.json({
          success: true,
          message: 'Activity notification processed successfully',
          processed: true
        });
      } else {
        const errorText = await pushResponse.text().catch(() => 'Unknown error');
        console.error(`❌ Push notification API failed: ${pushResponse.status} - ${errorText}`);
        
        return NextResponse.json({
          success: false,
          message: 'Push notification failed',
          error: `API returned ${pushResponse.status}`
        }, { status: 500 });
      }
      
    } catch (fetchError: any) {
      console.error('❌ Failed to call push notification API:', fetchError.message);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to trigger push notification',
        error: fetchError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Webhook processing failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Health check for webhook endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'activity-notifications-webhook',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: 'POST /api/webhooks/activity-notifications',
      health: 'GET /api/webhooks/activity-notifications'
    }
  });
}

/**
 * Test webhook endpoint for development
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint not available in production' }, { status: 404 });
  }
  
  const testData: WebhookActivityData = {
    table: 'activities',
    type: 'INSERT',
    record: {
      id: `test-${Date.now()}`,
      user_id: 'test-user-id',
      user_name: 'Test User',
      user_role: 'sales_rep',
      activity_type: 'sale',
      shift: 'morning',
      message: 'Test sale: 5x White Bread',
      metadata: { bread_type: 'White Bread', quantity: 5, revenue: 250 },
      created_at: new Date().toISOString()
    }
  };
  
  // Process test webhook
  const testResponse = await POST(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  }) as NextRequest);
  
  return testResponse;
}