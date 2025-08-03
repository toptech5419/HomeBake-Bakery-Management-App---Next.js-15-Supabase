'use client';

import React from 'react';
import {
  Clock,
  Target,
  ClipboardList,
  CheckCircle,
  Play,
  Plus,
  Flag,
  Users,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { GridContainer } from '../shared/GridContainer';
import { MetricCard } from '../shared/MetricCard';
import { ShiftToggle } from '../shared/ShiftToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ProductionBatch {
  id: string;
  breadType: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
  startTime: string;
  estimatedCompletion: string;
  assignedStaff: string[];
  priority: 'low' | 'medium' | 'high';
  qualityScore?: number;
  progress?: number;
}

interface ProductionTarget {
  breadType: string;
  targetQuantity: number;
  currentQuantity: number;
  completion: number;
  shift: 'morning' | 'night';
}

interface ManagerDashboardProps {
  data: {
    user: {
      name: string;
      role: string;
    };
    metrics: {
      completedToday: number;
      todayTarget: number;
      activeBatches?: number;
      averageProductionTime: number;
      qualityScore: number;
      staffUtilization: number;
      currentShift: 'morning' | 'night';
    };
    alerts: {
      activeBatches: number;
      qualityIssues: number;
      staffShortage: number;
      equipmentMaintenance: number;
    };
    batches: ProductionBatch[];
    targets: ProductionTarget[];
  };
}

export function ManagerDashboard({ data }: ManagerDashboardProps) {
  const { metrics, batches, targets } = data;


  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      quality_check: 'bg-purple-100 text-purple-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Shift Management & Key Metrics */}
      <GridContainer cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <div className="lg:col-span-1">
          <ShiftToggle currentShift={metrics.currentShift} />
        </div>
        <MetricCard
          title="Current Batch"
          value={metrics.activeBatches || 0}
          icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Production Target"
          value={`${metrics.completedToday}/${metrics.todayTarget}`}
          icon={<Target className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Quality Score"
          value={`${metrics.qualityScore}%`}
          icon={<CheckCircle className="h-5 w-5 text-purple-600" />}
        />
      </GridContainer>

      {/* Production Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Production Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {targets.map((target, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{target.breadType}</span>
                  <span className="text-sm text-slate-600">
                    {target.currentQuantity}/{target.targetQuantity}
                  </span>
                </div>
                <Progress value={target.completion} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{target.completion.toFixed(1)}% Complete</span>
                  <Badge variant="outline" className="capitalize">
                    {target.shift}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Production Line */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Production Line
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{batch.breadType}</h4>
                    <p className="text-sm text-slate-600">
                      {batch.quantity} units • {batch.assignedStaff.join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(batch.priority)}>
                      {batch.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-600">
                      {new Date(batch.startTime).toLocaleTimeString()} - {new Date(batch.estimatedCompletion).toLocaleTimeString()}
                    </span>
                  </div>
                  <Progress value={batch.progress || 50} className="h-2" />
                </div>

                {batch.qualityScore && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-600">Quality Score</span>
                    <Badge variant="outline">{batch.qualityScore}%</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Production Logs & Quality Checks */}
      <GridContainer cols={{ mobile: 1, tablet: 2, desktop: 2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Production Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium">White Bread Batch #123</p>
                  <p className="text-sm text-slate-600">Started 2 hours ago</p>
                </div>
                <Badge variant="outline">In Progress</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium">Brown Bread Batch #124</p>
                  <p className="text-sm text-slate-600">Quality check pending</p>
                </div>
                <Badge variant="outline">Quality Check</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quality Checks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Temperature Monitoring</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Normal
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weight Consistency</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Good
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Staff Utilization</span>
                <Badge variant="outline">{metrics.staffUtilization}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </GridContainer>

      {/* Priority Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Production Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start Batch
            </Button>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Record Production
            </Button>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Assign Staff
            </Button>
            <Button variant="destructive" className="w-full">
              <Flag className="mr-2 h-4 w-4" />
              End Shift
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
