import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ breadTypeId: string }> }
) {
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

    const { breadTypeId } = await params;
    const { searchParams } = new URL(request.url);
    const shift = searchParams.get('shift');

    if (!breadTypeId) {
      return NextResponse.json(
        { error: 'Bread type ID is required' },
        { status: 400 }
      );
    }

    // Validate shift parameter
    if (!shift || !['morning', 'night'].includes(shift)) {
      return NextResponse.json(
        { error: 'Valid shift (morning or night) is required' },
        { status: 400 }
      );
    }

    // Generate next batch number for this bread type and shift
    let query = supabase
      .from('batches')
      .select('batch_number')
      .eq('bread_type_id', breadTypeId)
      .eq('shift', shift)
      .order('batch_number', { ascending: false })
      .limit(1);

    const { data: lastBatch, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching last batch number:', error);
      return NextResponse.json(
        { error: 'Failed to generate batch number' },
        { status: 500 }
      );
    }

    let nextNumber = 1;
    if (lastBatch) {
      // Extract number from batch number (e.g., "001" -> 1)
      const match = lastBatch.batch_number.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const batchNumber = nextNumber.toString().padStart(3, '0');
    
    return NextResponse.json({ data: batchNumber });
  } catch (error) {
    console.error('Unexpected error generating batch number:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
