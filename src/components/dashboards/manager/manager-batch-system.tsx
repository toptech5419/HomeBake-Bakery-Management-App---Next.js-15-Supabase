"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Timer,
  Users,
  Package,
  ChefHat,
  AlertCircle,
  Loader2,
  XCircle
} from 'lucide-react';
import { useBatches } from '@/hooks/use-batches';
import { Batch as BatchType } from '@/lib/batches/actions';
import { useMobileNotifications, NotificationHelpers } from '@/components/ui/mobile-notifications-enhanced';

interface BatchSystemProps {
  currentShift: 'morning' | 'night';
  managerId: string;
  breadTypes: Array<{ id: string; name: string; unit_price: number }>;
}

export function ManagerBatchSystem({ currentShift, breadTypes }: BatchSystemProps) {
  const { toast } = useOptimizedToast();
  const {
    batches,
    isLoadingBatches,
    isCreatingBatch,
    isUpdatingBatch,
    isCompletingBatch,
    isCancellingBatch,
    createNewBatch,
    updateExistingBatch,
    completeExistingBatch,
    cancelExistingBatch,
    generateBatchNumber,
    batchesError,
  } = useBatches();

  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [newBatch, setNewBatch] = useState<{ breadTypeId: string; batchNumber: string; actualQuantity: string; notes: string }>({
    breadTypeId: '',
    batchNumber: '',
    actualQuantity: '',
    notes: ''
  });
  const [isGeneratingBatchNumber, setIsGeneratingBatchNumber] = useState(false);

  const formRef = React.useRef<HTMLDivElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  const handleShowCreateBatch = () => {
    setShowCreateBatch(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100); // Wait for form to render
  };

  const handleCancelCreateBatch = () => {
    setShowCreateBatch(false);
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Generate batch number when bread type is selected
  useEffect(() => {
    if (newBatch.breadTypeId && !newBatch.batchNumber) {
      setIsGeneratingBatchNumber(true);
      generateBatchNumber(newBatch.breadTypeId)
        .then(batchNumber => {
          setNewBatch(prev => ({ ...prev, batchNumber }));
        })
        .catch(error => {
          console.error('Error generating batch number:', error);
          toast({
            title: "Error",
            description: "Failed to generate batch number",
            type: "error"
          });
        })
        .finally(() => {
          setIsGeneratingBatchNumber(false);
        });
    }
  }, [newBatch.breadTypeId, newBatch.batchNumber, generateBatchNumber, toast]);

  const handleCreateBatch = async () => {
    if (!newBatch.breadTypeId || !newBatch.batchNumber || !newBatch.actualQuantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        type: "error"
      });
      return;
    }

    try {
      await createNewBatch({
        bread_type_id: newBatch.breadTypeId,
        batch_number: newBatch.batchNumber,
        actual_quantity: parseInt(newBatch.actualQuantity),
        notes: newBatch.notes || undefined,
        shift: currentShift,
      });

      toast({
        title: "Success",
        description: "Batch created successfully",
        type: "success"
      });

      setNewBatch({
        breadTypeId: '',
        batchNumber: '',
        actualQuantity: '',
        notes: ''
      });
      setShowCreateBatch(false);
    } catch (error: unknown) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create batch",
        type: "error"
      });
    }
  };

  const handleStartBatch = async (batchId: string) => {
    try {
      await updateExistingBatch(batchId, { status: 'active' });
      toast({
        title: "Success",
        description: "Batch started successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Error starting batch:', error);
      toast({
        title: "Error",
        description: "Failed to start batch",
        type: "error"
      });
    }
  };

  const handleCompleteBatch = async (batchId: string, actualQuantity: number) => {
    try {
      await completeExistingBatch(batchId, actualQuantity);
      toast({
        title: "Success",
        description: "Batch completed successfully",
        type: "success"
      });
    } catch (error: unknown) {
      console.error('Error completing batch:', error);
      toast({
        title: "Error",
        description: "Failed to complete batch",
        type: "error"
      });
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    try {
      await cancelExistingBatch(batchId);
      toast({
        title: "Success",
        description: "Batch cancelled successfully",
        type: "success"
      });
    } catch (error) {
      console.error('Error cancelling batch:', error);
      toast({
        title: "Error",
        description: "Failed to cancel batch",
        type: "error"
      });
    }
  };

  const getStatusColor = (status: BatchType['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: BatchType['status']) => {
    switch (status) {
      case 'active': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    return `${duration} min`;
  };

  const calculateProgress = (batch: BatchType) => {
    if (batch.status === 'completed') return 100;
    if (batch.status === 'cancelled') return 0;
    
    // Calculate progress based on time elapsed vs estimated time
    const start = new Date(batch.start_time);
    const now = new Date();
    const elapsed = now.getTime() - start.getTime();
    const estimated = batch.actual_quantity * 2; // Rough estimate: 2 minutes per unit
    return Math.min(Math.floor((elapsed / (estimated * 60 * 1000)) * 100), 95);
  };

  const activeBatchesList = batches.filter(batch => batch.status === 'active');
  const planningBatches = batches.filter(batch => batch.status === 'active' && !batch.start_time);
  const completedBatches = batches.filter(batch => batch.status === 'completed');

  if (isLoadingBatches) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-muted-foreground">Loading batches...</span>
        </div>
      </Card>
    );
  }

  if (batchesError) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span>Error loading batches. Please try again.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Batch Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-orange-600" />
              Batch Production System
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentShift} shift - Real-time batch management
            </p>
          </div>
          <Button 
            onClick={handleShowCreateBatch} 
            className="flex items-center gap-2"
            disabled={isCreatingBatch}
          >
            {isCreatingBatch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New Batch
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{activeBatchesList.length}</div>
            <div className="text-xs text-blue-800">Active Batches</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{planningBatches.length}</div>
            <div className="text-xs text-yellow-800">Planning Stage</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedBatches.length}</div>
            <div className="text-xs text-green-800">Completed Today</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {completedBatches.reduce((sum, batch) => sum + batch.actual_quantity, 0)}
            </div>
            <div className="text-xs text-purple-800">Total Units</div>
          </div>
        </div>
      </Card>

      {/* Active Batches */}
      {activeBatchesList.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-600" />
            Active Batches ({activeBatchesList.length})
          </h4>
          <div className="space-y-4">
            {activeBatchesList.map((batch: BatchType) => {
              const progress = calculateProgress(batch);
              const breadTypeName = batch.bread_type?.name || 'Unknown';
              const createdBy = batch.created_by_user?.email || 'Unknown';
              
              return (
                <div
                  key={batch.id}
                  className="p-4 border-l-4 border-blue-500 bg-white rounded-lg shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{batch.batch_number} - {breadTypeName}</div>
                        <div className="text-sm text-muted-foreground">
                          {batch.actual_quantity} units • Started {new Date(batch.start_time).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge className={getStatusColor(batch.status)}>
                        {getStatusDisplay(batch.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCompleteBatch(batch.id, batch.actual_quantity)}
                        disabled={isCompletingBatch}
                      >
                        {isCompletingBatch ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelBatch(batch.id)}
                        disabled={isCancellingBatch}
                      >
                        {isCancellingBatch ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {createdBy}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(batch.start_time, batch.end_time || undefined)}
                      </div>
                    </div>
                  </div>

                  {batch.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <strong>Notes:</strong> {batch.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Planning Batches */}
      {planningBatches.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            Planning Batches ({planningBatches.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planningBatches.map(batch => {
              const breadTypeName = batch.bread_type?.name || 'Unknown';
              
              return (
                <div key={batch.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{batch.batch_number} - {breadTypeName}</div>
                    <Badge className={getStatusColor(batch.status)}>Planning</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {batch.actual_quantity} units • Quantity
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartBatch(batch.id)}
                    className="w-full flex items-center gap-2"
                    disabled={isUpdatingBatch}
                  >
                    {isUpdatingBatch ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Production
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Batch Creation Modal */}
      {showCreateBatch && (
        <Card className="p-6 border-orange-200 bg-orange-50" ref={formRef}>
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Create New Batch</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Bread Type</label>
                <Select 
                  value={newBatch.breadTypeId} 
                  onValueChange={(value) => setNewBatch(prev => ({ ...prev, breadTypeId: value, batchNumber: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bread type" />
                  </SelectTrigger>
                  <SelectContent>
                    {breadTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Batch Number</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, batchNumber: e.target.value }))}
                    placeholder={isGeneratingBatchNumber ? "Generating..." : "Batch number"}
                    disabled={isGeneratingBatchNumber}
                    className="text-lg"
                  />
                  {isGeneratingBatchNumber && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Target Quantity</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newBatch.actualQuantity}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, actualQuantity: e.target.value }))}
                  placeholder="Enter quantity"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Input
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions..."
                  className="text-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleCreateBatch} 
                className="flex-1"
                disabled={isCreatingBatch || !newBatch.breadTypeId || !newBatch.batchNumber || !newBatch.actualQuantity}
              >
                {isCreatingBatch ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Batch'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelCreateBatch}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={isCreatingBatch}
              >
                <XCircle className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" />
                <span className="hidden xs:inline">Cancel</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* No batches message */}
      {batches.length === 0 && !isLoadingBatches && (
        <Card className="p-6">
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3>
            <p className="text-gray-500 mb-4">Create your first batch to get started with production management.</p>
            <Button onClick={handleShowCreateBatch}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Batch
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ManagerBatchSystem;