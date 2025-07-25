"use client";

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Batch, CreateBatchData, UpdateBatchData } from '@/lib/batches/actions';
import { 
  getBatches, 
  getActiveBatches, 
  createBatch, 
  updateBatch, 
  completeBatch, 
  cancelBatch, 
  deleteBatch,
  getBatchStats,
  generateNextBatchNumber
} from '@/lib/batches/api-actions';
import { supabase } from '@/lib/supabase/client';

export function useBatches() {
  const queryClient = useQueryClient();

  // Fetch all batches
  const {
    data: rawBatches = [],
    isLoading: isLoadingBatches,
    error: batchesError,
    refetch: refetchBatches
  } = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
    staleTime: 30000, // 30 seconds
  });

  // Fetch user info for created_by
  const [userMap, setUserMap] = useState<Record<string, { email: string; name?: string }>>({});
  useEffect(() => {
    const uniqueUserIds = Array.from(new Set(rawBatches.map(b => b.created_by).filter(Boolean)));
    if (uniqueUserIds.length === 0) return;
    supabase
      .from('users')
      .select('id, email, name')
      .in('id', uniqueUserIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, { email: string; name?: string }> = {};
          data.forEach((u: any) => { map[u.id] = { email: u.email, name: u.name }; });
          setUserMap(map);
        }
      });
  }, [rawBatches]);

  // Attach user info to batches
  const batches = rawBatches.map(b => ({
    ...b,
    created_by_user: userMap[b.created_by] || null,
  }));

  // Fetch active batches
  const {
    data: activeBatches = [],
    isLoading: isLoadingActiveBatches,
    error: activeBatchesError,
    refetch: refetchActiveBatches
  } = useQuery({
    queryKey: ['batches', 'active'],
    queryFn: getActiveBatches,
    staleTime: 15000, // 15 seconds
  });

  // Fetch batch statistics
  const {
    data: batchStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['batches', 'stats'],
    queryFn: getBatchStats,
    staleTime: 60000, // 1 minute
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'stats'] });
    },
  });

  // Update batch mutation
  const updateBatchMutation = useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: UpdateBatchData }) =>
      updateBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'stats'] });
    },
  });

  // Complete batch mutation
  const completeBatchMutation = useMutation({
    mutationFn: ({ batchId, actualQuantity }: { batchId: string; actualQuantity: number }) =>
      completeBatch(batchId, actualQuantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'stats'] });
    },
  });

  // Cancel batch mutation
  const cancelBatchMutation = useMutation({
    mutationFn: cancelBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'stats'] });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['batches', 'stats'] });
    },
  });

  // Generate next batch number
  const generateNextBatchNumberMutation = useMutation({
    mutationFn: generateNextBatchNumber,
  });

  // Helper functions
  const createNewBatch = useCallback(async (data: Omit<CreateBatchData, 'batch_number'>) => {
    try {
      const result = await createBatchMutation.mutateAsync(data);
      return result;
    } catch (error) {
      console.error('Error creating batch:', error);
      throw error;
    }
  }, [createBatchMutation]);

  const updateExistingBatch = useCallback(async (batchId: string, data: UpdateBatchData) => {
    try {
      const result = await updateBatchMutation.mutateAsync({ batchId, data });
      return result;
    } catch (error) {
      console.error('Error updating batch:', error);
      throw error;
    }
  }, [updateBatchMutation]);

  const completeExistingBatch = useCallback(async (batchId: string, actualQuantity: number) => {
    try {
      const result = await completeBatchMutation.mutateAsync({ batchId, actualQuantity });
      return result;
    } catch (error) {
      console.error('Error completing batch:', error);
      throw error;
    }
  }, [completeBatchMutation]);

  const cancelExistingBatch = useCallback(async (batchId: string) => {
    try {
      const result = await cancelBatchMutation.mutateAsync(batchId);
      return result;
    } catch (error) {
      console.error('Error cancelling batch:', error);
      throw error;
    }
  }, [cancelBatchMutation]);

  const deleteExistingBatch = useCallback(async (batchId: string) => {
    try {
      await deleteBatchMutation.mutateAsync(batchId);
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw error;
    }
  }, [deleteBatchMutation]);

  return {
    // Data
    batches,
    activeBatches,
    batchStats,
    
    // Loading states
    isLoadingBatches,
    isLoadingActiveBatches,
    isLoadingStats,
    isCreatingBatch: createBatchMutation.isPending,
    isUpdatingBatch: updateBatchMutation.isPending,
    isCompletingBatch: completeBatchMutation.isPending,
    isCancellingBatch: cancelBatchMutation.isPending,
    isDeletingBatch: deleteBatchMutation.isPending,
    
    // Error states
    batchesError,
    activeBatchesError,
    statsError,
    createBatchError: createBatchMutation.error,
    updateBatchError: updateBatchMutation.error,
    completeBatchError: completeBatchMutation.error,
    cancelBatchError: cancelBatchMutation.error,
    deleteBatchError: deleteBatchMutation.error,
    
    // Actions
    createNewBatch,
    updateExistingBatch,
    completeExistingBatch,
    cancelExistingBatch,
    deleteExistingBatch,
    
    // Refetch functions
    refetchBatches,
    refetchActiveBatches,
    refetchStats,
  };
}
