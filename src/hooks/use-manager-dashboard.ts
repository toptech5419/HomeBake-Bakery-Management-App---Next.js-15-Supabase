import { useActiveBatches, useBatchStats } from '@/hooks/use-batches-query';
import { useData } from '@/contexts/DataContext';
import { useShift } from '@/contexts/ShiftContext';
import { useRealtimeBatches } from '@/hooks/use-realtime-batches';

interface ManagerDashboardData {
  activeBatchesCount: number;
  recentBatches: Array<{
    id: string;
    product: string;
    quantity: number;
    status: string;
    time: string;
    batchNumber: string;
  }>;
  totalBatches: number;
  progressPercentage: number;
}

interface UseManagerDashboardOptions {
  enabled?: boolean;
}

export function useManagerDashboard(options: UseManagerDashboardOptions = {}) {
  const { enabled = true } = options;
  const { currentShift } = useShift(); // Get current shift from context
  const { activeBatches: contextActiveBatches } = useData();
  
  // Use production-optimized polling intervals
  const { 
    data: activeBatches = [], 
    isLoading, 
    error,
    refetch: refetchActiveBatches 
  } = useActiveBatches(15000, currentShift); // 15 seconds - balanced for production

  const { 
    data: batchStats,
    isLoading: isLoadingStats,
    error: statsError 
  } = useBatchStats(60000, currentShift); // 60 seconds for stats

  // Setup production-ready real-time subscriptions for instant updates
  const { connectionState } = useRealtimeBatches({
    enabled,
    shift: currentShift,
    onBatchChange: (event, payload) => {
      console.log(`📡 Manager dashboard received real-time batch ${event} for ${currentShift} shift`);
      // The useRealtimeBatches hook handles query invalidation automatically
    }
  });

  // Use context data as fallback
  const batches = activeBatches.length > 0 ? activeBatches : contextActiveBatches;

  // Process data for dashboard
  const activeBatchesCount = batches.length;
  
  const recentBatches = batches.slice(0, 3).map(batch => {
    // Handle both optimistic updates (bread_type) and server data (bread_type)
    const batchData = batch as any;
    const breadTypeName = batchData.bread_type?.name || 
                         batchData.bread_types?.name || 
                         'Loading...';
    
    // Debug logging for optimistic updates
    if (batchData._isOptimistic || batchData.id?.startsWith('temp-')) {
      console.log('🔍 Manager Dashboard - Processing optimistic batch:', {
        id: batchData.id,
        batchNumber: batchData.batch_number,
        breadType: batchData.bread_type,
        breadTypes: batchData.bread_types,
        resolvedName: breadTypeName
      });
    }
    
    return {
      id: batch.id,
      product: breadTypeName,
      quantity: batch.actual_quantity || 0,
      status: batch.status,
      time: new Date(batch.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      batchNumber: batch.batch_number || 'N/A',
    };
  });

  const progressPercentage = Math.min(100, Math.max(0, (activeBatchesCount * 15)));

  const dashboardData: ManagerDashboardData = {
    activeBatchesCount,
    recentBatches,
    totalBatches: activeBatchesCount,
    progressPercentage,
  };

  return {
    data: dashboardData,
    isLoading: isLoading || isLoadingStats,
    error: error || statsError,
    refreshData: refetchActiveBatches,
    // Expose connection state for debugging/monitoring
    realtimeConnectionState: connectionState,
  };
}
