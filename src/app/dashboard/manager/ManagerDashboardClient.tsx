'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Clock, Package, TrendingUp, FileText, LogOut, ChevronRight, Download, AlertTriangle } from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { ViewAllBatchesModal } from '@/components/modals/ViewAllBatchesModal';
import { ExportAllBatchesModal } from '@/components/modals/ExportAllBatchesModal';
import { useAuth } from '@/hooks/use-auth';
import { useManagerDashboard } from '@/hooks/use-manager-dashboard';
import { useShift } from '@/contexts/ShiftContext';
import { deleteAllBatches, checkAndSaveBatchesToAllBatches } from '@/lib/batches/actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useOptimizedToast } from '@/components/ui/toast-optimized';

interface ManagerDashboardClientProps {
  userName: string;
  currentShift: 'morning' | 'night';
  shiftStartTime: string | null;
  activeBatchesCount: number;
  recentBatches: any[];
  totalBatches: number;
  progressPercentage: number;
}

export default function ManagerDashboardClient({
  userName,
  currentShift: initialShift,
  shiftStartTime,
  activeBatchesCount: initialActiveBatchesCount,
  recentBatches: initialRecentBatches,
  totalBatches: initialTotalBatches,
  progressPercentage: initialProgressPercentage,
}: ManagerDashboardClientProps) {
  const { user } = useAuth();
  const { toast } = useOptimizedToast();
  const { currentShift, setCurrentShift } = useShift();

  // Use the simplified manager dashboard hook with shift filtering
  const {
    data: dashboardData,
    isLoading,
    error,
    refreshData,
  } = useManagerDashboard({
    enabled: true,
  });

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewAllBatchesModalOpen, setIsViewAllBatchesModalOpen] = useState(false);
  const [isExportAllBatchesModalOpen, setIsExportAllBatchesModalOpen] = useState(false);
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

  // Handler for viewing all batches
  const handleViewAllBatches = () => {
    setIsViewAllBatchesModalOpen(true);
  };

  // Handler for exporting all batches
  const handleExportAllBatches = () => {
    setIsExportAllBatchesModalOpen(true);
  };

  // Handler for End Shift button
  const handleEndShift = async () => {
    setIsCheckingBatches(true);
    
    try {
      console.log('🔍 Checking if batches need to be saved to all_batches...');
      
      // First, check if batches need to be saved to all_batches
      const result = await checkAndSaveBatchesToAllBatches();
      
      if (result.needsSaving) {
        console.log(`✅ Successfully saved ${result.savedCount} batch reports to history`);
        // Show success toast for saving reports
        toast({
          title: 'Reports Saved Successfully',
          description: `Successfully saved ${result.savedCount} batch reports to history`,
          type: 'success'
        });
      } else {
        console.log('ℹ️ All batches are already saved to all_batches');
        // Show info toast if no saving was needed
        toast({
          title: 'Reports Already Saved',
          description: 'All batch reports are already saved to history',
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

  // Handler for confirming End Shift
  const handleConfirmEndShift = async () => {
    setIsDeletingBatches(true);
    console.log("Deleting all batches...");
    
    try {
      // Use the server action to delete all batches
      await deleteAllBatches();
      
      console.log("End shift confirmed");
      console.log('All batches deleted');
      
      toast({
        title: 'Success',
        description: 'Shift ended successfully',
        type: 'success'
      });
      
      // Refresh dashboard data
      await refreshData();
      
    } catch (err) {
      console.error('Error ending shift:', err);
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

  // Use dashboard data or fallback to props
  const displayData = dashboardData || {
    activeBatchesCount: initialActiveBatchesCount,
    recentBatches: initialRecentBatches,
    totalBatches: initialTotalBatches,
    progressPercentage: initialProgressPercentage,
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
                  aria-pressed={currentShift === 'morning'}
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
                  aria-pressed={currentShift === 'night'}
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
              {displayData.recentBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="font-medium text-gray-900">{batch.product}</p>
                      <p className="text-sm text-gray-500">Batch #{batch.batchNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{batch.quantity}</p>
                    <p className="text-xs text-gray-500">{batch.time}</p>
                  </div>
                </div>
              ))}
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
          <Link href="/dashboard/reports" legacyBehavior>
            <a className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2">
              <FileText size={24} className="text-purple-500" />
              <span className="text-sm font-medium text-gray-900">Reports</span>
            </a>
          </Link>
        </div>

        {/* End Shift */}
        <div className="mb-6">
          <button
            className="w-full bg-red-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleEndShift}
            disabled={isCheckingBatches || isDeletingBatches}
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
                <span className="font-semibold">End Shift</span>
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            ⚠️ End Shift button saves all batches to reports before ending the shift
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

      {isViewAllBatchesModalOpen && (
        <ViewAllBatchesModal
          isOpen={isViewAllBatchesModalOpen}
          onClose={() => setIsViewAllBatchesModalOpen(false)}
          currentShift={currentShift}
        />
      )}

      {isExportAllBatchesModalOpen && (
        <ExportAllBatchesModal
          isOpen={isExportAllBatchesModalOpen}
          onClose={() => setIsExportAllBatchesModalOpen(false)}
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
                  This will end the {currentShift} shift and clear all active batches.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleConfirmEndShift}
                disabled={isDeletingBatches}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingBatches ? 'Ending...' : 'End Shift'}
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
