import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
const vapidEmail = process.env.VAPID_EMAIL?.startsWith('mailto:') 
  ? process.env.VAPID_EMAIL 
  : `mailto:${process.env.VAPID_EMAIL || 'admin@homebake.com'}`;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

interface PushNotificationPayload {
  title: string;
  body: string;
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  user_name?: string;
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  url?: string;
}

interface NotificationRequest {
  activity_type: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  metadata?: {
    bread_type?: string;
    quantity?: number;
    revenue?: number;
    batch_number?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

interface PushSubscriptionDB {
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}


interface WebPushError extends Error {
  statusCode?: number;
  message: string;
}

/**
 * Send push notifications to all active owner subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Push notification API called');
    const body: NotificationRequest = await request.json();
    console.log('📝 Request body:', body);
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ VAPID keys not configured');
      return NextResponse.json(
        { error: 'Push notifications not configured' }, 
        { status: 500 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    
    // Get all owner accounts with push notification subscriptions enabled
    // Note: push_notification_preferences.user_id references auth.users.id
    // profiles.id also references auth.users.id, so we can join them
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

    console.log('📋 Found subscriptions:', subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No subscriptions found to notify');
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
      .select('id')
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

    console.log('👑 Found owner subscriptions:', ownerSubscriptions.length);

    if (ownerSubscriptions.length === 0) {
      console.log('⚠️ No owner subscriptions found to notify');
      return NextResponse.json({ 
        success: true, 
        message: 'No owner subscriptions to notify',
        sent: 0 
      });
    }

    // Create notification payload
    const payload: PushNotificationPayload = {
      title: getNotificationTitle(body.activity_type),
      body: body.message,
      activity_type: body.activity_type as 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created',
      user_name: body.user_name,
      metadata: body.metadata,
      url: '/owner-dashboard'
    };

    // Send notifications to all owner subscriptions
    const notifications = ownerSubscriptions.map(async (subscription: PushSubscriptionDB) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        };

        const options = {
          TTL: 24 * 60 * 60, // 24 hours
          urgency: 'normal' as const,
          topic: `homebake-${body.activity_type}`
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          options
        );

        console.log('✅ Notification sent successfully to user:', subscription.user_id);
        
        return { success: true, user_id: subscription.user_id };
      } catch (error: unknown) {
        const webPushError = error as WebPushError;
        console.error('❌ Failed to send notification to user:', subscription.user_id);
        console.error('💥 Push error:', webPushError.message);
        
        // Remove invalid subscriptions
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          console.log('🗑️ Removing invalid subscription for user:', subscription.user_id);
          await supabase
            .from('push_notification_preferences')
            .update({ enabled: false, endpoint: null })
            .eq('user_id', subscription.user_id);
        }
        
        return { success: false, user_id: subscription.user_id, error: webPushError.message };
      }
    });

    const results = await Promise.allSettled(notifications);
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successful} of ${ownerSubscriptions.length} notifications`,
      sent: successful,
      total: ownerSubscriptions.length
    });

  } catch (error: unknown) {
    const serverError = error as Error;
    return NextResponse.json(
      { error: 'Internal server error', details: serverError.message },
      { status: 500 }
    );
  }
}

/**
 * Get notification title based on activity type
 */
function getNotificationTitle(activityType: string): string {
  const titles = {
    sale: '🛒 New Sale Recorded',
    batch: '📦 New Batch Started',
    report: '📊 Report Generated',
    login: '👤 Staff Login',
    end_shift: '🕐 Shift Ended',
    created: '➕ New Staff Member'
  };
  return titles[activityType as keyof typeof titles] || '🔔 HomeBake Activity';
}