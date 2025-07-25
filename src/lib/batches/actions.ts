'use server';

import { createServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      ...data,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw new Error('Failed to create batch');
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

// Check if batches are already saved to all_batches
export async function checkAndSaveBatchesToAllBatches(shift?: 'morning' | 'night'): Promise<{ needsSaving: boolean; savedCount?: number }> {
  const supabase = await createServer();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    console.log('🔍 Starting batch check and save process...');

    // Get current date for filtering
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Checking batches for date: ${today}`);

    // Build the query to get batches for today
    let batchesQuery = supabase
      .from('batches')
      .select('*')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    // If shift is specified, filter by shift
    if (shift) {
      batchesQuery = batchesQuery.eq('shift', shift);
      console.log(`🎯 Filtering by shift: ${shift}`);
    } else {
      console.log('⚠️ No shift specified, will check all shifts for today');
    }

    // Get batches from batches table for today (and specific shift if provided)
    const { data: batches, error: batchesError } = await batchesQuery;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      throw new Error('Failed to fetch batches');
    }

    console.log(`📊 Found ${batches?.length || 0} batches in batches table for ${shift || 'all shifts'} on ${today}`);

    if (!batches || batches.length === 0) {
      console.log(`ℹ️ No batches found for ${shift || 'all shifts'} on ${today}, nothing to save`);
      return { needsSaving: false };
    }

    // Get all existing batch UUIDs from all_batches table for today (and specific shift if provided)
    let existingBatchesQuery = supabase
      .from('all_batches')
      .select('id, created_at')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    // If shift is specified, filter existing batches by shift too
    if (shift) {
      existingBatchesQuery = existingBatchesQuery.eq('shift', shift);
    }

    const { data: existingBatches, error: existingError } = await existingBatchesQuery;

    if (existingError) {
      console.error('Error fetching existing batches:', existingError);
      throw new Error('Failed to check existing batches');
    }

    console.log(`📋 Found ${existingBatches?.length || 0} existing batches in all_batches table for ${shift || 'all shifts'} on ${today}`);

    // Create a set of existing batch UUIDs for fast lookup
    const existingBatchIds = new Set();
    if (existingBatches) {
      existingBatches.forEach(batch => {
        existingBatchIds.add(batch.id);
      });
    }

    // Filter batches that need to be saved (those not in all_batches)
    const batchesToSave = batches.filter(batch => {
      return !existingBatchIds.has(batch.id);
    });

    console.log(`💾 Found ${batchesToSave.length} batches that need to be saved to all_batches for ${shift || 'all shifts'}`);

    if (batchesToSave.length === 0) {
      console.log(`✅ All batches for ${shift || 'all shifts'} are already saved to all_batches`);
      return { needsSaving: false };
    }

    // Log details of batches that will be saved
    batchesToSave.forEach(batch => {
      console.log(`📝 Will save batch: ${batch.id} (${batch.batch_number}) - ${(batch as any).shift} shift`);
    });

    // Validate batch data before insertion
    const validBatchesToInsert = batchesToSave.map(batch => {
      // Ensure all required fields are present
      if (!batch.bread_type_id || !batch.batch_number || !batch.actual_quantity) {
        console.warn(`⚠️ Skipping invalid batch: ${batch.id} - missing required fields`);
        return null;
      }

      return {
        id: batch.id, // Preserve the original UUID
        bread_type_id: batch.bread_type_id,
        batch_number: batch.batch_number,
        start_time: batch.start_time,
        end_time: batch.end_time,
        actual_quantity: batch.actual_quantity || 0,
        status: batch.status || 'active',
        shift: (batch as any).shift || 'morning',
        notes: batch.notes,
        created_by: batch.created_by,
        created_at: batch.created_at,
        updated_at: batch.updated_at
      };
    }).filter(batch => batch !== null);

    if (validBatchesToInsert.length === 0) {
      console.log('⚠️ No valid batches to save after validation');
      return { needsSaving: false };
    }

    console.log(`🚀 Saving ${validBatchesToInsert.length} valid batches to all_batches table for ${shift || 'all shifts'}...`);

    // Save batches to all_batches table in bulk
    const { error: saveError } = await supabase
      .from('all_batches')
      .insert(validBatchesToInsert);

    if (saveError) {
      console.error('Error saving batches to all_batches:', saveError);
      throw new Error('Failed to save batches to all_batches');
    }

    console.log(`✅ Successfully saved ${validBatchesToInsert.length} batches to all_batches table for ${shift || 'all shifts'}`);
    return { needsSaving: true, savedCount: validBatchesToInsert.length };

  } catch (error) {
    console.error('❌ Error in checkAndSaveBatchesToAllBatches:', error);
    throw error;
  }
}

// Delete all batches (for managers/owners only)
export async function deleteAllBatches(shift?: 'morning' | 'night'): Promise<void> {
  const supabase = await createServer();
  
  // First, get the current user to check permissions
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Get user role from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('User not found');
  }

  // Only managers and owners can delete batches
  if (userData.role !== 'manager' && userData.role !== 'owner') {
    throw new Error('Unauthorized: Only managers and owners can delete batches');
  }

  // Get current date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`🧹 Starting batch deletion for ${shift || 'all'} shift on ${today}`);

  // Build the delete query with shift and date filtering
  let deleteQuery = supabase
    .from('batches')
    .delete()
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`);

  // If shift is specified, filter by shift
  if (shift) {
    deleteQuery = deleteQuery.eq('shift', shift);
    console.log(`🎯 Filtering by shift: ${shift}`);
  } else {
    console.log('⚠️ No shift specified, will delete all batches for today');
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error('Error deleting batches:', error);
    throw new Error(`Failed to delete ${shift || 'all'} shift batches`);
  }

  console.log(`✅ Successfully deleted ${shift || 'all'} shift batches for ${today}`);
  revalidatePath('/dashboard');
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

  const activeBatches = stats?.filter((b: any) => b.status === 'active').length || 0;
  const completedBatches = stats?.filter((b: any) => b.status === 'completed').length || 0;
  const totalActualQuantity = stats?.reduce((sum: number, b: any) => sum + (b.actual_quantity || 0), 0) || 0;

  return {
    activeBatches,
    completedBatches,
    totalActualQuantity,
  };
}
