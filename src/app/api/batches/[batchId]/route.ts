import { createServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API routes that require authentication
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
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

    const { batchId } = await params;
    const body = await request.json();
    const { status, actual_quantity, notes } = body;

    // Update the batch
    const { data: batch, error } = await supabase
      .from('batches')
      .update({
        status: status || undefined,
        actual_quantity: actual_quantity || undefined,
        notes: notes || undefined,
      })
      .eq('id', batchId)
      .select(`
        *,
        bread_type:bread_types(name, unit_price)
      `)
      .single();

    if (error) {
      console.error('Error updating batch:', error);
      return NextResponse.json(
        { error: 'Failed to update batch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: batch });
  } catch (error) {
    console.error('Unexpected error updating batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
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

    const { batchId } = await params;

    // Delete the batch
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId);

    if (error) {
      console.error('Error deleting batch:', error);
      return NextResponse.json(
        { error: 'Failed to delete batch' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 