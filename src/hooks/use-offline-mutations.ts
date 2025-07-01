'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineStatus } from './use-offline';
import { OfflineQueue } from '@/lib/offline/queue';
import { OfflineStorage } from '@/lib/offline/storage';
import { useInventoryMutations } from './use-inventory';
import { toast } from 'sonner';
import type { Database } from '@/types/supabase';

type SalesLogInsert = Database['public']['Tables']['sales_logs']['Insert'];
type ProductionLogInsert = Database['public']['Tables']['production_logs']['Insert'];
type ShiftFeedbackInsert = Database['public']['Tables']['shift_feedback']['Insert'];

export function useOfflineSalesMutation(userId: string) {
  const { isOnline } = useOfflineStatus();
  const { addSale } = useInventoryMutations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SalesLogInsert) => {
      if (isOnline) {
        // Use existing online mutation
        return await addSale.mutateAsync(data);
      } else {
        // Queue for offline sync
        const offlineId = OfflineStorage.generateOfflineId();
        const salesData = {
          ...data,
          id: offlineId,
          created_at: new Date().toISOString()
        };

        // Add to offline queue
        await OfflineQueue.addSalesLog(salesData, userId);

        // Cache locally with optimistic data
        await OfflineStorage.cacheSalesLog({
          ...salesData,
          unit_price: salesData.unit_price ?? null,
          discount: salesData.discount ?? null,
          returned: salesData.returned ?? false,
          leftover: salesData.leftover ?? null,
          _syncStatus: 'pending'
        });

        // Invalidate React Query cache to trigger refetch of local data
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });

        return salesData;
      }
    },
    onSuccess: (data) => {
      if (isOnline) {
        toast.success('Sale recorded successfully');
      } else {
        toast.success('Sale saved offline. Will sync when connection is restored.');
      }
    },
    onError: (error) => {
      console.error('Sales mutation error:', error);
      if (isOnline) {
        toast.error('Failed to record sale');
      } else {
        toast.error('Failed to save sale offline');
      }
    }
  });
}

export function useOfflineProductionMutation(userId: string) {
  const { isOnline } = useOfflineStatus();
  const { addProduction } = useInventoryMutations();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductionLogInsert) => {
      if (isOnline) {
        // Use existing online mutation
        return await addProduction.mutateAsync(data);
      } else {
        // Queue for offline sync
        const offlineId = OfflineStorage.generateOfflineId();
        const productionData = {
          ...data,
          id: offlineId,
          created_at: new Date().toISOString()
        };

        // Add to offline queue
        await OfflineQueue.addProductionLog(productionData, userId);

        // Cache locally with optimistic data
        await OfflineStorage.cacheProductionLog({
          ...productionData,
          _syncStatus: 'pending'
        });

        // Invalidate React Query cache to trigger refetch of local data
        queryClient.invalidateQueries({ queryKey: ['production'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });

        return productionData;
      }
    },
    onSuccess: (data) => {
      if (isOnline) {
        toast.success('Production recorded successfully');
      } else {
        toast.success('Production saved offline. Will sync when connection is restored.');
      }
    },
    onError: (error) => {
      console.error('Production mutation error:', error);
      if (isOnline) {
        toast.error('Failed to record production');
      } else {
        toast.error('Failed to save production offline');
      }
    }
  });
}

export function useOfflineShiftFeedbackMutation(userId: string) {
  const { isOnline } = useOfflineStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ShiftFeedbackInsert) => {
      if (isOnline) {
        // TODO: Implement online shift feedback submission
        // For now, just simulate the API call
        return data;
      } else {
        // Queue for offline sync
        const offlineId = OfflineStorage.generateOfflineId();
        const feedbackData = {
          ...data,
          id: offlineId,
          created_at: new Date().toISOString()
        };

        // Add to offline queue
        await OfflineQueue.addShiftFeedback(feedbackData, userId);

        // Cache locally
        await OfflineStorage.cacheShiftFeedback({
          ...feedbackData,
          note: feedbackData.note ?? null,
          _syncStatus: 'pending'
        });

        return feedbackData;
      }
    },
    onSuccess: (data) => {
      if (isOnline) {
        toast.success('Feedback submitted successfully');
      } else {
        toast.success('Feedback saved offline. Will sync when connection is restored.');
      }
    },
    onError: (error) => {
      console.error('Shift feedback mutation error:', error);
      if (isOnline) {
        toast.error('Failed to submit feedback');
      } else {
        toast.error('Failed to save feedback offline');
      }
    }
  });
}

// Hook for updating existing records
export function useOfflineUpdateMutation(userId: string) {
  const { isOnline } = useOfflineStatus();
  const { updateSale, updateProduction } = useInventoryMutations();
  const queryClient = useQueryClient();

  const updateSalesLog = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesLogInsert> }) => {
      if (isOnline) {
        return await updateSale.mutateAsync({ id, updates: data });
      } else {
        // Queue update for offline sync
        await OfflineQueue.updateSalesLog(id, data, userId);
        
        // Update local cache
        // Note: This would need more complex logic to merge with existing cached data
        
        return { id, ...data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      if (isOnline) {
        toast.success('Sale updated successfully');
      } else {
        toast.success('Sale update saved offline. Will sync when connection is restored.');
      }
    },
    onError: (error) => {
      console.error('Sales update error:', error);
      toast.error('Failed to update sale');
    }
  });

  const updateProductionLog = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductionLogInsert> }) => {
      if (isOnline) {
        return await updateProduction.mutateAsync({ id, updates: data });
      } else {
        // Queue update for offline sync
        await OfflineQueue.updateProductionLog(id, data, userId);
        
        return { id, ...data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      if (isOnline) {
        toast.success('Production updated successfully');
      } else {
        toast.success('Production update saved offline. Will sync when connection is restored.');
      }
    },
    onError: (error) => {
      console.error('Production update error:', error);
      toast.error('Failed to update production');
    }
  });

  return {
    updateSalesLog,
    updateProductionLog
  };
}

// Helper hook to get offline-aware data
export function useOfflineInventoryData() {
  const { isOnline } = useOfflineStatus();
  
  // This would be extended to merge online and offline data
  // For now, we'll rely on the existing React Query hooks
  // but this provides a foundation for offline-first data fetching
  
  return {
    isOnline,
    // TODO: Implement offline-first data fetching that combines
    // cached offline data with online data when available
  };
}