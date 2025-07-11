'use client';

import React, { useState, useEffect } from 'react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { ShiftSelector, ShiftType } from '@/components/dashboard/ShiftSelector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  Factory,
  Clock,
  Target,
  CheckCircle,
  Play,
  Pause,
  Plus,
  ChefHat,
  AlertCircle,
  Star,
  FileText,
  Settings,
  Timer,
  Package,
  TrendingUp,
  Users,
  ClipboardCheck,
  Save,
  RotateCcw
} from 'lucide-react';

interface ManagerDashboardProps {
  userId: string;
  userData: {
    name: string;
    email: string;
    role: string;
  };
  breadTypes: Array<{ id: string; name: string; unit_price: number }>;
}

interface ProductionData {
  shiftStatus: {
    type: ShiftType;
    isActive: boolean;
    startTime?: Date;
    progress: number;
  };
  currentBatch: {
    id: string;
    batchNumber: string;
    breadType: string;
    quantity: number;
    progress: number;
    status: 'planning' | 'in-progress' | 'quality-check' | 'completed';
    startTime: Date;
  } | null;
  productionTarget: {
    daily: number;
    achieved: number;
    percentage: number;
  };
  completionRate: {
    batches: number;
    onTime: number;
    percentage: number;
  };
  activeProductionLine: {
    totalBatches: number;
    inProgress: number;
    completed: number;
    quality: number;
  };
  qualityMetrics: {
    score: number;
    trend: number;
    defectRate: number;
    approvalRate: number;
  };
  productionLog: Array<{
    id: string;
    batchNumber: string;
    breadType: string;
    quantity: number;
    timestamp: Date;
    status: 'completed' | 'quality-check' | 'approved';
  }>;
}

const SAMPLE_PRODUCTION_DATA: ProductionData = {
  shiftStatus: {
    type: 'morning',
    isActive: true,
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    progress: 65
  },
  currentBatch: {
    id: '1',
    batchNumber: 'B027',
    breadType: 'White Bread',
    quantity: 100,
    progress: 75,
    status: 'in-progress',
    startTime: new Date(Date.now() - 1000 * 60 * 90) // 1.5 hours ago
  },
  productionTarget: {
    daily: 500,
    achieved: 325,
    percentage: 65
  },
  completionRate: {
    batches: 12,
    onTime: 10,
    percentage: 83.3
  },
  activeProductionLine: {
    totalBatches: 8,
    inProgress: 3,
    completed: 5,
    quality: 92
  },
  qualityMetrics: {
    score: 94,
    trend: 3.2,
    defectRate: 2.1,
    approvalRate: 97.9
  },
  productionLog: [
    { id: '1', batchNumber: 'B026', breadType: 'Brown Bread', quantity: 75, timestamp: new Date(Date.now() - 1000 * 60 * 30), status: 'completed' },
    { id: '2', batchNumber: 'B025', breadType: 'White Bread', quantity: 100, timestamp: new Date(Date.now() - 1000 * 60 * 45), status: 'approved' },
    { id: '3', batchNumber: 'B024', breadType: 'Wheat Bread', quantity: 50, timestamp: new Date(Date.now() - 1000 * 60 * 60), status: 'quality-check' },
  ]
};

