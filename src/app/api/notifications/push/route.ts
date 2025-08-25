import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

interface PushNotificationRequest {
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  user_name: string;
  message: string;
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface OwnerWithPreferences {
  id: string;
  name: string;
  push_notification_preferences: {
    enabled: boolean;
    endpoint: string | null;
    p256dh_key: string | null;
    auth_key: string | null;
  }[];
}

/**
 * Get the status of push notification service
 */
export async function GET() {
  const isConfigured = !!(
    process.env.VAPID_PUBLIC_KEY && 
    process.env.VAPID_PRIVATE_KEY
  );

  return NextResponse.json({ 
    service: 'HomeBake Push Notifications API',
    status: 'online',
    configured: isConfigured,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send push notifications to owners
 */
export async function POST(request: NextRequest) {
  try {
    // Check VAPID configuration early
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublic || !vapidPrivate) {
      console.warn('Push notifications disabled: VAPID keys not configured');
      return NextResponse.json({ 
        success: false,
        error: 'Push notification service unavailable',
        message: 'Service not configured in this environment'
      }, { status: 503 });
    }

    // Dynamically import and configure web-push only when needed
    const webpush = await import('web-push');
    
    try {
      webpush.setVapidDetails(
        'mailto:admin@homebake.app',
        vapidPublic,
        vapidPrivate
      );
    } catch (vapidError) {
      console.error('VAPID configuration failed:', vapidError);
      return NextResponse.json({ 
        success: false,
        error: 'Push notification service configuration error',
        message: 'Invalid VAPID keys'
      }, { status: 500 });
    }

    // Enhanced authentication: Support both user sessions and service role tokens
    const supabase = await createServer();
    const authHeader = request.headers.get('Authorization');
    
    let isServiceCall = false;
    
    // Check for service role authentication (server-to-server calls)
    if (authHeader?.startsWith('Bearer ') && authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')) {
      isServiceCall = true;
      console.log('📡 Service-to-service push notification request');
    } else {
      // Regular user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ 
          success: false,
          error: 'Unauthorized: Valid session or service token required' 
        }, { status: 401 });
      }
    }

    // Validate request body
    let body: PushNotificationRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request body' 
      }, { status: 400 });
    }

    const { activity_type, user_name, message, metadata } = body;

    if (!activity_type || !user_name || !message) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: activity_type, user_name, message' 
      }, { status: 400 });
    }

    // Get owners with push notifications enabled using the same reliable approach as the working endpoint
    // First get all enabled push notification subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_notification_preferences')
      .select(`
        user_id,
        endpoint,
        p256dh_key,
        auth_key
      `)
      .eq('enabled', true)
      .not('endpoint', 'is', null);

    if (subscriptionError) {
      console.error('❌ Failed to fetch subscriptions:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: subscriptionError.message }, 
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No subscriptions to notify',
        sent: 0 
      });
    }

    // Filter subscriptions to only include owners by checking profiles table
    const userIds = subscriptions.map(sub => sub.user_id);
    const { data: ownerProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds)
      .eq('role', 'owner');

    if (profileError) {
      console.error('❌ Failed to fetch owner profiles:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch owner profiles', details: profileError.message }, 
        { status: 500 }
      );
    }

    const ownerIds = new Set((ownerProfiles || []).map(profile => profile.id));
    const ownerSubscriptions = subscriptions.filter(sub => ownerIds.has(sub.user_id));

    if (ownerSubscriptions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No owner subscriptions to notify',
        sent: 0 
      });
    }

    const ownersError = null; // No error since we got subscriptions successfully
    const owners = ownerSubscriptions; // Use the filtered subscriptions

    // All filtering and validation is already done above
    const validOwners = owners; // owners is already the filtered ownerSubscriptions

    // Prepare notification payload
    const payload = {
      title: `HomeBake ${getActivityTitle(activity_type)}`,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        activity_type,
        user_name,
        metadata: metadata || {},
        url: '/dashboard/owner',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Dashboard'
        }
      ],
      requireInteraction: false,
      silent: false
    };

    // Send notifications with proper error handling
    const results = await Promise.allSettled(
      validOwners.map(async (subscription): Promise<{ success: boolean; user: string; error?: string }> => {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint!,
          keys: {
            p256dh: subscription.p256dh_key!,
            auth: subscription.auth_key!
          }
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: 'normal'
            }
          );

          return { success: true, user: subscription.user_id };
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number; message?: string; };
          console.error(`Push notification failed for user ${subscription.user_id}:`, webPushError.message);
          
          // Clean up invalid subscriptions
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404 || webPushError.statusCode === 403) {
            await supabase
              .from('push_notification_preferences')
              .update({
                enabled: false,
                endpoint: null,
                p256dh_key: null,
                auth_key: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', subscription.user_id);
          }

          return { 
            success: false, 
            user: subscription.user_id, 
            error: webPushError.message || 'Unknown error' 
          };
        }
      })
    );

    // Calculate results with detailed logging
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;
    const failedResults = results.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );

    // Log detailed results for monitoring
    console.log(`📊 Push notification results:`, {
      activity: activity_type,
      user: user_name,
      sent: successful,
      failed: failed,
      total: validOwners.length,
      serviceCall: isServiceCall
    });
    
    // Log failures for debugging
    if (failedResults.length > 0) {
      console.warn('❌ Failed notifications:', failedResults.map(result => {
        if (result.status === 'rejected') {
          return { error: result.reason };
        } else if (result.status === 'fulfilled' && !result.value.success) {
          return { user: result.value.user, error: result.value.error };
        }
        return null;
      }).filter(Boolean));
    }

    return NextResponse.json({ 
      success: true,
      message: 'Push notifications processed',
      sent: successful,
      failed: failed,
      total: validOwners.length,
      details: isServiceCall ? 'Server-side notification trigger' : 'User-initiated notification'
    });

  } catch (error) {
    console.error('Push notification service error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: 'Push notification service encountered an unexpected error'
    }, { status: 500 });
  }
}

/**
 * Get human-readable title for activity type
 */
function getActivityTitle(activityType: string): string {
  const titles: Record<string, string> = {
    sale: 'Sale Recorded',
    batch: 'Batch Created', 
    report: 'Report Generated',
    login: 'Staff Login',
    end_shift: 'Shift Ended',
    created: 'Account Created'
  };
  
  return titles[activityType] || 'Activity Update';
}