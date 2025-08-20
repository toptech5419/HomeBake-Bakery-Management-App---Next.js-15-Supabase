import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PRODUCTION-READY: Batch deletion verification endpoint
 * 
 * Provides reliable verification that batch deletion completed successfully.
 * Used by End Shift functionality to ensure UI sync.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServer();
    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift') as 'morning' | 'night' | null;
    const userId = searchParams.get('userId');

    console.log(`🔍 Verifying batch deletion for user ${userId}, shift: ${shift || 'all'}`);

    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      currentUserId = user.id;
    }

    // Build verification query
    let query = supabase
      .from('batches')
      .select('id, batch_number, shift, created_at, status')
      .eq('created_by', currentUserId);

    if (shift) {
      query = query.eq('shift', shift);
    }

    const { data: remainingBatches, error } = await query;

    if (error) {
      console.error('❌ Verification query failed:', error);
      return NextResponse.json(
        { error: 'Verification failed', details: error.message },
        { status: 500 }
      );
    }

    const isDeleted = !remainingBatches || remainingBatches.length === 0;
    
    console.log(`📊 Verification result: ${remainingBatches?.length || 0} batches remain`);
    
    if (!isDeleted && remainingBatches) {
      console.warn('⚠️ Batches still exist after deletion:');
      remainingBatches.forEach(batch => {
        console.warn(`   - ${batch.batch_number} (${batch.shift} shift, ${batch.status})`);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isDeleted,
        remainingCount: remainingBatches?.length || 0,
        remainingBatches: remainingBatches || [],
        shift: shift || 'all',
        userId: currentUserId,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Batch verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}