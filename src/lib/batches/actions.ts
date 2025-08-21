'use server';

import { createServer } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logBatchActivity, logReportActivity } from '@/lib/activities/server-activity-service';

export interface Batch {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time?: string | null;
  actual_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  shift: 'morning' | 'night';
  bread_type?: {
    name: string;
    unit_price: number;
  };
  created_by_user?: {
    name?: string;
  };
}

export interface CreateBatchData {
  bread_type_id: string;
  batch_number: string;
  actual_quantity: number;
  notes?: string;
  shift: 'morning' | 'night';
}

export interface UpdateBatchData {
  bread_type_id?: string;
  batch_number?: string;
  actual_quantity?: number;
  status?: 'active' | 'completed' | 'cancelled';
  notes?: string;
  end_time?: string;
}

// Create a new batch
export async function createBatch(data: Omit<CreateBatchData, 'batch_number'>) {
  const supabase = await createServer();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required');
  }

  const batchNumber = `BATCH-${Date.now()}`;

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      bread_type_id: data.bread_type_id,
      actual_quantity: data.actual_quantity,
      notes: data.notes,
      shift: data.shift,
      created_by: user.id,
      batch_number: batchNumber
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw new Error('Failed to create batch');
  }

  // Log activity for batch creation
  try {
    console.log('🎯 Starting activity logging for batch creation...');
    console.log('   User ID:', user.id);
    console.log('   Bread Type ID:', data.bread_type_id);
    
    const [userResult, breadTypeResult] = await Promise.all([
      supabase.from('users').select('name, role').eq('id', user.id).single(),
      supabase.from('bread_types').select('name').eq('id', data.bread_type_id).single()
    ]);

    console.log('   User Result:', userResult);
    console.log('   BreadType Result:', breadTypeResult);

    if (userResult.data && breadTypeResult.data && userResult.data.role !== 'owner') {
      console.log('✅ Conditions met, calling logBatchActivity...');
      
      await logBatchActivity({
        user_id: user.id,
        user_name: userResult.data.name,
        shift: data.shift,
        bread_type: breadTypeResult.data.name,
        quantity: data.actual_quantity,
        batch_number: batchNumber
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

  revalidatePath('/dashboard');
  return batch;
}

// Get all batches
export async function getBatches() {
  const supabase = await createServer();
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batches:', error);
    throw new Error('Failed to fetch batches');
  }

  return batches;
}

// Get active batches
export async function getActiveBatches() {
  const supabase = await createServer();
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active batches:', error);
    throw new Error('Failed to fetch active batches');
  }

  return batches;
}

// Update a batch
export async function updateBatch(batchId: string, data: UpdateBatchData) {
  const supabase = await createServer();
  
  const { data: batch, error } = await supabase
    .from('batches')
    .update(data)
    .eq('id', batchId)
    .select()
    .single();

  if (error) {
    console.error('Error updating batch:', error);
    throw new Error('Failed to update batch');
  }

  revalidatePath('/dashboard');
  return batch;
}

// Complete a batch
export async function completeBatch(batchId: string, actualQuantity: number) {
  const supabase = await createServer();
  
  const { data: batch, error } = await supabase
    .from('batches')
    .update({
      status: 'completed',
      actual_quantity: actualQuantity,
      end_time: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) {
    console.error('Error completing batch:', error);
    throw new Error('Failed to complete batch');
  }

  revalidatePath('/dashboard');
  return batch;
}

// Cancel a batch
export async function cancelBatch(batchId: string) {
  const supabase = await createServer();
  
  const { data: batch, error } = await supabase
    .from('batches')
    .update({
      status: 'cancelled',
      end_time: new Date().toISOString()
    })
    .eq('id', batchId)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling batch:', error);
    throw new Error('Failed to cancel batch');
  }

  revalidatePath('/dashboard');
  return batch;
}

// Delete a batch
export async function deleteBatch(batchId: string): Promise<void> {
  const supabase = await createServer();
  
  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('id', batchId);

  if (error) {
    console.error('Error deleting batch:', error);
    throw new Error('Failed to delete batch');
  }

  revalidatePath('/dashboard');
}

// PRODUCTION-READY: Save batches to all_batches with proper duplicate checking
export async function checkAndSaveBatchesToAllBatches(shift?: 'morning' | 'night'): Promise<{ needsSaving: boolean; savedCount?: number }> {
  const supabase = await createServer();
  
  try {
    // Authentication check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    console.log(`🔍 Starting batch save process for ${shift || 'all'} shift...`);

    // Get today's date range for filtering
    const today = new Date().toISOString().split('T')[0];
    const dateStart = `${today}T00:00:00.000Z`;
    const dateEnd = `${today}T23:59:59.999Z`;

    // Query batches from current user for today with optional shift filter
    let batchesQuery = supabase
      .from('batches')
      .select('*')
      .eq('created_by', user.id)
      .gte('created_at', dateStart)
      .lte('created_at', dateEnd);

    if (shift) {
      batchesQuery = batchesQuery.eq('shift', shift);
    }

    const { data: batches, error: batchesError } = await batchesQuery;
    
    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      throw new Error('Failed to fetch batches');
    }

    if (!batches || batches.length === 0) {
      console.log(`ℹ️ No batches found for ${shift || 'all'} shift today`);
      return { needsSaving: false };
    }

    console.log(`📊 Found ${batches.length} batches for ${shift || 'all'} shift`);

    // Check for existing batches in all_batches using BUSINESS LOGIC (not just UUID)
    // Query by bread_type_id + batch_number + shift + created_by + date
    const existingBatchChecks = await Promise.all(
      batches.map(async (batch) => {
        const { data: existing } = await supabase
          .from('all_batches')
          .select('id')
          .eq('bread_type_id', batch.bread_type_id)
          .eq('batch_number', batch.batch_number)
          .eq('shift', batch.shift)
          .eq('created_by', batch.created_by)
          .gte('created_at', dateStart)
          .lte('created_at', dateEnd)
          .single();
        
        return {
          batch,
          exists: !!existing
        };
      })
    );

    // Filter out batches that already exist by business logic
    const batchesToSave = existingBatchChecks
      .filter(({ exists }) => !exists)
      .map(({ batch }) => batch);

    if (batchesToSave.length === 0) {
      console.log(`✅ All ${shift || 'all'} shift batches already saved to reports`);
      return { needsSaving: false };
    }

    console.log(`💾 Saving ${batchesToSave.length} new batches to reports...`);

    // Prepare batches for insertion with data validation
    const validBatches = batchesToSave
      .filter(batch => {
        const isValid = batch.bread_type_id && 
                       batch.batch_number && 
                       batch.shift && 
                       batch.created_by;
        
        if (!isValid) {
          console.warn(`⚠️ Skipping invalid batch: ${batch.id}`);
        }
        return isValid;
      })
      .map(batch => ({
        id: batch.id,
        bread_type_id: batch.bread_type_id,
        batch_number: batch.batch_number,
        start_time: batch.start_time,
        end_time: batch.end_time,
        actual_quantity: batch.actual_quantity || 0,
        status: batch.status || 'active',
        shift: batch.shift,
        notes: batch.notes,
        created_by: batch.created_by,
        created_at: batch.created_at,
        updated_at: batch.updated_at || new Date().toISOString()
      }));

    if (validBatches.length === 0) {
      console.log('⚠️ No valid batches to save after validation');
      return { needsSaving: false };
    }

    // Insert batches to all_batches table
    const { error: insertError } = await supabase
      .from('all_batches')
      .insert(validBatches);

    if (insertError) {
      console.error('❌ Error saving batches:', insertError);
      throw new Error(`Failed to save batches: ${insertError.message}`);
    }

    console.log(`✅ Successfully saved ${validBatches.length} batches to reports`);

    // Log activity (non-blocking)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single();

      if (userData && userData.role !== 'owner') {
        await logReportActivity({
          user_id: user.id,
          user_name: userData.name,
          user_role: userData.role as 'manager' | 'sales_rep',
          shift: shift as 'morning' | 'night',
          report_type: `${validBatches.length} batch${validBatches.length !== 1 ? 'es' : ''} saved to reports`
        });
      }
    } catch (activityError) {
      console.error('Failed to log activity:', activityError);
    }

    return { needsSaving: true, savedCount: validBatches.length };

  } catch (error) {
    console.error('❌ Error in checkAndSaveBatchesToAllBatches:', error);
    throw error;
  }
}

