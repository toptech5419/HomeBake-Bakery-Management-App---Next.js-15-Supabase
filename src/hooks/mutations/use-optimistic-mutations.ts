/**
 * Production-ready optimistic mutations for critical user flows
 * Provides instant UI feedback with proper rollback handling
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/react-query/config';
import { Batch, SalesLog, BreadType } from '@/types/database';

/**
 * Optimistic batch creation mutation
 */
export function useOptimisticBatchCreation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBatch: Omit<Batch, 'id' | 'created_at' | 'updated_at'>) => {
      // Your actual API call here
      const { createBatch } = await import('@/lib/batches/actions');
      return createBatch(newBatch);
    },

    // Optimistic update
    onMutate: async (newBatch) => {
      const shift = newBatch.shift;
      const queryKey = QUERY_KEYS.batches.active(shift);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousBatches = queryClient.getQueryData<Batch[]>(queryKey);

      // Optimistically update
      const optimisticBatch: Batch = {
        ...newBatch,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Add visual indicator for optimistic update
        _isOptimistic: true,
      } as Batch & { _isOptimistic: boolean };

      queryClient.setQueryData<Batch[]>(queryKey, (old = []) => [
        optimisticBatch,
        ...old,
      ]);

      return { previousBatches, queryKey, optimisticBatch };
    },

    // Rollback on error
    onError: (error, newBatch, context) => {
      if (context?.previousBatches) {
        queryClient.setQueryData(context.queryKey, context.previousBatches);
      }
      console.error('Batch creation failed:', error);
    },

    // Replace optimistic data with real data on success
    onSuccess: (realBatch, newBatch, context) => {
      const shift = newBatch.shift;
      const queryKey = QUERY_KEYS.batches.active(shift);

      queryClient.setQueryData<Batch[]>(queryKey, (old = []) => {
        // Remove optimistic update and add real data
        const filteredOld = old.filter(batch => 
          !('_isOptimistic' in batch) || batch.id !== context?.optimisticBatch?.id
        );
        return [realBatch, ...filteredOld];
      });
    },

    // Always refetch to ensure consistency
    onSettled: (_, __, newBatch) => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.batches.active(newBatch.shift) 
      });
    },
  });
}

/**
 * Optimistic sales recording mutation
 */
