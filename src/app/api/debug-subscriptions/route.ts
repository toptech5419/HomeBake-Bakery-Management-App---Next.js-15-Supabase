import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServer();
    
    // Get all push notification preferences
    const { data: subscriptions, error } = await supabase
      .from('push_notification_preferences')
      .select(`
        id,
        user_id,
        enabled,
        endpoint,
        created_at,
        users!inner(name, role)
      `);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('📊 Current push subscriptions:', subscriptions);

    return NextResponse.json({
      success: true,
      totalSubscriptions: subscriptions?.length || 0,
      subscriptions: subscriptions || [],
      ownerSubscriptions: subscriptions?.filter(sub => sub.users.role === 'owner') || []
    });

  } catch (error: any) {
    console.error('Debug subscriptions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}