// PRODUCTION-READY: Delete all batches for current user and shift
export async function deleteAllBatches(shift?: 'morning' | 'night'): Promise<void> {
  const supabase = await createServer();
  
  try {
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Role authorization check
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found');
    }

    if (userData.role !== 'manager' && userData.role !== 'owner') {
      throw new Error('Unauthorized: Only managers and owners can delete batches');
    }

    console.log(`🗑️ Deleting ${shift || 'all'} shift batches for current user...`);

    // Build delete query for current user with optional shift filter
    let deleteQuery = supabase
      .from('batches')
      .delete()
      .eq('created_by', user.id);

    if (shift) {
      deleteQuery = deleteQuery.eq('shift', shift);
    }

    // Execute deletion
    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw new Error(`Failed to delete batches: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${count || 0} batches`);

    // Invalidate relevant caches
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/manager');
    revalidatePath('/api/batches');

  } catch (error) {
    console.error('❌ Error in deleteAllBatches:', error);
    throw error;
  }
}

// Get batch statistics
export async function getBatchStats() {
  const supabase = await createServer();
  
  const { data: stats, error } = await supabase
    .from('batches')
    .select('status, actual_quantity');

  if (error) {
    console.error('Error fetching batch stats:', error);
    return {
      activeBatches: 0,
      completedBatches: 0,
      totalActualQuantity: 0,
    };
  }

  const activeBatches = stats?.filter((b: { status: string; actual_quantity: number }) => b.status === 'active').length || 0;
  const completedBatches = stats?.filter((b: { status: string; actual_quantity: number }) => b.status === 'completed').length || 0;
  const totalActualQuantity = stats?.reduce((sum: number, b: { status: string; actual_quantity: number }) => sum + (b.actual_quantity || 0), 0) || 0;

  return {
    activeBatches,
    completedBatches,
    totalActualQuantity,
  };
}
