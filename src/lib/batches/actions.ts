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
  target_quantity: number;
  actual_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  bread_type?: {
    name: string;
    price: number;
  };
  created_by_user?: {
    email: string;
    full_name?: string;
  };
}

export interface CreateBatchData {
  bread_type_id: string;
  batch_number: string;
  target_quantity: number;
  notes?: string;
}

export interface UpdateBatchData {
  target_quantity?: number;
  actual_quantity?: number;
  status?: 'active' | 'completed' | 'cancelled';
  notes?: string;
  end_time?: string;
}

// Fetch all batches with related data
export async function getBatches(): Promise<Batch[]> {
  const supabase = await createServer();
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_type:bread_types(name, price),
      created_by_user:auth.users!created_by(email, raw_user_meta_data)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batches:', error);
    throw new Error('Failed to fetch batches');
  }

  return batches || [];
}

// Fetch batches by bread type
export async function getBatchesByBreadType(breadTypeId: string): Promise<Batch[]> {
  const supabase = await createServer();
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_type:bread_types(name, price),
      created_by_user:auth.users!created_by(email, raw_user_meta_data)
    `)
    .eq('bread_type_id', breadTypeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching batches by bread type:', error);
    throw new Error('Failed to fetch batches');
  }

  return batches || [];
}

// Fetch active batches
export async function getActiveBatches(): Promise<Batch[]> {
  const supabase = await createServer();
  
  const { data: batches, error } = await supabase
    .from('batches')
    .select(`
      *,
      bread_type:bread_types(name, price),
      created_by_user:auth.users!created_by(email, raw_user_meta_data)
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
  const supabase = await createServer();
  
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
      bread_type:bread_types(name, price),
      created_by_user:auth.users!created_by(email, raw_user_meta_data)
    `)
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw new Error('Failed to create batch');
  }

  revalidatePath('/dashboard');
  return batch;
}

// Update a batch
export async function updateBatch(batchId: string, data: UpdateBatchData): Promise<Batch> {
  const supabase = await createServer();
  
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
      bread_type:bread_types(name, price),
      created_by_user:auth.users!created_by(email, raw_user_meta_data)
    `)
    .single();

  if (error) {
    console.error('Error updating batch:', error);
    throw new Error('Failed to update batch');
  }

  revalidatePath('/dashboard');
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

// Get batch statistics
export async function getBatchStats() {
  const supabase = await createServer();
  
  const { data: stats, error } = await supabase
    .from('batches')
    .select('status, target_quantity, actual_quantity');

  if (error) {
    console.error('Error fetching batch stats:', error);
    return {
      activeBatches: 0,
      completedBatches: 0,
      totalTargetQuantity: 0,
      totalActualQuantity: 0,
    };
  }

  const activeBatches = stats?.filter((b: any) => b.status === 'active').length || 0;
  const completedBatches = stats?.filter((b: any) => b.status === 'completed').length || 0;
  const totalTargetQuantity = stats?.reduce((sum: number, b: any) => sum + (b.target_quantity || 0), 0) || 0;
  const totalActualQuantity = stats?.reduce((sum: number, b: any) => sum + (b.actual_quantity || 0), 0) || 0;

  return {
    activeBatches,
    completedBatches,
    totalTargetQuantity,
    totalActualQuantity,
  };
}

// Generate next batch number for a bread type
export async function generateNextBatchNumber(breadTypeId: string): Promise<string> {
  const supabase = await createServer();
  
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
    return '001';
  }

  const lastNumber = parseInt(lastBatch.batch_number);
  const nextNumber = lastNumber + 1;
  return nextNumber.toString().padStart(3, '0');
} 