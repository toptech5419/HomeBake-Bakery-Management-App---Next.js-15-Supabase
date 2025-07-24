import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
    const shift = searchParams.get('shift');

    // Build query with optional shift filtering
    let query = supabase
      .from('batches')
      .select('status, target_quantity, actual_quantity, created_at');

    // Add shift filtering if provided
    if (shift && ['morning', 'night'].includes(shift)) {
      query = query.eq('shift', shift as 'morning' | 'night');
    }

    // Get batch statistics
    const { data: batches, error: batchesError } = await query;

    if (batchesError) {
      console.error('Error fetching batches for stats:', batchesError);
      return NextResponse.json(
        { error: 'Failed to fetch batch statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalBatches = batches?.length || 0;
    const activeBatches = batches?.filter(b => b.status === 'active').length || 0;
    const completedBatches = batches?.filter(b => b.status === 'completed').length || 0;
    const cancelledBatches = batches?.filter(b => b.status === 'cancelled').length || 0;
    
    const totalTargetQuantity = batches?.reduce((sum, b) => sum + (b.target_quantity || 0), 0) || 0;
    const totalActualQuantity = batches?.reduce((sum, b) => sum + (b.actual_quantity || 0), 0) || 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBatches = batches?.filter(b => new Date(b.created_at) >= today).length || 0;

    const stats = {
      totalBatches,
      activeBatches,
      completedBatches,
      cancelledBatches,
      totalTargetQuantity,
      totalActualQuantity,
      todayBatches,
      completionRate: totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0,
      efficiencyRate: totalTargetQuantity > 0 ? (totalActualQuantity / totalTargetQuantity) * 100 : 0,
      shift: shift || 'all',
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Unexpected error fetching batch statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 