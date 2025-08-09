'use server';

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
    [key: string]: any;
  };
  url?: string;
}

interface NotificationRequest {
  activity_type: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  metadata?: any;
}

/**
 * Send push notifications to all active owner subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    const body: NotificationRequest = await request.json();
    
    if (!vapidPublicKey || !vapidPrivateKey) {
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
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_notification_preferences')
      .select(`
        user_id,
        endpoint,
        p256dh_key,
        auth_key,
        users!inner(id, role)
      `)
      .eq('enabled', true)
      .eq('users.role', 'owner')
      .not('endpoint', 'is', null);

    if (subscriptionError) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' }, 
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

    // Create notification payload
    const payload: PushNotificationPayload = {
      title: getNotificationTitle(body.activity_type),
      body: body.message,
      activity_type: body.activity_type as any,
      user_name: body.user_name,
      metadata: body.metadata,
      url: '/owner-dashboard'
    };

    // Send notifications to all subscriptions
    const notifications = subscriptions.map(async (subscription: any) => {
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

        return { success: true, user_id: subscription.user_id };
      } catch (error: any) {
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_notification_preferences')
            .update({ enabled: false, endpoint: null })
            .eq('user_id', subscription.user_id);
        }
        
        return { success: false, user_id: subscription.user_id, error: error.message };
      }
    });

    const results = await Promise.allSettled(notifications);
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successful} of ${subscriptions.length} notifications`,
      sent: successful,
      total: subscriptions.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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