import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatches, getActiveBatches, createBatch, updateBatch, completeBatch, cancelBatch, deleteBatch, getBatchStats, generateNextBatchNumber } from '@/lib/batches/api-actions';

// Query keys for batches
export const batchQueryKeys = {
  all: ['batches'] as const,
  active: (shift?: 'morning' | 'night') => [...batchQueryKeys.all, 'active', shift] as const,
  stats: (shift?: 'morning' | 'night') => [...batchQueryKeys.all, 'stats', shift] as const,
  byId: (id: string) => [...batchQueryKeys.all, id] as const,
};

// Hook for all batches with polling
export function useBatches(pollingInterval = 60000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: [...batchQueryKeys.all, shift],
    queryFn: async () => {
      return getBatches(shift);
    },
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook for active batches with polling
export function useActiveBatches(pollingInterval = 60000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: batchQueryKeys.active(shift),
    queryFn: async () => {
      return getActiveBatches(shift);
    },
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000,
  });
}

// Hook for batch statistics with polling
export function useBatchStats(pollingInterval = 60000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: batchQueryKeys.stats(shift),
    queryFn: async () => {
      return getBatchStats(shift);
    },
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 60000, // 1 minute for stats
    retry: 2,
    retryDelay: 1000,
  });
}

// Mutations with proper invalidation
export function useBatchMutations() {
  const queryClient = useQueryClient();

  const createBatchMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      // Invalidate all batch queries
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.active() });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats() });
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: any }) =>
      updateBatch(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.active() });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats() });
    },
  });

  const completeBatchMutation = useMutation({
    mutationFn: ({ batchId, actualQuantity }: { batchId: string; actualQuantity: number }) =>
      completeBatch(batchId, actualQuantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.active() });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats() });
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: cancelBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.active() });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats() });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.active() });
      queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats() });
    },
  });

  const generateBatchNumberMutation = useMutation({
    mutationFn: ({ breadTypeId, shift }: { breadTypeId: string; shift?: 'morning' | 'night' }) =>
      generateNextBatchNumber(breadTypeId, shift),
  });

  return {
    createBatch: createBatchMutation.mutateAsync,
    updateBatch: updateBatchMutation.mutateAsync,
    completeBatch: completeBatchMutation.mutateAsync,
    cancelBatch: cancelBatchMutation.mutateAsync,
    deleteBatch: deleteBatchMutation.mutateAsync,
    generateBatchNumber: generateBatchNumberMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    isUpdatingBatch: updateBatchMutation.isPending,
    isCompletingBatch: completeBatchMutation.isPending,
    isCancellingBatch: cancelBatchMutation.isPending,
    isDeletingBatch: deleteBatchMutation.isPending,
    isGeneratingBatchNumber: generateBatchNumberMutation.isPending,
  };
} 