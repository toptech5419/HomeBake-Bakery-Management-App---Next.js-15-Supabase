'use client';

import { Batch, CreateBatchData, UpdateBatchData } from './actions';

// Create a new batch using server API
export async function createBatch(data: Omit<CreateBatchData, 'batch_number'>): Promise<Batch> {
  const response = await fetch('/api/batches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create batch');
  }

  return result.data;
}

// Fetch all batches using server API
export async function getBatches(shift?: 'morning' | 'night'): Promise<Batch[]> {
  const params = new URLSearchParams();
  if (shift) {
    params.append('shift', shift);
  }
  
  const response = await fetch(`/api/batches?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch batches');
  }

  const result = await response.json();
  return result.data || [];
}

// Fetch all batches with detailed information for the modal
export async function getAllBatchesWithDetails(shift?: 'morning' | 'night'): Promise<Batch[]> {
  const params = new URLSearchParams();
  params.append('include', 'details');
  if (shift) {
    params.append('shift', shift);
  }
  
  const response = await fetch(`/api/batches?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch batches with details');
  }

  const result = await response.json();
  return result.data || [];
}

// Fetch active batches using server API
export async function getActiveBatches(shift?: 'morning' | 'night'): Promise<Batch[]> {
  const params = new URLSearchParams();
  params.append('status', 'active');
  if (shift) {
    params.append('shift', shift);
  }
  
  const response = await fetch(`/api/batches?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch active batches');
  }

  const result = await response.json();
  return result.data || [];
}

// Update a batch using server API
export async function updateBatch(batchId: string, data: UpdateBatchData): Promise<Batch> {
  const response = await fetch(`/api/batches/${batchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update batch');
  }

  return result.data;
}

// Complete a batch
export async function completeBatch(batchId: string, actualQuantity: number): Promise<Batch> {
  return updateBatch(batchId, {
    status: 'completed',
    actual_quantity: actualQuantity,
  });
}

// Cancel a batch
export async function cancelBatch(batchId: string): Promise<Batch> {
  return updateBatch(batchId, {
    status: 'cancelled',
  });
}

// Delete a batch
export async function deleteBatch(batchId: string): Promise<void> {
  const response = await fetch(`/api/batches/${batchId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Failed to delete batch');
  }
}

// Get batch statistics
export async function getBatchStats(shift?: 'morning' | 'night') {
  const params = new URLSearchParams();
  if (shift) {
    params.append('shift', shift);
  }
  
  const response = await fetch(`/api/batches/stats?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch batch statistics');
  }

  const result = await response.json();
  return result.data;
}
