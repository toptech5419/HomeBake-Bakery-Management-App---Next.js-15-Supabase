"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatNigeriaDate } from '@/lib/utils/timezone';
import { 
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Timer,
  Users,
  Package,
  Star,
  ChefHat
} from 'lucide-react';

interface Batch {
  id: string;
  batchNumber: string;
  breadType: string;
  quantity: number;
  status: 'planning' | 'in-progress' | 'quality-check' | 'completed' | 'paused';
  startTime?: string;
  endTime?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  progress: number; // 0-100
  assignedStaff: string[];
  priority: 'low' | 'medium' | 'high';
  qualityScore?: number;
  notes?: string;
  shift: 'morning' | 'night';
  managerId: string;
}

interface BatchSystemProps {
  currentShift: 'morning' | 'night';
  managerId: string;
  breadTypes: Array<{ id: string; name: string; unit_price: number }>;
}

export function ManagerBatchSystem({ currentShift, managerId, breadTypes }: BatchSystemProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newBatch, setNewBatch] = useState({
    breadType: '',
    quantity: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedDuration: '120', // 2 hours default
    assignedStaff: [] as string[],
    notes: ''
  });

  // FIXED: Initialize sample batches only once to prevent infinite loops
  const initializeBatches = useCallback(() => {
    if (breadTypes.length > 0 && !isInitialized) {
      const sampleBatches: Batch[] = [
        {
          id: '1',
          batchNumber: 'B001',
          breadType: breadTypes[0]?.name || 'White Bread',
          quantity: 50,
          status: 'planning',
          estimatedDuration: 120,
          progress: 0,
          assignedStaff: ['John Doe', 'Jane Smith'],
          priority: 'high',
          shift: currentShift,
          managerId,
        },
        {
          id: '2',
          batchNumber: 'B002',
          breadType: breadTypes[1]?.name || 'Brown Bread',
          quantity: 30,
          status: 'planning',
          estimatedDuration: 100,
          progress: 0,
          assignedStaff: ['Mike Johnson'],
          priority: 'medium',
          shift: currentShift,
          managerId,
        }
      ];
      setBatches(sampleBatches);
      setIsInitialized(true);
    }
  }, [breadTypes, isInitialized, currentShift, managerId]);

  // FIXED: Use useCallback to prevent unnecessary re-renders
  const updateBatchProgress = useCallback(() => {
    setBatches(prevBatches => {
      let hasChanges = false;
      const updatedBatches = prevBatches.map(batch => {
        if (batch.status === 'in-progress' && batch.startTime) {
          const startTime = new Date(batch.startTime);
          const now = new Date();
          const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
          const newProgress = Math.min((elapsedMinutes / batch.estimatedDuration) * 100, 100);
          
          // Only update if progress changed significantly (prevents excessive updates)
          if (Math.abs(newProgress - batch.progress) > 2) {
            hasChanges = true;
            
            // Auto-transition to quality check when near completion
            if (newProgress >= 95 && batch.status === 'in-progress') {
              return { ...batch, progress: newProgress, status: 'quality-check' as const };
            }
            
            return { ...batch, progress: newProgress };
          }
        }
        return batch;
      });
      
      // Only update state if there are actual changes
      return hasChanges ? updatedBatches : prevBatches;
    });
  }, []);

  // FIXED: Initialize batches only once
  useEffect(() => {
    initializeBatches();
  }, [initializeBatches]);

  // FIXED: Progress update with proper cleanup and longer intervals
  useEffect(() => {
    // Only start interval if there are active batches
    const activeBatches = batches.filter(batch => batch.status === 'in-progress');
    if (activeBatches.length === 0) return;

    const interval = setInterval(updateBatchProgress, 120000); // FIXED: 2 minutes instead of 1 minute

    return () => clearInterval(interval);
  }, [batches.length, updateBatchProgress]); // FIXED: Only depend on batch count, not full batches array

  // FIXED: Memoize calculated values to prevent unnecessary re-renders
  const batchStats = useMemo(() => {
    const activeBatches = batches.filter(batch => ['in-progress', 'quality-check'].includes(batch.status));
    const upcomingBatches = batches.filter(batch => batch.status === 'planning');
    const completedBatches = batches.filter(batch => batch.status === 'completed');
    
    return {
      activeBatches,
      upcomingBatches,
      completedBatches
    };
  }, [batches]);

  const createBatch = useCallback(() => {
    if (!newBatch.breadType || !newBatch.quantity) return;

    const batch: Batch = {
      id: Date.now().toString(),
      batchNumber: `B${String(batches.length + 1).padStart(3, '0')}`,
      breadType: newBatch.breadType,
      quantity: parseInt(newBatch.quantity),
      status: 'planning',
      estimatedDuration: parseInt(newBatch.estimatedDuration),
      progress: 0,
      assignedStaff: newBatch.assignedStaff,
      priority: newBatch.priority,
      notes: newBatch.notes,
      shift: currentShift,
      managerId,
    };

    setBatches(prev => [...prev, batch]);
    setNewBatch({
      breadType: '',
      quantity: '',
      priority: 'medium',
      estimatedDuration: '120',
      assignedStaff: [],
      notes: ''
    });
    setShowCreateBatch(false);
  }, [newBatch, batches.length, currentShift, managerId]);

  const updateBatchStatus = useCallback((batchId: string, newStatus: Batch['status']) => {
    setBatches(prev => prev.map(batch => {
      if (batch.id === batchId) {
        const updates: Partial<Batch> = { status: newStatus };
        
        if (newStatus === 'in-progress' && !batch.startTime) {
          updates.startTime = new Date().toISOString();
          updates.progress = 0;
        } else if (newStatus === 'completed') {
          updates.endTime = new Date().toISOString();
          updates.progress = 100;
          if (batch.startTime) {
            const duration = Math.floor((new Date().getTime() - new Date(batch.startTime).getTime()) / (1000 * 60));
            updates.actualDuration = duration;
          }
        }
        
        return { ...batch, ...updates };
      }
      return batch;
    }));
  }, []);

  // FIXED: Memoize utility functions to prevent re-renders
  const getStatusColor = useMemo(() => (status: Batch['status']) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'quality-check': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getPriorityColor = useMemo(() => (priority: Batch['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  }, []);

  // Early return if not initialized to prevent rendering with empty data
  if (!isInitialized) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading batch system...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setShowCreateBatch(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Batch
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{batchStats.activeBatches.length}</div>
            <div className="text-xs text-blue-800">Active Batches</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{batchStats.upcomingBatches.length}</div>
            <div className="text-xs text-yellow-800">Planning Stage</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{batchStats.completedBatches.length}</div>
            <div className="text-xs text-green-800">Completed Today</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {batchStats.completedBatches.reduce((sum, batch) => sum + batch.quantity, 0)}
            </div>
            <div className="text-xs text-purple-800">Total Units</div>
          </div>
        </div>
      </Card>

      {/* Active Batches */}
      {batchStats.activeBatches.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-600" />
            Active Batches ({batchStats.activeBatches.length})
          </h4>
          <div className="space-y-4">
            {batchStats.activeBatches.map(batch => (
              <div
                key={batch.id}
                className={`p-4 border-l-4 bg-white rounded-lg shadow-sm ${getPriorityColor(batch.priority)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{batch.batchNumber} - {batch.breadType}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.quantity} units • Started {batch.startTime && formatNigeriaDate(batch.startTime, 'h:mm a')}
                      </div>
                    </div>
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {batch.status === 'in-progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBatchStatus(batch.id, 'paused')}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {batch.status === 'quality-check' && (
                      <Button
                        size="sm"
                        onClick={() => updateBatchStatus(batch.id, 'completed')}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(batch.progress)}%</span>
                  </div>
                  <Progress value={batch.progress} className="h-2" />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {batch.assignedStaff.join(', ') || 'Unassigned'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {batch.estimatedDuration}min estimated
                    </div>
                  </div>
                </div>

                {batch.qualityScore && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Quality Score: {batch.qualityScore}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming Batches */}
      {batchStats.upcomingBatches.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            Upcoming Batches ({batchStats.upcomingBatches.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batchStats.upcomingBatches.map(batch => (
              <div key={batch.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{batch.batchNumber} - {batch.breadType}</div>
                  <Badge className={getStatusColor(batch.status)}>Planning</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {batch.quantity} units • {batch.estimatedDuration}min estimated
                </div>
                <Button
                  size="sm"
                  onClick={() => updateBatchStatus(batch.id, 'in-progress')}
                  className="w-full flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Production
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Batch Creation Modal */}
      {showCreateBatch && (
        <Card className="p-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">Create New Batch</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Bread Type</label>
                <Select value={newBatch.breadType} onValueChange={(value) => setNewBatch(prev => ({ ...prev, breadType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bread type" />
                  </SelectTrigger>
                  <SelectContent>
                    {breadTypes.map(type => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newBatch.quantity}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={newBatch.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewBatch(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estimated Duration (minutes)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newBatch.estimatedDuration}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  placeholder="120"
                  className="text-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                value={newBatch.notes}
                onChange={(e) => setNewBatch(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Special instructions or notes for this batch..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={createBatch} className="flex-1">
                Create Batch
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateBatch(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}