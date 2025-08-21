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

    // Get current date for filtering (TODAY ONLY)
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Checking batches for TODAY: ${today}`);

    // Build the query to get batches for current user TODAY ONLY
    let batchesQuery = supabase
      .from('batches')
      .select('*')
      .eq('created_by', user.id) // Filter by current user
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    // If shift is specified, filter by shift
    if (shift) {
      batchesQuery = batchesQuery.eq('shift', shift);
      console.log(`🎯 Filtering by current user and shift: ${shift}`);
    } else {
      console.log('⚠️ No shift specified, will check all shifts for current user today');
    }

    // Get batches from batches table for today (and specific shift if provided)
    const { data: batches, error: batchesError } = await batchesQuery;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      throw new Error('Failed to fetch batches');
    }

    console.log(`📊 Found ${batches?.length || 0} batches in batches table for current user - ${shift || 'all shifts'} TODAY`);

    if (!batches || batches.length === 0) {
      console.log(`ℹ️ No batches found for current user - ${shift || 'all shifts'} TODAY, nothing to save`);
      return { needsSaving: false };
    }

    // Get all existing batch UUIDs from all_batches table for current user TODAY (and specific shift if provided)
    let existingBatchesQuery = supabase
      .from('all_batches')
      .select('id, created_at')
      .eq('created_by', user.id) // Filter by current user
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

    console.log(`📋 Found ${existingBatches?.length || 0} existing batches in all_batches table for current user - ${shift || 'all shifts'} TODAY`);

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

    console.log(`💾 Found ${batchesToSave.length} batches that need to be saved to all_batches for current user - ${shift || 'all shifts'} TODAY`);

    if (batchesToSave.length === 0) {
      console.log(`✅ All batches for current user - ${shift || 'all shifts'} are already saved to all_batches TODAY`);
      return { needsSaving: false };
    }

    // Log details of batches that will be saved
    batchesToSave.forEach(batch => {
      console.log(`📝 Will save batch: ${batch.id} (${batch.batch_number}) - ${(batch as Batch & { shift?: string }).shift} shift`);
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
        shift: (batch as Batch & { shift?: string }).shift || 'morning',
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

    console.log(`🚀 Saving ${validBatchesToInsert.length} valid batches to all_batches table for current user - ${shift || 'all shifts'} TODAY...`);

    // Save batches to all_batches table in bulk with ON CONFLICT handling
    const { error: saveError } = await supabase
      .from('all_batches')
      .upsert(validBatchesToInsert, { 
        onConflict: 'id',
        ignoreDuplicates: true 
      });

    if (saveError) {
      console.error('Error saving batches to all_batches:', saveError);
      throw new Error('Failed to save batches to all_batches');
    }

    console.log(`✅ Successfully saved ${validBatchesToInsert.length} batches to all_batches table for current user - ${shift || 'all shifts'} TODAY`);
    
    // Log activity for saving batches to all_batches
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
          report_type: `${validBatchesToInsert.length} batch${validBatchesToInsert.length !== 1 ? 'es' : ''} saved to reports`
        });
      }
    } catch (activityError) {
      console.error('Failed to log batch save activity:', activityError);
    }
    
    return { needsSaving: true, savedCount: validBatchesToInsert.length };

  } catch (error) {
    console.error('❌ Error in checkAndSaveBatchesToAllBatches:', error);
    throw error;
  }
}

// Delete all batches for current user's shift (for managers/owners only)
// PRODUCTION-READY FIX: Use regular client with proper RLS authentication (like sales rep end shift)
export async function deleteAllBatches(shift?: 'morning' | 'night'): Promise<void> {
  // ✅ USE REGULAR CLIENT - Same approach as sales rep end shift
  const supabase = await createServer();
  
  // Get current user with proper authentication context
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Check user role with proper authentication context (not service role)
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

  console.log(`🧹 Starting batch deletion for current user (${user.id}) - ${shift || 'all'} shift (ALL DATES) with PROPER AUTHENTICATION`);

  // First, check how many batches will be deleted using authenticated client
  let countQuery = supabase
    .from('batches')
    .select('id, batch_number, shift, created_at')
    .eq('created_by', user.id); // Filter by current user ONLY

  // If shift is specified, filter by shift
  if (shift) {
    countQuery = countQuery.eq('shift', shift);
    console.log(`🎯 Counting ALL batches for current user and shift: ${shift} with AUTHENTICATED CLIENT`);
  } else {
    console.log('⚠️ No shift specified, counting ALL batches for current user with AUTHENTICATED CLIENT');
  }

  const { data: batchesToDelete, error: countError } = await countQuery;
  
  if (countError) {
    console.error('Error counting batches to delete:', countError);
  } else {
    console.log(`📊 Found ${batchesToDelete?.length || 0} batches to delete for current user - ${shift || 'all'} shift (ALL DATES)`);
    if (batchesToDelete && batchesToDelete.length > 0) {
      batchesToDelete.forEach(batch => {
        console.log(`   - Batch ${batch.batch_number} (${batch.shift} shift) - ${batch.created_at}`);
      });
    }
  }

  // ✅ BUILD DELETE QUERY WITH AUTHENTICATED CLIENT - This will work with RLS
  let deleteQuery = supabase
    .from('batches')
    .delete()
    .eq('created_by', user.id); // Filter by current user ONLY

  // If shift is specified, filter by shift
  if (shift) {
    deleteQuery = deleteQuery.eq('shift', shift);
    console.log(`🗑️ Deleting ALL batches for current user and shift: ${shift} with AUTHENTICATED CLIENT`);
  } else {
    console.log('🗑️ Deleting ALL batches for current user with AUTHENTICATED CLIENT');
  }

  const { error, count } = await deleteQuery;

  if (error) {
    console.error('❌ Error deleting batches with authenticated client:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error details:', error.details);
    console.error('❌ Error hint:', error.hint);
    throw new Error(`Failed to delete ${shift || 'all'} shift batches: ${error.message}`);
  }

  console.log(`✅ Successfully deleted ${count || 'unknown number of'} ${shift || 'all'} shift batches for current user (${user.id}) with AUTHENTICATED CLIENT`);
  
  // PRODUCTION-READY: Additional verification with retry using authenticated client
  let verificationAttempts = 0;
  const maxVerificationAttempts = 3;
  
  while (verificationAttempts < maxVerificationAttempts) {
    const { data: remainingBatches, error: verifyError } = await countQuery;
    
    if (verifyError) {
      console.warn(`⚠️ Verification attempt ${verificationAttempts + 1} failed:`, verifyError);
      verificationAttempts++;
      if (verificationAttempts < maxVerificationAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
        continue;
      }
      break;
    }
    
    if (remainingBatches && remainingBatches.length === 0) {
      console.log(`🔍 Verification PASSED: No ${shift || 'all'} shift batches remain for user ${user.id}`);
      break;
    } else {
      console.warn(`⚠️ Verification attempt ${verificationAttempts + 1}: ${remainingBatches?.length || 0} batches still exist`);
      if (remainingBatches && remainingBatches.length > 0) {
        remainingBatches.forEach(batch => {
          console.warn(`   - Still exists: ${batch.batch_number} (${batch.shift} shift) - ${batch.created_at}`);
        });
      }
    }
    
    verificationAttempts++;
    if (verificationAttempts < maxVerificationAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
    }
  }
  
  if (verificationAttempts >= maxVerificationAttempts) {
    console.error(`❌ Verification failed after ${maxVerificationAttempts} attempts`);
    throw new Error(`Batch deletion verification failed after ${maxVerificationAttempts} attempts`);
  }
  
  console.log(`🎉 AUTHENTICATED CLIENT APPROACH: Batch deletion completed successfully for ${shift || 'all'} shift`);
  
  // Invalidate all relevant paths and caches
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/manager');
  revalidatePath('/dashboard/production');
  revalidatePath('/api/batches');
  revalidatePath('/api/batches/stats');
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
