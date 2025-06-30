import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServer();
    const feedbackData = await request.json();

    // Validate required fields
    const { user_id, shift, note } = feedbackData;
    
    if (!user_id || !shift || !note) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate shift type
    if (shift !== 'morning' && shift !== 'night') {
      return NextResponse.json(
        { error: 'Invalid shift type' },
        { status: 400 }
      );
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('shift_feedback')
      .insert({
        user_id,
        shift,
        note: note.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    const { searchParams } = new URL(request.url);
    
    const user_id = searchParams.get('user_id');
    const shift = searchParams.get('shift');
    const date = searchParams.get('date');

    let query = supabase
      .from('shift_feedback')
      .select(`
        *,
        users (
          id,
          name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (shift && (shift === 'morning' || shift === 'night')) {
      query = query.eq('shift', shift);
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}