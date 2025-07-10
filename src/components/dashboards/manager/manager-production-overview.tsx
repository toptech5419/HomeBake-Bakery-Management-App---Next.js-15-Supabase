'use client';

import { 
  Package, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { MetricCard } from '@/components/ui/card';
import { formatNigeriaDate, getRelativeTime } from '@/lib/utils/timezone';

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
}

interface ProductionTarget {
  breadType: string;
  targetQuantity: number;
  currentQuantity: number;
  completion: number;
  shift: 'morning' | 'night';
}

interface ManagerProductionOverviewProps {
  data: {
    activeBatches: ProductionBatch[];
    completedToday: number;
    todayTarget: number;
    averageProductionTime: number; // in minutes
    qualityScore: number; // percentage
    staffUtilization: number; // percentage
    currentShift: 'morning' | 'night';
    targets: ProductionTarget[];
    lastUpdate: string;
  };
  loading?: boolean;
  breadTypes?: Array<{ id: string; name: string; unit_price: number }>;
}

export function ManagerProductionOverview({ data, loading = false }: ManagerProductionOverviewProps) {
  const metrics = useMemo(() => {
    const efficiency = (data.completedToday / Math.max(data.todayTarget, 1)) * 100;
    const onTimeCompletion = data.activeBatches.filter(batch => 
      new Date(batch.estimatedCompletion) >= new Date()
    ).length / Math.max(data.activeBatches.length, 1) * 100;

    return {
      efficiency: Math.min(efficiency, 100),
      onTimeCompletion,
      averageTime: data.averageProductionTime,
      qualityPerformance: data.qualityScore
    };
  }, [data]);

  const getStatusColor = (status: ProductionBatch['status']) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
      quality_check: 'text-purple-600 bg-purple-50 border-purple-200'
    };
    return colors[status];
  };

  const getPriorityColor = (priority: ProductionBatch['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-600',
      high: 'bg-red-100 text-red-600'
    };
    return colors[priority];
  };

  const getTimeRemaining = (estimatedCompletion: string) => {
    const now = new Date();
    const completion = new Date(estimatedCompletion);
    const diffMinutes = Math.round((completion.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (diffMinutes < 30) return { text: `${diffMinutes}m`, color: 'text-yellow-600' };
    if (diffMinutes < 120) return { text: `${Math.round(diffMinutes/60)}h ${diffMinutes%60}m`, color: 'text-green-600' };
    return { text: `${Math.round(diffMinutes/60)}h`, color: 'text-green-600' };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            {data.currentShift.charAt(0).toUpperCase() + data.currentShift.slice(1)} Shift • 
            Last updated {getRelativeTime(data.lastUpdate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            loading ? "bg-yellow-400 animate-pulse" : "bg-green-400"
          )} />
          <span className="text-sm font-medium text-gray-600">
            {loading ? 'Updating...' : 'Live'}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Production Efficiency"
            value={`${metrics.efficiency.toFixed(1)}%`}
            description={`${data.completedToday}/${data.todayTarget} completed`}
            change={{
              value: metrics.efficiency > 85 ? 'On Target' : 'Behind',
              type: metrics.efficiency > 85 ? 'increase' : 'decrease',
              period: 'today'
            }}
            icon={<Target className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Active Batches"
            value={`${data.activeBatches.length}`}
            description="Currently in production"
            change={{
              value: `${metrics.onTimeCompletion.toFixed(0)}%`,
              type: metrics.onTimeCompletion > 80 ? 'increase' : 'decrease',
              period: 'on schedule'
            }}
            icon={<Package className="w-5 h-5" />}
            loading={loading}
            hover="lift"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Avg. Production Time"
            value={`${metrics.averageTime}min`}
            description="Per batch completion"
            change={{
              value: metrics.averageTime < 90 ? 'Efficient' : 'Review',
              type: metrics.averageTime < 90 ? 'increase' : 'neutral',
              period: 'performance'
            }}
            icon={<Timer className="w-5 h-5" />}
            loading={loading}
            hover="scale"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Quality Score"
            value={`${data.qualityScore}%`}
            description="Quality control rating"
            change={{
              value: `${data.staffUtilization}%`,
              type: data.staffUtilization > 75 ? 'increase' : 'decrease',
              period: 'staff utilization'
            }}
            icon={<CheckCircle2 className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>
      </motion.div>

      {/* Production Targets */}
      <motion.div 
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Production Targets</h3>
            <p className="text-sm text-gray-500 mt-1">Today's production goals by bread type</p>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Live Progress</span>
          </div>
        </div>

        <div className="space-y-4">
          {data.targets.map((target, index) => (
            <div key={target.breadType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="font-medium text-gray-900">{target.breadType}</span>
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    target.shift === 'morning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {target.shift}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">
                    {target.currentQuantity}/{target.targetQuantity}
                  </span>
                  <div className="text-sm text-gray-500">
                    {target.completion.toFixed(0)}% complete
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    target.completion >= 100 ? "bg-green-500" :
                    target.completion >= 75 ? "bg-orange-500" :
                    target.completion >= 50 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(target.completion, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Active Batches */}
      <motion.div 
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Production Batches</h3>
              <p className="text-sm text-gray-500 mt-1">Currently running production operations</p>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-600">Real-time</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.activeBatches.length > 0 ? (
            <div className="space-y-4">
              {data.activeBatches.map((batch) => {
                const timeRemaining = getTimeRemaining(batch.estimatedCompletion);
                
                return (
                  <div 
                    key={batch.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer group"
                  >
                    {/* Status Indicator */}
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center border",
                      getStatusColor(batch.status)
                    )}>
                      <Package className="w-6 h-6" />
                    </div>

                    {/* Batch Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                          {batch.breadType}
                        </h4>
                        <span className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          getPriorityColor(batch.priority)
                        )}>
                          {batch.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {batch.quantity} units • Started {getRelativeTime(batch.startTime)}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {batch.assignedStaff.length} staff
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Est. {new Date(batch.estimatedCompletion).toLocaleTimeString('en-NG', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'Africa/Lagos'
                          })}
                        </span>
                        {batch.qualityScore && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {batch.qualityScore}% quality
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time Remaining */}
                    <div className="text-right">
                      <div className={cn("font-semibold", timeRemaining.color)}>
                        {timeRemaining.text}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {batch.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">No Active Batches</h3>
              <p className="text-sm text-gray-500">
                All production is currently on hold or completed
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}