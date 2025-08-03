'use client';

import { 
  Package, 
  CheckCircle2,
  Timer,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { MetricCard } from '@/components/ui/card';
import { formatNigeriaDate, getRelativeTime } from '@/lib/utils/timezone';
import { cn } from '@/lib/utils';

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
            hover="pulse"
          />
        </motion.div>
      </motion.div>

      {/* Active Batches */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Active Production Batches</h3>
          <span className="text-sm text-gray-500">
            {data.activeBatches.length} active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.activeBatches.slice(0, 6).map((batch) => (
            <motion.div
              key={batch.id}
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{batch.breadType}</h4>
                  <p className="text-sm text-gray-500">Quantity: {batch.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    getStatusColor(batch.status)
                  )}>
                    {batch.status.replace('_', ' ')}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getPriorityColor(batch.priority)
                  )}>
                    {batch.priority}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Started</span>
                  <span className="text-gray-900">
                    {formatNigeriaDate(batch.startTime)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Est. Completion</span>
                  <span className={cn(
                    "font-medium",
                    getTimeRemaining(batch.estimatedCompletion).color
                  )}>
                    {getTimeRemaining(batch.estimatedCompletion).text}
                  </span>
                </div>

                {batch.qualityScore && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Quality Score</span>
                    <span className="text-green-600 font-medium">
                      {batch.qualityScore}%
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Staff</span>
                  <span className="text-gray-900">
                    {batch.assignedStaff.length} assigned
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {data.activeBatches.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="text-center py-8 bg-gray-50 rounded-lg"
          >
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Batches</h3>
            <p className="text-gray-500">Production is currently on standby</p>
          </motion.div>
        )}
      </motion.div>

      {/* Production Targets */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Production Targets</h3>
          <span className="text-sm text-gray-500">
            {data.currentShift} shift
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.targets.map((target, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{target.breadType}</h4>
                <span className="text-sm font-medium text-gray-500">
                  {target.currentQuantity}/{target.targetQuantity}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="text-gray-900 font-medium">
                    {target.completion.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      target.completion >= 100 ? "bg-green-500" :
                      target.completion >= 75 ? "bg-blue-500" :
                      target.completion >= 50 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(target.completion, 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ManagerProductionOverview;