export function useOptimisticSalesRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (salesData: Omit<SalesLog, 'id' | 'created_at' | 'updated_at'>) => {
      const { recordSale } = await import('@/lib/sales/actions');
      return recordSale(salesData);
    },

    onMutate: async (salesData) => {
      const shift = salesData.shift;
      const salesQueryKey = ['sales', 'current', shift];
      const inventoryQueryKey = QUERY_KEYS.inventory.current();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: salesQueryKey });
      await queryClient.cancelQueries({ queryKey: inventoryQueryKey });

      // Snapshot previous values
      const previousSales = queryClient.getQueryData<SalesLog[]>(salesQueryKey);
      const previousInventory = queryClient.getQueryData(inventoryQueryKey);

      // Optimistically update sales
      const optimisticSale: SalesLog & { _isOptimistic: boolean } = {
        ...salesData,
        id: `temp-sale-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _isOptimistic: true,
      } as SalesLog & { _isOptimistic: boolean };

      queryClient.setQueryData<SalesLog[]>(salesQueryKey, (old = []) => [
        optimisticSale,
        ...old,
      ]);

      // Optimistically update inventory
      queryClient.setQueryData(inventoryQueryKey, (old: any[]) => {
        if (!old) return old;
        return old.map(item => {
          if (item.bread_type_id === salesData.bread_type_id) {
            return {
              ...item,
              quantity: Math.max(0, item.quantity - salesData.quantity),
              last_updated: new Date().toISOString(),
            };
          }
          return item;
        });
      });

      return { 
        previousSales, 
        previousInventory, 
        salesQueryKey, 
        inventoryQueryKey, 
        optimisticSale 
      };
    },

    onError: (error, salesData, context) => {
      // Rollback both sales and inventory
      if (context?.previousSales) {
        queryClient.setQueryData(context.salesQueryKey, context.previousSales);
      }
      if (context?.previousInventory) {
        queryClient.setQueryData(context.inventoryQueryKey, context.previousInventory);
      }
      console.error('Sales recording failed:', error);
    },

    onSuccess: (realSale, salesData, context) => {
      const shift = salesData.shift;
      const salesQueryKey = ['sales', 'current', shift];

      // Replace optimistic sale with real data
      queryClient.setQueryData<SalesLog[]>(salesQueryKey, (old = []) => {
        const filteredOld = old.filter(sale => 
          !('_isOptimistic' in sale) || sale.id !== context?.optimisticSale?.id
        );
        return [realSale, ...filteredOld];
      });
    },

    onSettled: (_, __, salesData) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['sales', 'current', salesData.shift] 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.inventory.current() 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.reports.all() 
      });
    },
  });
}

/**
 * Optimistic batch completion mutation
 */
export function useOptimisticBatchCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      batchId, 
      actualQuantity, 
      notes 
    }: { 
      batchId: string; 
      actualQuantity: number; 
      notes?: string; 
    }) => {
      const { completeBatch } = await import('@/lib/batches/actions');
      return completeBatch(batchId, actualQuantity, notes);
    },

    onMutate: async ({ batchId, actualQuantity, notes }) => {
      // Find the batch in all possible query keys
      const activeBatchKeys = [
        QUERY_KEYS.batches.active('morning'),
        QUERY_KEYS.batches.active('night'),
        QUERY_KEYS.batches.active(),
      ];

      let foundQueryKey: typeof activeBatchKeys[0] | null = null;
      let previousBatches: Batch[] | undefined;

      // Cancel all batch queries
      await Promise.all(
        activeBatchKeys.map(key => queryClient.cancelQueries({ queryKey: key }))
      );

      // Find which query contains our batch and update optimistically
      for (const queryKey of activeBatchKeys) {
        const batches = queryClient.getQueryData<Batch[]>(queryKey);
        if (batches?.some(batch => batch.id === batchId)) {
          foundQueryKey = queryKey;
          previousBatches = batches;

          // Optimistically complete the batch
          queryClient.setQueryData<Batch[]>(queryKey, batches.map(batch => {
            if (batch.id === batchId) {
              return {
                ...batch,
                status: 'completed' as const,
                actual_quantity: actualQuantity,
                end_time: new Date().toISOString(),
                notes: notes || batch.notes,
                updated_at: new Date().toISOString(),
                _isOptimistic: true,
              } as Batch & { _isOptimistic: boolean };
            }
            return batch;
          }));
          break;
        }
      }

      return { foundQueryKey, previousBatches };
    },

    onError: (error, variables, context) => {
      // Rollback the optimistic update
      if (context?.foundQueryKey && context?.previousBatches) {
        queryClient.setQueryData(context.foundQueryKey, context.previousBatches);
      }
      console.error('Batch completion failed:', error);
    },

    onSuccess: (realBatch, variables, context) => {
      // Replace optimistic data with real data
      if (context?.foundQueryKey) {
        queryClient.setQueryData<Batch[]>(context.foundQueryKey, (old = []) => 
          old.map(batch => {
            if (batch.id === variables.batchId) {
              // Remove optimistic flag and use real data
              const { _isOptimistic, ...cleanBatch } = batch as any;
              return realBatch;
            }
            return batch;
          })
        );
      }
    },

    onSettled: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.batches.all() 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.inventory.all() 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.reports.all() 
      });
    },
  });
}

/**
 * Optimistic bread type creation mutation
 */
export function useOptimisticBreadTypeCreation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (breadTypeData: Omit<BreadType, 'id' | 'created_at'>) => {
      const { createBreadType } = await import('@/lib/bread-types/actions');
      return createBreadType(breadTypeData);
    },

    onMutate: async (breadTypeData) => {
      const queryKey = QUERY_KEYS.breadTypes.active();

      await queryClient.cancelQueries({ queryKey });

      const previousBreadTypes = queryClient.getQueryData<BreadType[]>(queryKey);

      const optimisticBreadType: BreadType & { _isOptimistic: boolean } = {
        ...breadTypeData,
        id: `temp-breadtype-${Date.now()}`,
        created_at: new Date().toISOString(),
        _isOptimistic: true,
      } as BreadType & { _isOptimistic: boolean };

      queryClient.setQueryData<BreadType[]>(queryKey, (old = []) => [
        optimisticBreadType,
        ...old,
      ]);

      return { previousBreadTypes, queryKey, optimisticBreadType };
    },

    onError: (error, variables, context) => {
      if (context?.previousBreadTypes) {
        queryClient.setQueryData(context.queryKey, context.previousBreadTypes);
      }
      console.error('Bread type creation failed:', error);
    },

    onSuccess: (realBreadType, variables, context) => {
      const queryKey = QUERY_KEYS.breadTypes.active();

      queryClient.setQueryData<BreadType[]>(queryKey, (old = []) => {
        const filteredOld = old.filter(breadType => 
          !('_isOptimistic' in breadType) || breadType.id !== context?.optimisticBreadType?.id
        );
        return [realBreadType, ...filteredOld];
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.breadTypes.all() 
      });
    },
  });
}

/**
 * Hook for handling optimistic updates with error boundaries
 */
export function useOptimisticMutationWithErrorBoundary<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimisticUpdater: (variables: TVariables) => void,
  errorRollback: (variables: TVariables) => void,
  queryKeysToInvalidate: readonly unknown[][]
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    onMutate: async (variables) => {
      try {
        optimisticUpdater(variables);
      } catch (error) {
        console.error('Optimistic update failed:', error);
      }
    },

    onError: (error, variables) => {
      try {
        errorRollback(variables);
      } catch (rollbackError) {
        console.error('Error rollback failed:', rollbackError);
        // Force refetch if rollback fails
        queryKeysToInvalidate.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },

    onSettled: () => {
      // Always invalidate to ensure consistency
      queryKeysToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
  });
}