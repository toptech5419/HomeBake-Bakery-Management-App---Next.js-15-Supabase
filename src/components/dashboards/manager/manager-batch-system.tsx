"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  ChefHat,
  X,
  AlertCircle
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
  const [newBatch, setNewBatch] = useState({
    breadType: '',
    quantity: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedDuration: '120', // 2 hours default
    assignedStaff: [] as string[],
    notes: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Refs for smooth scrolling
  const formRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize with sample batches - OPTIMIZED to prevent infinite re-renders
  useEffect(() => {
    if (breadTypes.length > 0 && batches.length === 0) {
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
    }
  }, [breadTypes.length, currentShift, managerId, batches.length]);

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newBatch.breadType) {
      newErrors.breadType = 'Please select a bread type';
    }
    if (!newBatch.quantity || parseInt(newBatch.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }
    if (!newBatch.estimatedDuration || parseInt(newBatch.estimatedDuration) <= 0) {
      newErrors.estimatedDuration = 'Please enter a valid duration';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNewBatchClick = () => {
    setShowCreateBatch(true);
    // Smooth scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'start' 
      });
    }, 100);
  };

  const handleCancelForm = () => {
    setShowCreateBatch(false);
    setNewBatch({
      breadType: '',
      quantity: '',
      priority: 'medium',
      estimatedDuration: '120',
      assignedStaff: [],
      notes: ''
    });
    setErrors({});
    // Scroll back to button
    setTimeout(() => {
      createButtonRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  };

  const createBatch = async () => {
    if (!validateForm()) return;

    setIsCreating(true);

    try {
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
      setErrors({});
      setShowCreateBatch(false);
      
      // Success scroll back to stats
      setTimeout(() => {
        createButtonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    } catch (error) {
      console.error('Error creating batch:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const updateBatchStatus = (batchId: string, newStatus: Batch['status']) => {
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
  };

  const getStatusColor = (status: Batch['status']) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'quality-check': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Batch['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  const activeBatches = batches.filter(batch => ['in-progress', 'quality-check'].includes(batch.status));
  const upcomingBatches = batches.filter(batch => batch.status === 'planning');
  const completedBatches = batches.filter(batch => batch.status === 'completed');

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
          <Button 
            ref={createButtonRef}
            onClick={handleNewBatchClick} 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            disabled={showCreateBatch}
          >
            <Plus className="h-4 w-4" />
            New Batch
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{activeBatches.length}</div>
            <div className="text-xs text-blue-800">Active Batches</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{upcomingBatches.length}</div>
            <div className="text-xs text-yellow-800">Planning Stage</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedBatches.length}</div>
            <div className="text-xs text-green-800">Completed Today</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {completedBatches.reduce((sum, batch) => sum + batch.quantity, 0)}
            </div>
            <div className="text-xs text-purple-800">Total Units</div>
          </div>
        </div>
      </Card>

      {/* Batch Creation Form */}
      {showCreateBatch && (
        <div ref={formRef}>
          <Card className="border-green-200 bg-green-50/50 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Create New Batch</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelForm}
                  className="p-2 hover:bg-red-100 rounded-full"
                  disabled={isCreating}
                >
                  <X className="h-6 w-6 text-gray-500 hover:text-red-600" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bread Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Bread Type *
                    </Label>
                    <div className="relative">
                      <Select 
                        value={newBatch.breadType} 
                        onValueChange={(value) => {
                          setNewBatch(prev => ({ ...prev, breadType: value }));
                          if (errors.breadType) {
                            setErrors(prev => ({ ...prev, breadType: '' }));
                          }
                        }}
                      >
                        <SelectTrigger className={`w-full ${errors.breadType ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Choose bread type" />
                        </SelectTrigger>
                        <SelectContent>
                          {breadTypes.map(type => (
                            <SelectItem key={type.id} value={type.name}>
                              <div className="flex items-center justify-between w-full">
                                <span>{type.name}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  ₦{type.unit_price}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.breadType && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.breadType}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Quantity *
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={newBatch.quantity}
                      onChange={(e) => {
                        setNewBatch(prev => ({ ...prev, quantity: e.target.value }));
                        if (errors.quantity) {
                          setErrors(prev => ({ ...prev, quantity: '' }));
                        }
                      }}
                      placeholder="Enter quantity"
                      className={`text-base h-12 ${errors.quantity ? 'border-red-500' : ''}`}
                    />
                    {errors.quantity && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.quantity}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Priority
                    </Label>
                    <Select 
                      value={newBatch.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setNewBatch(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Low Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Medium Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            High Priority
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estimated Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Estimated Duration (minutes) *
                    </Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={newBatch.estimatedDuration}
                      onChange={(e) => {
                        setNewBatch(prev => ({ ...prev, estimatedDuration: e.target.value }));
                        if (errors.estimatedDuration) {
                          setErrors(prev => ({ ...prev, estimatedDuration: '' }));
                        }
                      }}
                      placeholder="120"
                      className={`text-base h-12 ${errors.estimatedDuration ? 'border-red-500' : ''}`}
                    />
                    {errors.estimatedDuration && (
                      <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {errors.estimatedDuration}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    value={newBatch.notes}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Special instructions or notes for this batch..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleCancelForm}
                    className="flex-1 sm:flex-initial h-12"
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createBatch} 
                    className="flex-1 sm:flex-initial h-12 bg-green-600 hover:bg-green-700"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Batch
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Active Batches */}
      {activeBatches.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-600" />
            Active Batches ({activeBatches.length})
          </h4>
          <div className="space-y-4">
            {activeBatches.map(batch => (
              <div
                key={batch.id}
                className={`p-4 border-l-4 bg-white rounded-lg shadow-sm ${getPriorityColor(batch.priority)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{batch.batchNumber} - {batch.breadType}</div>
                      <div className="text-sm text-muted-foreground">
                        {batch.quantity} units • Started {batch.startTime && new Date(batch.startTime).toLocaleTimeString()}
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
      {upcomingBatches.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            Upcoming Batches ({upcomingBatches.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingBatches.map(batch => (
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
    </div>
  );
}

export default ManagerBatchSystem;