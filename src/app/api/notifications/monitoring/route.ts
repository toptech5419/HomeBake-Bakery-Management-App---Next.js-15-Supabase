import { NextRequest, NextResponse } from 'next/server';
import { 
  getNotificationMetrics, 
  getFailedAttempts, 
  performHealthCheck,
  cleanupOldAttempts
} from '@/lib/push-notifications/monitoring';

/**
 * Get comprehensive push notification monitoring data
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'metrics';
    
    switch (action) {
      case 'metrics':
        const metrics = await getNotificationMetrics();
        return NextResponse.json({
          service: 'push-notification-monitoring',
          timestamp: new Date().toISOString(),
          metrics
        });
        
      case 'failed':
        const failedAttempts = await getFailedAttempts();
        return NextResponse.json({
          service: 'push-notification-monitoring',
          timestamp: new Date().toISOString(),
          failed_attempts: failedAttempts.slice(0, 50), // Limit to last 50
          total_failed: failedAttempts.length
        });
        
      case 'health':
        const healthCheck = await performHealthCheck();
        return NextResponse.json({
          service: 'push-notification-monitoring',
          timestamp: new Date().toISOString(),
          ...healthCheck
        });
        
      case 'cleanup':
        const hoursParam = url.searchParams.get('hours');
        const hours = hoursParam ? parseInt(hoursParam) : 24;
        const cleaned = await cleanupOldAttempts(hours);
        
        return NextResponse.json({
          service: 'push-notification-monitoring',
          timestamp: new Date().toISOString(),
          action: 'cleanup',
          cleaned_attempts: cleaned,
          hours_threshold: hours
        });
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['metrics', 'failed', 'health', 'cleanup']
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('❌ Monitoring API error:', error);
    
    return NextResponse.json({
      error: 'Monitoring service error',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Manual notification test endpoint (development only)
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Test endpoint not available in production' 
    }, { status: 404 });
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    const testType = body.test_type || 'basic';
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const pushApiUrl = `${baseUrl}/api/notifications/push`;
    
    const testData = {
      activity_type: 'sale',
      user_name: `Test User ${Date.now()}`,
      message: `Test notification (${testType}) - ${new Date().toLocaleString()}`,
      metadata: {
        test: true,
        test_type: testType,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('🧪 Sending test notification:', testData);
    
    const response = await fetch(pushApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      service: 'push-notification-test',
      test_data: testData,
      api_response: {
        status: response.status,
        ok: response.ok,
        data: result
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}