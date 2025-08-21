'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Package, FileText, LogOut, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { useManagerDashboard } from '@/hooks/use-manager-dashboard';
import { useShift } from '@/contexts/ShiftContext';
import { useData } from '@/contexts/DataContext';
import { deleteAllBatches, checkAndSaveBatchesToAllBatches } from '@/lib/batches/actions';
import { logEndShiftActivity } from '@/lib/activities/server-activity-service';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useOptimizedToast } from '@/components/ui/toast-optimized';
import { useQueryClient } from '@tanstack/react-query';
// Removed unreliable performance scheduler imports

interface RecentBatch {
  id: string;
  product: string;
  quantity: number;
  status: string;
  time: string;
  batchNumber: string;
  shift: 'morning' | 'night';
}

interface ManagerDashboardClientProps {
  userName: string;
  userId: string;
  shiftStartTime: string | null;
  activeBatchesCount: number;
  recentBatches: RecentBatch[];
  totalBatches: number;
  progressPercentage: number;
}

export default function ManagerDashboardClient({
  userName,
  userId,
  shiftStartTime,
  recentBatches: initialRecentBatches,
}: ManagerDashboardClientProps) {
  const { toast } = useOptimizedToast();
  const { currentShift, setCurrentShift } = useShift();
  useData();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Use the simplified manager dashboard hook with shift filtering
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useManagerDashboard({
    enabled: true,
  });

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [isDeletingBatches, setIsDeletingBatches] = useState(false);
  const [isCheckingBatches, setIsCheckingBatches] = useState(false);

  // Format shift start time
  const shiftStartLabel = shiftStartTime
    ? `Active since ${new Date(shiftStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Active';

  // Handler for shift toggle
  const handleShiftToggle = (shift: 'morning' | 'night') => {
    setCurrentShift(shift);
  };

  // Handler for batch creation
  const handleBatchCreated = () => {
    setIsModalOpen(false);
    // React Query will automatically refetch data
    // DataContext will also update via polling
  };

  // Handler for viewing all batches - Navigate to page instead of modal
  const handleViewAllBatches = () => {
    router.push('/dashboard/manager/all-production-batches');
  };

  // Handler for exporting all batches - Navigate to page instead of modal
  const handleExportAllBatches = () => {
    router.push('/dashboard/manager/export-production-batches');
  };

  // Handler for End Shift button
  const handleEndShift = async () => {
    setIsCheckingBatches(true);
    
    try {
      console.log(`🔍 Checking if ${currentShift} shift batches need to be saved to all_batches...`);
      
      // First, check if batches need to be saved to all_batches (filtered by current shift)
      const result = await checkAndSaveBatchesToAllBatches(currentShift);
      
      if (result.needsSaving) {
        console.log(`✅ Successfully saved ${result.savedCount} ${currentShift} shift batch reports to history`);
        // Show success toast for saving reports
        toast({
          title: 'Reports Saved Successfully',
          description: `Successfully saved ${result.savedCount} ${currentShift} shift batch reports to history`,
          type: 'success'
        });
      } else {
        console.log(`ℹ️ All ${currentShift} shift batches are already saved to all_batches`);
        // Show "saved already!" message as requested
        toast({
          title: 'Saved Already!',
          description: `All ${currentShift} shift batch reports are already saved to history`,
          type: 'success'
        });
      }
      
      // Now show the confirmation modal
      setShowEndShiftModal(true);
      
    } catch (err) {
      console.error('❌ Error checking/saving batches:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check batch reports. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setIsCheckingBatches(false);
    }
  };

  // PRODUCTION-READY: Clean, efficient End Shift handler
  const handleConfirmEndShift = async () => {
    setIsDeletingBatches(true);
    
    try {
      console.log(`🔥 Starting End Shift for ${currentShift} shift...`);
      
      // 1. Delete batches from database
      await deleteAllBatches(currentShift);
      
      // 2. Clear React Query cache immediately
      queryClient.removeQueries({ 
        queryKey: ['batches'],
        type: 'all'
      });
      
      // Set empty state in cache
      queryClient.setQueryData(['batches', 'active', currentShift], []);
      queryClient.setQueryData(['manager-dashboard'], {
        activeBatchesCount: 0,
        recentBatches: [],
        totalBatches: 0,
        progressPercentage: 0
      });
      
      // 3. Log activity (non-blocking)
      try {
        await logEndShiftActivity({
          user_id: userId,
          user_name: userName,
          user_role: 'manager',
          shift: currentShift as 'morning' | 'night'
        });
      } catch (activityError) {
        console.error('Activity logging failed:', activityError);
      }
      
      // 4. Show success message
      toast({
        title: 'Success',
        description: `${currentShift} shift ended successfully`,
        type: 'success'
      });
      
      console.log(`✅ End shift completed for ${currentShift} shift`);
      
    } catch (err) {
      console.error('❌ End shift failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to end shift. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        type: 'error'
      });
    } finally {
      setIsDeletingBatches(false);
      setShowEndShiftModal(false);
    }
  };

  // Handler for canceling End Shift
  const handleCancelEndShift = () => {
    setShowEndShiftModal(false);
  };

  // Filter initial server data by user's current shift preference
  const filteredInitialBatches = initialRecentBatches.filter(batch => batch.shift === currentShift);
  const filteredInitialCount = filteredInitialBatches.length;

  // Use dashboard data or fallback to filtered props
  const displayData = dashboardData || {
    activeBatchesCount: filteredInitialCount,
    recentBatches: filteredInitialBatches,
    totalBatches: filteredInitialCount,
    progressPercentage: Math.min(100, Math.max(0, (filteredInitialCount * 15))),
  };

  // Helper function to get shift label
  const shiftLabel = (shift: 'morning' | 'night') => {
    return shift === 'morning' ? '🌅 Morning Shift' : '🌙 Night Shift';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Error loading dashboard</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Production Manager</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">
                {shiftLabel(currentShift)} • {shiftStartLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Toggle Card */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Current Shift</h3>
              <p className="text-sm text-gray-500">{shiftStartLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleShiftToggle('morning')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentShift === 'morning'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                  aria-pressed={currentShift === 'morning' ? "true" : "false"}
                >
                  Morning
                </button>
                <button
                  onClick={() => handleShiftToggle('night')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentShift === 'night'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600'
                  }`}
                  aria-pressed={currentShift === 'night' ? "true" : "false"}
                >
                  Night
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Only Active Batches */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{displayData.activeBatchesCount}</div>
            <div className="text-sm text-gray-600">Active Batches</div>
          </div>
        </div>

        {/* Create Batch - Primary Action */}
        <div className="mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-orange-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={20} />
            <span className="font-semibold">Create New Batch</span>
          </button>
        </div>

        {/* Recent Batches */}
        {displayData.recentBatches.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Batches</h3>
              <button
                onClick={handleViewAllBatches}
                className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                View All
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {displayData.recentBatches.map((batch) => {
                // Check if this is an optimistic/loading batch
                const isOptimistic = batch.id?.startsWith('temp-') || batch.batchNumber?.startsWith('TMP-') || batch.batchNumber === 'Creating...';
                
                return (
                  <div 
                    key={batch.id} 
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                      isOptimistic 
                        ? 'bg-orange-50 border border-orange-200 animate-pulse' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isOptimistic ? 'bg-orange-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className={`font-medium ${
                          isOptimistic ? 'text-orange-800' : 'text-gray-900'
                        }`}>
                          {batch.product}
                          {isOptimistic && <span className="ml-2 text-xs">(Creating...)</span>}
                        </p>
                        <p className={`text-sm ${
                          isOptimistic ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          Batch #{batch.batchNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        isOptimistic ? 'text-orange-800' : 'text-gray-900'
                      }`}>
                        {batch.quantity}
                      </p>
                      <p className={`text-xs ${
                        isOptimistic ? 'text-orange-600' : 'text-gray-500'
                      }`}>
                        {batch.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleViewAllBatches}
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Clock size={24} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-900">All Batches</span>
          </button>
          <button
            onClick={handleExportAllBatches}
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Download size={24} className="text-green-500" />
            <span className="text-sm font-medium text-gray-900">Export All</span>
          </button>
          <Link href="/dashboard/reports" className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2">
            <FileText size={24} className="text-purple-500" />
            <span className="text-sm font-medium text-gray-900">Reports</span>
          </Link>
        </div>

        {/* End Shift */}
        <div className="mb-6">
          <button
            className="w-full bg-red-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleEndShift}
            disabled={isCheckingBatches || isDeletingBatches || displayData.activeBatchesCount === 0}
          >
            {isCheckingBatches ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Checking Reports...</span>
              </>
            ) : isDeletingBatches ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold">Ending Shift...</span>
              </>
            ) : (
              <>
                <LogOut size={20} />
                <span className="font-semibold">
                  {displayData.activeBatchesCount === 0 ? 'No Batches to End' : 'End Shift'}
                </span>
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {displayData.activeBatchesCount === 0 
              ? '⚠️ Create batches first before ending shift'
              : '⚠️ End Shift button saves all batches to reports before ending the current shift only'
            }
          </p>
        </div>
      </div>



      {/* Modals */}
      {isModalOpen && (
        <CreateBatchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onBatchCreated={handleBatchCreated}
          currentShift={currentShift}
        />
      )}



      {/* End Shift Modal */}
      {showEndShiftModal && (
        <Modal
          isOpen={showEndShiftModal}
          onClose={() => setShowEndShiftModal(false)}
          title="End Shift"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <div>
                <h3 className="font-semibold text-gray-900">End Current Shift?</h3>
                <p className="text-sm text-gray-600">
                  This will end the {currentShift} shift and clear only the {currentShift} shift batches for today.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleConfirmEndShift}
                disabled={isDeletingBatches}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingBatches ? 'Ending...' : `End ${currentShift} Shift`}
              </Button>
              <Button
                onClick={handleCancelEndShift}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
