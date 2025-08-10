import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { shift } = await request.json();

    console.log(`🧪 DEBUG: Testing batch deletion for ${shift || 'all'} shift...`);

    // Get current user
    const regularSupabase = await createServer();
    const { data: { user }, error: authError } = await regularSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log(`🧪 DEBUG: Current user: ${user.id}`);

    // Use service role client to bypass RLS
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, count existing batches
    let countQuery = serviceSupabase
      .from('batches')
      .select('id, batch_number, shift, created_by')
      .eq('created_by', user.id);

    if (shift) {
      countQuery = countQuery.eq('shift', shift);
    }

    const { data: existingBatches, error: countError } = await countQuery;
    
    if (countError) {
      console.error('❌ Error counting batches:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    console.log(`🧪 DEBUG: Found ${existingBatches?.length || 0} batches to delete`);
    
    if (existingBatches && existingBatches.length > 0) {
      console.log('🧪 DEBUG: Batch details:');
      existingBatches.forEach(batch => {
        console.log(`   - ${batch.batch_number} (${batch.shift} shift) - User: ${batch.created_by}`);
      });
    }

    // Now try to delete
    let deleteQuery = serviceSupabase
      .from('batches')
      .delete()
      .eq('created_by', user.id);

    if (shift) {
      deleteQuery = deleteQuery.eq('shift', shift);
    }

    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error('❌ Error deleting batches:', deleteError);
      return NextResponse.json({ 
        error: deleteError.message,
        code: deleteError.code,
        details: deleteError.details,
        hint: deleteError.hint
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted ${count || 'unknown'} batches`);

    // Verify deletion
    const { data: remainingBatches, error: verifyError } = await countQuery;
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${count || 'unknown'} batches`,
      beforeCount: existingBatches?.length || 0,
      afterCount: remainingBatches?.length || 0,
      deletedBatches: existingBatches?.map(b => ({ 
        id: b.id, 
        batch_number: b.batch_number, 
        shift: b.shift 
      })) || []
    });

  } catch (error: any) {
    console.error('❌ Debug delete error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}