export function ManagerDashboard({ userId, userData, breadTypes }: ManagerDashboardProps) {
  const [productionData, setProductionData] = useState<ProductionData>(SAMPLE_PRODUCTION_DATA);
  const [currentShift, setCurrentShift] = useState<ShiftType>('morning');
  const [isShiftActive, setIsShiftActive] = useState(true);
  const [shiftRemarks, setShiftRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate real-time production updates
    const interval = setInterval(() => {
      setProductionData(prev => ({
        ...prev,
        productionTarget: {
          ...prev.productionTarget,
          achieved: Math.min(prev.productionTarget.daily, prev.productionTarget.achieved + Math.floor(Math.random() * 5)),
          percentage: Math.min(100, (prev.productionTarget.achieved / prev.productionTarget.daily) * 100)
        },
        currentBatch: prev.currentBatch ? {
          ...prev.currentBatch,
          progress: Math.min(100, prev.currentBatch.progress + Math.floor(Math.random() * 3))
        } : null
      }));
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const handleShiftChange = (shift: ShiftType) => {
    setCurrentShift(shift);
  };

  const handleStartShift = () => {
    setIsShiftActive(true);
    setProductionData(prev => ({
      ...prev,
      shiftStatus: {
        ...prev.shiftStatus,
        type: currentShift,
        isActive: true,
        startTime: new Date()
      }
    }));
  };

  const handleEndShift = () => {
    setIsShiftActive(false);
    // Here you would typically save shift data and remarks
    console.log('Shift ended with remarks:', shiftRemarks);
  };

  const handleStartBatch = () => {
    console.log('Starting new batch');
  };

  const handleRecordProduction = () => {
    console.log('Recording production data');
  };

  const handleQualityCheck = () => {
    console.log('Performing quality check');
  };

  const handleSaveRemarks = () => {
    console.log('Saving shift remarks:', shiftRemarks);
  };

  const quickActions = [
    { label: 'Start Batch', icon: Play, onClick: handleStartBatch, variant: 'default' as const },
    { label: 'Record Production', icon: ClipboardCheck, onClick: handleRecordProduction, variant: 'outline' as const },
    { label: 'Quality Check', icon: Star, onClick: handleQualityCheck, variant: 'outline' as const },
    { label: 'Finish Shift', icon: CheckCircle, onClick: handleEndShift, variant: 'outline' as const },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'quality-check': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {userData.name} • Production Management & Quality Control
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={cn(
                'px-3 py-1',
                isShiftActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              )}>
                {isShiftActive ? 'Shift Active' : 'Shift Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Shift Management */}
        <div className="mb-6">
          <ShiftSelector
            currentShift={currentShift}
            onShiftChange={handleShiftChange}
            isShiftActive={isShiftActive}
            onStartShift={handleStartShift}
            onEndShift={handleEndShift}
            role="manager"
          />
        </div>

        {/* Row 1: Production Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard
            title="Shift Status"
            value={`${Math.round(productionData.shiftStatus.progress)}%`}
            subtitle={`${currentShift} shift progress`}
            icon={Clock}
            iconColor="text-blue-600"
            type="primary"
            size="large"
            badge={{
              label: isShiftActive ? 'Active' : 'Inactive',
              color: isShiftActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }}
          />
          <DashboardCard
            title="Current Batch"
            value={productionData.currentBatch?.batchNumber || 'None'}
            subtitle={productionData.currentBatch ? `${productionData.currentBatch.breadType} - ${productionData.currentBatch.progress}%` : 'No active batch'}
            icon={ChefHat}
            iconColor="text-orange-600"
            type="primary"
            size="large"
          />
          <DashboardCard
            title="Production Target"
            value={`${productionData.productionTarget.achieved}/${productionData.productionTarget.daily}`}
            subtitle={`${Math.round(productionData.productionTarget.percentage)}% complete`}
            icon={Target}
            iconColor="text-purple-600"
            type="primary"
            size="large"
            trend={{
              value: productionData.productionTarget.percentage,
              label: 'target progress',
              isPositive: productionData.productionTarget.percentage > 50
            }}
          />
          <DashboardCard
            title="Completion Rate"
            value={`${Math.round(productionData.completionRate.percentage)}%`}
            subtitle={`${productionData.completionRate.onTime} of ${productionData.completionRate.batches} on time`}
            icon={CheckCircle}
            iconColor="text-green-600"
            type="primary"
            size="large"
            badge={{
              label: productionData.completionRate.percentage > 80 ? 'Excellent' : 'Good',
              color: productionData.completionRate.percentage > 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }}
          />
        </div>

        {/* Row 2: Active Production Line - Full Width */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Active Production Line</h3>
                <p className="text-gray-600">Real-time batch tracking and production monitoring</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {productionData.activeProductionLine.inProgress} In Progress
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  {productionData.activeProductionLine.completed} Completed
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {productionData.activeProductionLine.totalBatches}
                </div>
                <div className="text-sm text-gray-600">Total Batches</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {productionData.activeProductionLine.inProgress}
                </div>
                <div className="text-sm text-blue-800">In Progress</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {productionData.activeProductionLine.completed}
                </div>
                <div className="text-sm text-green-800">Completed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {productionData.activeProductionLine.quality}%
                </div>
                <div className="text-sm text-purple-800">Quality Score</div>
              </div>
            </div>

            {/* Current Batch Progress */}
            {productionData.currentBatch && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {productionData.currentBatch.batchNumber} - {productionData.currentBatch.breadType}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {productionData.currentBatch.quantity} units • Started {formatTime(productionData.currentBatch.startTime)}
                    </p>
                  </div>
                  <Badge className={cn(
                    productionData.currentBatch.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  )}>
                    {productionData.currentBatch.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Batch Progress</span>
                    <span className="font-medium">{productionData.currentBatch.progress}%</span>
                  </div>
                  <Progress value={productionData.currentBatch.progress} className="h-3" />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Row 3: Quality Metrics */}
        <div className="mb-6">
          <DashboardCard
            title="Quality Metrics"
            icon={Star}
            iconColor="text-yellow-600"
            type="metric"
            className="w-full"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {productionData.qualityMetrics.score}%
                </div>
                <div className="text-xs text-yellow-800">Quality Score</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  +{productionData.qualityMetrics.trend}%
                </div>
                <div className="text-xs text-green-800">Trend</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">
                  {productionData.qualityMetrics.defectRate}%
                </div>
                <div className="text-xs text-red-800">Defect Rate</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {productionData.qualityMetrics.approvalRate}%
                </div>
                <div className="text-xs text-blue-800">Approval Rate</div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Row 4: Quick Actions */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Production Controls</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                  className="flex items-center gap-2"
                  disabled={!isShiftActive && action.label !== 'Start Batch'}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Row 5: Production Log & Shift Remarks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Production Log */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Production Log</h3>
              <Badge className="bg-gray-100 text-gray-800">
                {productionData.productionLog.length} entries
              </Badge>
            </div>
            <div className="space-y-4">
              {productionData.productionLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{entry.batchNumber}</span>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {entry.breadType} • {entry.quantity} units
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Shift Remarks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Shift Remarks</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveRemarks}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shift-remarks" className="text-sm font-medium text-gray-700">
                  Add notes about this shift's performance, issues, or observations
                </Label>
                <Textarea
                  id="shift-remarks"
                  value={shiftRemarks}
                  onChange={(e) => setShiftRemarks(e.target.value)}
                  placeholder="Enter shift remarks, production notes, quality observations, equipment status, etc."
                  rows={6}
                  className="mt-2 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Shift duration: {productionData.shiftStatus.startTime ? 
                    Math.floor((new Date().getTime() - productionData.shiftStatus.startTime.getTime()) / (1000 * 60 * 60)) + ' hours' : 
                    'Not started'
                  }
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}