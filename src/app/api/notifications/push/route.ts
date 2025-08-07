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
    [key: string]: any;
  };
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
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

    const supabase = await createServer();
    
    // Authenticate request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Validate request body
    let body: PushNotificationRequest;
    try {
      body = await request.json();
    } catch (parseError) {
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

    // Get owners with push notifications enabled
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        push_notification_preferences!inner (
          enabled,
          endpoint,
          p256dh_key,
          auth_key
        )
      `)
      .eq('role', 'owner')
      .eq('is_active', true)
      .eq('push_notification_preferences.enabled', true) as {
        data: OwnerWithPreferences[] | null;
        error: any;
      };

    if (ownersError) {
      console.error('Database error fetching owners:', ownersError);
      return NextResponse.json({ 
        success: false,
        error: 'Database error' 
      }, { status: 500 });
    }

    if (!owners?.length) {
      return NextResponse.json({ 
        success: true,
        message: 'No owners with push notifications enabled',
        sent: 0,
        total: 0
      });
    }

    // Filter and validate subscriptions
    const validOwners = owners.filter(owner => {
      const prefs = owner.push_notification_preferences;
      return Array.isArray(prefs) && 
             prefs.length > 0 && 
             prefs[0]?.endpoint && 
             prefs[0]?.p256dh_key && 
             prefs[0]?.auth_key;
    });

    if (!validOwners.length) {
      return NextResponse.json({ 
        success: true,
        message: 'No valid push notification subscriptions found',
        sent: 0,
        total: owners.length
      });
    }

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
      validOwners.map(async (owner): Promise<{ success: boolean; owner: string; error?: string }> => {
        const preferences = owner.push_notification_preferences[0];
        const subscription: PushSubscription = {
          endpoint: preferences.endpoint!,
          keys: {
            p256dh: preferences.p256dh_key!,
            auth: preferences.auth_key!
          }
        };

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify(payload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: 'normal'
            }
          );

          return { success: true, owner: owner.name };
        } catch (error: any) {
          console.error(`Push notification failed for ${owner.name}:`, error.message);
          
          // Clean up invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
            await supabase
              .from('push_notification_preferences')
              .update({
                enabled: false,
                endpoint: null,
                p256dh_key: null,
                auth_key: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', owner.id)
              .single();
          }

          return { 
            success: false, 
            owner: owner.name, 
            error: error.message || 'Unknown error' 
          };
        }
      })
    );

    // Calculate results
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    console.log(`Push notifications: ${successful} sent, ${failed} failed out of ${validOwners.length} recipients`);

    return NextResponse.json({ 
      success: true,
      message: 'Push notifications processed',
      sent: successful,
      failed: failed,
      total: validOwners.length
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