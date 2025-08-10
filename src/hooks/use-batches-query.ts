import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatches, getActiveBatches, createBatch, updateBatch, completeBatch, cancelBatch, deleteBatch, getBatchStats, generateNextBatchNumber } from '@/lib/batches/api-actions';

// Query keys for batches
export const batchQueryKeys = {
  all: ['batches'] as const,
  active: (shift?: 'morning' | 'night') => [...batchQueryKeys.all, 'active', shift] as const,
  stats: (shift?: 'morning' | 'night') => [...batchQueryKeys.all, 'stats', shift] as const,
  byId: (id: string) => [...batchQueryKeys.all, id] as const,
};

// Hook for all batches with production-optimized polling
export function useBatches(pollingInterval = 30000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: [...batchQueryKeys.all, shift],
    queryFn: async () => {
      return getBatches(shift);
    },
    refetchInterval: pollingInterval, // 30 seconds - balanced for production
    refetchIntervalInBackground: false, // Conserve resources when tab not active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true, // Refresh when network reconnects
    staleTime: 15000, // Data considered fresh for 15 seconds
    retry: 3, // More retries for production reliability
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

// Hook for active batches with production-optimized polling
export function useActiveBatches(pollingInterval = 15000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: batchQueryKeys.active(shift),
    queryFn: async () => {
      return getActiveBatches(shift);
    },
    refetchInterval: pollingInterval, // 15 seconds for active batches (more frequent)
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000, // Data considered fresh for 10 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable network mode for better UX during network issues
    networkMode: 'offlineFirst',
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
    // Conservative optimistic update with production-ready error handling
    onMutate: async (newBatchData) => {
      const shift = newBatchData.shift;
      
      try {
        console.log('🚀 Applying optimistic update with bread type info...');
        console.log('📦 newBatchData.breadTypeInfo:', newBatchData.breadTypeInfo);
        
        // Cancel any outgoing refetches to prevent race conditions
        await queryClient.cancelQueries({ queryKey: batchQueryKeys.active(shift) });

        // Snapshot the previous value for rollback
        const previousBatches = queryClient.getQueryData(batchQueryKeys.active(shift));

        // Try to get bread type information from the mutation data or fetch it
        let breadTypeInfo = null;
        if (newBatchData.breadTypeInfo) {
          // Use provided bread type info from the modal
          breadTypeInfo = {
            id: newBatchData.breadTypeInfo.id,
            name: newBatchData.breadTypeInfo.name,
            size: newBatchData.breadTypeInfo.size,
            unit_price: newBatchData.breadTypeInfo.unit_price,
          };
        } else {
          // Fallback: Try to get it from existing batch data
          const existingBatches = previousBatches as any[];
          if (existingBatches && existingBatches.length > 0) {
            const existingBatch = existingBatches.find((batch: any) => 
              batch.bread_type_id === newBatchData.bread_type_id && batch.bread_type
            );
            if (existingBatch?.bread_type) {
              breadTypeInfo = existingBatch.bread_type;
            }
          }
        }

        console.log('🔍 Final breadTypeInfo for optimistic update:', breadTypeInfo);

        // Only apply optimistic update if we have valid data
        if (Array.isArray(previousBatches)) {
          // Generate a temporary batch number
          const tempBatchNumber = `TMP-${Date.now().toString().slice(-6)}`;
          
          // Create optimistic batch with proper bread type info
          const optimisticBatch = {
            id: `temp-${Date.now()}`, // Temporary ID with clear prefix
            bread_type_id: newBatchData.bread_type_id,
            batch_number: tempBatchNumber, // Temporary but realistic batch number
            start_time: new Date().toISOString(),
            end_time: null,
            actual_quantity: newBatchData.actual_quantity || 0,
            status: 'active' as const,
            notes: newBatchData.notes || null,
            created_by: 'pending', // Clear pending state
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            shift: shift,
            // Include bread type information for immediate display
            bread_type: breadTypeInfo ? {
              id: breadTypeInfo.id,
              name: breadTypeInfo.name,
              size: breadTypeInfo.size,
              unit_price: breadTypeInfo.unit_price
            } : {
              id: newBatchData.bread_type_id,
              name: 'Loading...', // Only use Loading when we don't have breadTypeInfo
              size: null,
              unit_price: 0
            },
            created_by_user: { name: 'You', email: '' }, // User-friendly display
            // Add loading flag for UI handling
            _isOptimistic: true
          };

          queryClient.setQueryData(batchQueryKeys.active(shift), [optimisticBatch, ...previousBatches]);
          console.log('✅ Optimistic update applied with bread type:', breadTypeInfo?.name || 'Loading...');
        }

        return { previousBatches, shift };
      } catch (error) {
        console.error('❌ Failed to apply optimistic update:', error);
        // Return context even if optimistic update fails
        return { previousBatches: queryClient.getQueryData(batchQueryKeys.active(shift)), shift };
      }
    },
    onError: (error, newBatchData, context) => {
      console.error('❌ Batch creation failed:', error);
      
      // Rollback optimistic update with error handling
      if (context?.previousBatches && context?.shift) {
        try {
          queryClient.setQueryData(batchQueryKeys.active(context.shift), context.previousBatches);
          console.log('✅ Optimistic update rolled back successfully');
        } catch (rollbackError) {
          console.error('❌ Failed to rollback optimistic update:', rollbackError);
          // Fallback: invalidate queries to refresh from server
          queryClient.invalidateQueries({ queryKey: batchQueryKeys.active(context.shift) });
        }
      }
    },
    onSuccess: (createdBatch, newBatchData, context) => {
      const shift = newBatchData.shift;
      
      try {
        console.log('✅ Batch creation successful, replacing optimistic data...');
        
        // Replace optimistic data with real server response
        queryClient.setQueryData(batchQueryKeys.active(shift), (old: any) => {
          if (!Array.isArray(old)) return [createdBatch];
          
          // Remove any temporary/optimistic batches and add real batch
          const filteredOld = old.filter(batch => 
            !batch.id.startsWith('temp-') && 
            !batch._isOptimistic
          );
          
          return [createdBatch, ...filteredOld];
        });

        // Invalidate related queries for consistency (non-blocking)
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: batchQueryKeys.stats(shift) });
        }, 100);
        
        console.log('✅ Batch data updated with real server response');
      } catch (error) {
        console.error('❌ Failed to update with real data:', error);
        // Fallback: invalidate to refresh from server
        queryClient.invalidateQueries({ queryKey: batchQueryKeys.active(shift) });
      }
    },
    // Production-ready retry configuration
    retry: (failureCount, error) => {
      // Don't retry on certain errors (e.g., validation errors)
      if (error?.message?.includes('validation') || error?.message?.includes('required')) {
        return false;
      }
      // Retry up to 2 times for network/server errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Max 5 second delay
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

  return {
    createBatch: createBatchMutation.mutateAsync,
    updateBatch: updateBatchMutation.mutateAsync,
    completeBatch: completeBatchMutation.mutateAsync,
    cancelBatch: cancelBatchMutation.mutateAsync,
    deleteBatch: deleteBatchMutation.mutateAsync,
    isCreatingBatch: createBatchMutation.isPending,
    isUpdatingBatch: updateBatchMutation.isPending,
    isCompletingBatch: completeBatchMutation.isPending,
    isCancellingBatch: cancelBatchMutation.isPending,
    isDeletingBatch: deleteBatchMutation.isPending,
  };
} 