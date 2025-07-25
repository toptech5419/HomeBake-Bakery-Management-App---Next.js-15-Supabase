import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bread_type_id, actual_quantity, start_time, notes, status, shift } = body;

    // Validate required fields (no batch_number needed)
    if (!bread_type_id || !actual_quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate shift
    if (!shift || !['morning', 'night'].includes(shift)) {
      return NextResponse.json(
        { error: 'Valid shift (morning or night) is required' },
        { status: 400 }
      );
    }

    // Call the Postgres RPC for atomic batch creation
    const { data, error } = await supabase.rpc('create_batch_with_unique_number', {
      p_bread_type_id: bread_type_id,
      p_actual_quantity: actual_quantity,
      p_notes: notes || null,
      p_shift: shift,
      p_created_by: user.id,
      p_start_time: start_time || null,
      p_status: status || 'active',
    });

    if (error || !data || !data[0]) {
      console.error('Error creating batch via RPC:', error);
      return NextResponse.json(
        { error: 'Failed to create batch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error('Unexpected error creating batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shift = searchParams.get('shift'); // Add shift parameter
    const includeDetails = searchParams.get('include') === 'details';

    let query = supabase
      .from('batches')
      .select(`
        *,
        bread_type:bread_types(name, unit_price),
        created_by_user:users!created_by(email, name)
      `)
      .order('created_at', { ascending: false });

    if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      query = query.eq('status', status as 'active' | 'completed' | 'cancelled');
    }

    // Add shift filtering
    if (shift && ['morning', 'night'].includes(shift)) {
      query = query.eq('shift', shift as 'morning' | 'night');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch batches' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error fetching batches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
