'use client';

import { supabase } from '@/lib/supabase/client';
import { Batch, CreateBatchData, UpdateBatchData } from './actions';

// Fetch all batches with related data
export async function getBatches(): Promise<Batch[]> {
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_type:bread_types(name, unit_price)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batches:', error);
    throw new Error('Failed to fetch batches');
  }

  return batches || [];
}

// Fetch active batches
export async function getActiveBatches(): Promise<Batch[]> {
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_type:bread_types(name, unit_price)
    `)
    .eq('status', 'active')
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching active batches:', error);
    throw new Error('Failed to fetch active batches');
  }

  return batches || [];
}

// Create a new batch
export async function createBatch(data: CreateBatchData): Promise<Batch> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required');
  }

  // Check if batch number already exists for this bread type
  const { data: existingBatch, error: checkError } = await supabase
    .from('batches')
    .select('id')
    .eq('bread_type_id', data.bread_type_id)
    .eq('batch_number', data.batch_number)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing batch:', checkError);
    throw new Error('Failed to check existing batch');
  }

  if (existingBatch) {
    throw new Error('Batch number already exists for this bread type');
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .insert({
      ...data,
      created_by: user.id,
      start_time: new Date().toISOString(),
    })
    .select(`
      *,
      bread_type:bread_types(name, unit_price)
    `)
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw new Error('Failed to create batch');
  }

  return batch;
}

// Update a batch
export async function updateBatch(batchId: string, data: UpdateBatchData): Promise<Batch> {
  const updateData: any = { ...data };
  
  // If completing the batch, set end_time
  if (data.status === 'completed' && !data.end_time) {
    updateData.end_time = new Date().toISOString();
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .update(updateData)
    .eq('id', batchId)
    .select(`
      *,
      bread_type:bread_types(name, unit_price)
    `)
    .single();

  if (error) {
    console.error('Error updating batch:', error);
    throw new Error('Failed to update batch');
  }

  return batch;
}

// Complete a batch
export async function completeBatch(batchId: string, actualQuantity: number): Promise<Batch> {
  return updateBatch(batchId, {
    status: 'completed',
    actual_quantity: actualQuantity,
    end_time: new Date().toISOString(),
  });
}

// Cancel a batch
export async function cancelBatch(batchId: string): Promise<Batch> {
  return updateBatch(batchId, {
    status: 'cancelled',
    end_time: new Date().toISOString(),
  });
}

// Delete a batch
export async function deleteBatch(batchId: string): Promise<void> {
  const { error } = await supabase
    .from('batches')
    .delete()
    .eq('id', batchId);

  if (error) {
    console.error('Error deleting batch:', error);
    throw new Error('Failed to delete batch');
  }
}

// Generate next batch number for a bread type
export async function generateNextBatchNumber(breadTypeId: string): Promise<string> {
  const { data: lastBatch, error } = await supabase
    .from('batches')
    .select('batch_number')
    .eq('bread_type_id', breadTypeId)
    .order('batch_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching last batch number:', error);
    throw new Error('Failed to generate batch number');
  }

  if (!lastBatch) {
    return 'B001';
  }

  // Extract number from batch number (e.g., "B001" -> 1)
  const match = lastBatch.batch_number.match(/B(\d+)/);
  if (!match) {
    return 'B001';
  }

  const nextNumber = parseInt(match[1]) + 1;
  return `B${nextNumber.toString().padStart(3, '0')}`;
}

// Get batch statistics
export async function getBatchStats() {
  const { data: stats, error } = await supabase
    .from('batches')
    .select('status, target_quantity, actual_quantity')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  if (error) {
    console.error('Error fetching batch stats:', error);
    throw new Error('Failed to fetch batch statistics');
  }

  const totalBatches = stats?.length || 0;
  const activeBatches = stats?.filter(b => b.status === 'active').length || 0;
  const completedBatches = stats?.filter(b => b.status === 'completed').length || 0;
  const totalTargetQuantity = stats?.reduce((sum, b) => sum + (b.target_quantity || 0), 0) || 0;
  const totalActualQuantity = stats?.reduce((sum, b) => sum + (b.actual_quantity || 0), 0) || 0;

  return {
    totalBatches,
    activeBatches,
    completedBatches,
    totalTargetQuantity,
    totalActualQuantity,
    efficiency: totalTargetQuantity > 0 ? (totalActualQuantity / totalTargetQuantity) * 100 : 0,
  };
} 