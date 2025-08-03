import { useActiveBatches, useBatchStats } from '@/hooks/use-batches-query';
import { useData } from '@/contexts/DataContext';
import { useShift } from '@/contexts/ShiftContext';

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
  
  // Use React Query hooks with polling and shift filtering
  const { 
    data: activeBatches = [], 
    isLoading, 
    error,
    refetch: refetchActiveBatches 
  } = useActiveBatches(60000, currentShift); // Pass currentShift

  const { 
    data: batchStats,
    isLoading: isLoadingStats,
    error: statsError 
  } = useBatchStats(60000, currentShift); // Pass currentShift

  // Use context data as fallback
  const batches = activeBatches.length > 0 ? activeBatches : contextActiveBatches;

  // Process data for dashboard
  const activeBatchesCount = batches.length;
  
  const recentBatches = batches.slice(0, 3).map(batch => ({
    id: batch.id,
    product: (batch as any).bread_type?.name || 'Unknown',
    quantity: batch.actual_quantity || 0,
    status: batch.status,
    time: new Date(batch.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    batchNumber: batch.batch_number || 'N/A',
  }));

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
  };
}
