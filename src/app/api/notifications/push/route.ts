import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:admin@homebake.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServer();
    
    // Authenticate request
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PushNotificationRequest = await request.json();
    const { activity_type, user_name, message, metadata } = body;

    // Get all owner users with push notifications enabled
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
      .eq('push_notification_preferences.enabled', true);

    if (ownersError) {
      console.error('Error fetching owners:', ownersError);
      return NextResponse.json({ error: 'Failed to fetch notification recipients' }, { status: 500 });
    }

    if (!owners?.length) {
      return NextResponse.json({ message: 'No owners found' }, { status: 200 });
    }

    // Filter owners with valid subscriptions (already filtered by enabled=true in query)
    const eligibleOwners = owners.filter(owner => 
      owner.push_notification_preferences?.endpoint
    );

    if (!eligibleOwners.length) {
      return NextResponse.json({ message: 'No owners with push notifications enabled' }, { status: 200 });
    }

    // Prepare notification payload
    const title = `HomeBake ${getActivityTitle(activity_type)}`;
    const payload = {
      title,
      body: message,
      activity_type,
      user_name,
      metadata,
      url: '/owner-dashboard',
      timestamp: Date.now()
    };

    // Send push notifications to all eligible owners
    const pushPromises = eligibleOwners.map(async (owner) => {
      const subscription = {
        endpoint: owner.push_notification_preferences!.endpoint!,
        keys: {
          p256dh: owner.push_notification_preferences!.p256dh_key!,
          auth: owner.push_notification_preferences!.auth_key!
        }
      };

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(payload),
          {
            TTL: 24 * 60 * 60 // 24 hours
          }
        );

        console.log(`Push notification sent to ${owner.name}`);
        return { success: true, owner: owner.name };
      } catch (error) {
        console.error(`Failed to send push notification to ${owner.name}:`, error);
        
        // Remove invalid subscription from database
        if ((error as any)?.statusCode === 410 || (error as any)?.statusCode === 404) {
          await supabase
            .from('push_notification_preferences')
            .update({
              enabled: false,
              endpoint: null,
              p256dh_key: null,
              auth_key: null
            })
            .eq('user_id', owner.id);
        }

        return { success: false, owner: owner.name, error: (error as Error).message };
      }
    });

    // Wait for all push notifications to complete
    const results = await Promise.allSettled(pushPromises);
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    console.log(`Push notifications sent: ${successful}/${eligibleOwners.length}`);

    return NextResponse.json({ 
      message: 'Push notifications processed',
      sent: successful,
      total: eligibleOwners.length 
    });

  } catch (error) {
    console.error('Push notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get human-readable title for activity type
 */
function getActivityTitle(activityType: string): string {
  const titles = {
    sale: 'Sale Recorded',
    batch: 'Batch Created', 
    report: 'Report Generated',
    login: 'Staff Login',
    end_shift: 'Shift Ended',
    created: 'Account Created'
  };
  return titles[activityType as keyof typeof titles] || 'Activity Update';
}