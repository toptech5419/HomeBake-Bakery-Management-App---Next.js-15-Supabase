'use client';

import React, { useState } from 'react';
import { useActiveBatches } from '@/hooks/use-batches-query';
import { useShift } from '@/contexts/ShiftContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Download, PlusCircle, FileText } from 'lucide-react';
import { CreateBatchModal } from '@/components/modals/CreateBatchModal';
import { ExportAllBatchesModal } from '@/components/modals/ExportAllBatchesModal';
import { ViewAllBatchesModal } from '@/components/modals/ViewAllBatchesModal';
import { format } from 'date-fns';
import { useOptimizedToast } from '@/components/ui/toast-optimized';

interface ProductionClientProps {
  userRole: string;
  userId: string;
}

export function ProductionClient({ userRole, userId }: ProductionClientProps) {
  const { currentShift } = useShift();
  const { toast } = useOptimizedToast();
  
  // Use the same pattern as manager dashboard for fetching batches
  const { 
    data: activeBatches = [], 
    isLoading, 
    error,
    refetch: refreshBatches 
  } = useActiveBatches(60000, currentShift);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);

  // Handle batch creation success
  const handleBatchCreated = () => {
    setIsCreateModalOpen(false);
    toast({
      title: 'Success',
      description: 'New batch created successfully',
      type: 'success'
    });
  };

  // Handle export all
  const handleExportAll = () => {
    setIsExportModalOpen(true);
  };

  // Handle reports
  const handleReports = () => {
    setIsViewAllModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Production Management</h1>
          <div className="text-sm text-gray-500">{currentShift} Shift - Active</div>
        </div>
        
        <Card>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center border-b pb-2 animate-pulse">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-8"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Production Management</h1>
          <div className="text-sm text-gray-500">{currentShift} Shift - Active</div>
        </div>
        
        <Card variant="error">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">Failed to load batches</p>
            <Button onClick={() => refreshBatches()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (activeBatches.length === 0) {
    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Production Management</h1>
          <div className="text-sm text-gray-500">{currentShift} Shift - Active</div>
        </div>

        {/* Empty Batches Section */}
        <Card>
          <CardHeader className="text-lg font-medium">Current Batches</CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-8 text-gray-500">
              <p>No active batches</p>
              <p className="text-sm mt-2">Create a new batch to get started</p>
            </div>
          </CardContent>
        </Card>

        {/* Create New Batch Button */}
        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold py-6 flex items-center justify-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusCircle size={20} />
          <span>Create New Batch</span>
        </Button>

        {/* Export & Reports */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            className="flex items-center justify-center py-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow gap-2"
            onClick={handleExportAll}
          >
            <Download />
            <span>Export All</span>
          </Button>
          <Button 
            className="flex items-center justify-center py-6 bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow gap-2"
            onClick={handleReports}
          >
            <FileText />
            <span>Reports</span>
          </Button>
        </div>

        {/* Modals */}
        {isCreateModalOpen && (
          <CreateBatchModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onBatchCreated={handleBatchCreated}
            currentShift={currentShift}
          />
        )}

        {isExportModalOpen && (
          <ExportAllBatchesModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            currentShift={currentShift}
          />
        )}

        {isViewAllModalOpen && (
          <ViewAllBatchesModal
            isOpen={isViewAllModalOpen}
            onClose={() => setIsViewAllModalOpen(false)}
            currentShift={currentShift}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Production Management</h1>
        <div className="text-sm text-gray-500">{currentShift} Shift - Active</div>
      </div>

      {/* View Batches Section */}
      <Card>
        <CardHeader className="text-lg font-medium">Current Batches</CardHeader>
        <CardContent className="space-y-3">
          {activeBatches.map((batch) => (
            <div key={batch.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
              <div>
                <p className="font-semibold">{(batch as any).bread_type?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">
                  Batch #{batch.batch_number} • {format(new Date(batch.created_at), 'h:mm a')}
                </p>
              </div>
              <div className="font-bold text-right">{batch.actual_quantity || 0}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create New Batch Button */}
      <Button 
        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold py-6 flex items-center justify-center gap-2"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <PlusCircle size={20} />
        <span>Create New Batch</span>
      </Button>

      {/* Export & Reports */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="flex items-center justify-center py-6 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow gap-2"
          onClick={handleExportAll}
        >
          <Download />
          <span>Export All</span>
        </Button>
        <Button 
          className="flex items-center justify-center py-6 bg-green-600 hover:bg-green-700 text-white text-base font-semibold shadow gap-2"
          onClick={handleReports}
        >
          <FileText />
          <span>Reports</span>
        </Button>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBatchModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onBatchCreated={handleBatchCreated}
          currentShift={currentShift}
        />
      )}

      {isExportModalOpen && (
        <ExportAllBatchesModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentShift={currentShift}
        />
      )}

      {isViewAllModalOpen && (
        <ViewAllBatchesModal
          isOpen={isViewAllModalOpen}
          onClose={() => setIsViewAllModalOpen(false)}
          currentShift={currentShift}
        />
      )}
    </div>
  );
}
