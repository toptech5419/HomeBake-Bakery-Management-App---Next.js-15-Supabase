import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logBatchActivity } from '@/lib/activities/server-activity-service';

// Force dynamic rendering for API routes that require authentication
export const dynamic = 'force-dynamic';

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

      // Validate required fields
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
        console.error('Error creating batch via RPC:', { error, userId: user.id });
        return NextResponse.json(
          { error: 'Failed to create batch', details: error?.message },
          { status: 500 }
        );
      }

      // Log activity for batch creation (after successful RPC call)
      try {
        console.log('🎯 Starting activity logging for batch creation via API...');
        console.log('   User ID:', user.id);
        console.log('   Bread Type ID:', bread_type_id);
        console.log('   Batch created:', data[0]);
        
        const [userResult, breadTypeResult] = await Promise.all([
          supabase.from('users').select('name, role').eq('id', user.id).single(),
          supabase.from('bread_types').select('name').eq('id', bread_type_id).single()
        ]);

        console.log('   User Result:', userResult);
        console.log('   BreadType Result:', breadTypeResult);

        if (userResult.data && breadTypeResult.data && userResult.data.role !== 'owner') {
          console.log('✅ Conditions met, calling logBatchActivity...');
          
          await logBatchActivity({
            user_id: user.id,
            user_name: userResult.data.name,
            shift: shift as 'morning' | 'night',
            bread_type: breadTypeResult.data.name,
            quantity: actual_quantity,
            batch_number: data[0].batch_number || `BATCH-${Date.now()}`
          });
          
          console.log('✅ Activity logging completed successfully');
        } else {
          console.log('⚠️ Activity logging skipped - conditions not met:');
          console.log('   User data exists:', !!userResult.data);
          console.log('   BreadType data exists:', !!breadTypeResult.data);
          console.log('   User role:', userResult.data?.role);
          console.log('   Is not owner:', userResult.data?.role !== 'owner');
        }
      } catch (activityError) {
        // Don't fail the batch creation if activity logging fails
        console.error('💥 Failed to log batch activity:', activityError);
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
      const shift = searchParams.get('shift');
      // const includeDetails = searchParams.get('include') === 'details';

      let query = supabase
        .from('batches')
        .select(`
          *,
          bread_type:bread_types(name, unit_price),
          created_by_user:users!created_by(email, name)
        `)
        .eq('created_by', user.id) // CRITICAL FIX: Filter by current user (matches deleteAllBatches logic)
        .order('created_at', { ascending: false });

      if (status && ['active', 'completed', 'cancelled'].includes(status)) {
        query = query.eq('status', status as 'active' | 'completed' | 'cancelled');
      }

      if (shift && ['morning', 'night'].includes(shift)) {
        query = query.eq('shift', shift as 'morning' | 'night');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching batches:', { error, userId: user.id });
        return NextResponse.json(
          { error: 'Failed to fetch batches', details: error.message },
          { status: 500 }
        );
      }

      console.log(`📡 API fetched ${data?.length || 0} batches for user ${user.id}, shift: ${shift || 'all'}, status: ${status || 'all'}`);
      return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error fetching batches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
