'use client';

import { 
  DollarSign, 
  TrendingUp,
  Target,
  Clock,
  ShoppingCart,
  Users,
  Award,
  BarChart3,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { MetricCard } from '@/components/ui/card';
import { getRelativeTime } from '@/lib/utils/timezone';

interface SalesRecord {
  id: string;
  breadType: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  timestamp: string;
  customerType: 'individual' | 'bulk' | 'regular';
}

interface SalesTarget {
  dailyTarget: number;
  currentSales: number;
  completion: number;
  timeRemaining: number; // hours until shift end
}

interface SalesMetricsProps {
  data: {
    todaySales: SalesRecord[];
    salesTarget: SalesTarget;
    averageOrderValue: number;
    customerCount: number;
    topSellingBread: string;
    currentShift: 'morning' | 'night';
    previousDaySales: number;
    weeklyAverage: number;
    lastUpdate: string;
  };
  loading?: boolean;
}

export function SalesMetrics({ data, loading = false }: SalesMetricsProps) {
  const metrics = useMemo(() => {
    // Add null safety checks
    if (!data || !data.todaySales) {
      return {
        totalRevenue: 0,
        totalQuantity: 0,
        hourlyRate: 0,
        targetProgress: 0,
        projectedTotal: 0,
        vsYesterday: 0,
        vsWeeklyAvg: 0,
        avgOrderValue: 0
      };
    }

    const totalRevenue = data.todaySales.reduce((sum, sale) => 
      sum + (sale.quantity * sale.unitPrice) - sale.discount, 0
    );
    
    const totalQuantity = data.todaySales.reduce((sum, sale) => sum + sale.quantity, 0);
    
    const hourlyRate = data.salesTarget.timeRemaining > 0 ? 
      totalRevenue / (8 - data.salesTarget.timeRemaining) : 0;
    
    const targetProgress = (totalRevenue / data.salesTarget.dailyTarget) * 100;
    
    const projectedTotal = data.salesTarget.timeRemaining > 0 ? 
      totalRevenue + (hourlyRate * data.salesTarget.timeRemaining) : totalRevenue;
    
    const vsYesterday = data.previousDaySales > 0 ? 
      ((totalRevenue - data.previousDaySales) / data.previousDaySales) * 100 : 0;
    
    const vsWeeklyAvg = data.weeklyAverage > 0 ? 
      ((totalRevenue - data.weeklyAverage) / data.weeklyAverage) * 100 : 0;

    return {
      totalRevenue,
      totalQuantity,
      hourlyRate,
      targetProgress: Math.min(targetProgress, 100),
      projectedTotal,
      vsYesterday,
      vsWeeklyAvg,
      avgOrderValue: data.customerCount > 0 ? totalRevenue / data.customerCount : 0
    };
  }, [data]);

  const getCustomerTypeStats = useMemo(() => {
    if (!data || !data.todaySales) {
      return { individual: 0, bulk: 0, regular: 0 };
    }

    const stats = data.todaySales.reduce((acc, sale) => {
      acc[sale.customerType] = (acc[sale.customerType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      individual: stats.individual || 0,
      bulk: stats.bulk || 0,
      regular: stats.regular || 0
    };
  }, [data?.todaySales]);

  const getTargetColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-orange-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIndicator = (value: number) => {
    if (value > 0) return { icon: ArrowUp, color: 'text-green-600', text: `+${value.toFixed(1)}%` };
    if (value < 0) return { icon: ArrowDown, color: 'text-red-600', text: `${value.toFixed(1)}%` };
    return { icon: ArrowUp, color: 'text-gray-600', text: '0%' };
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

  const yesterdayIndicator = getPerformanceIndicator(metrics.vsYesterday);
  const weeklyIndicator = getPerformanceIndicator(metrics.vsWeeklyAvg);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Performance</h2>
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

      {/* Primary Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Today's Revenue"
            value={`₦${metrics.totalRevenue.toLocaleString()}`}
            description="Total sales revenue"
            change={{
              value: yesterdayIndicator.text,
              type: metrics.vsYesterday > 0 ? 'increase' : metrics.vsYesterday < 0 ? 'decrease' : 'neutral',
              period: 'vs yesterday'
            }}
            icon={<DollarSign className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Daily Target"
            value={`${metrics.targetProgress.toFixed(1)}%`}
            description={`₦${data.salesTarget.currentSales.toLocaleString()} / ₦${data.salesTarget.dailyTarget.toLocaleString()}`}
            change={{
              value: metrics.projectedTotal > data.salesTarget.dailyTarget ? 'On Track' : 'Behind',
              type: metrics.projectedTotal > data.salesTarget.dailyTarget ? 'increase' : 'decrease',
              period: 'projected'
            }}
            icon={<Target className="w-5 h-5" />}
            loading={loading}
            hover="lift"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Items Sold"
            value={`${metrics.totalQuantity}`}
            description={`${data.customerCount} customers served`}
            change={{
              value: `₦${metrics.avgOrderValue.toFixed(0)}`,
              type: metrics.avgOrderValue > data.averageOrderValue ? 'increase' : 'decrease',
              period: 'avg order value'
            }}
            icon={<ShoppingCart className="w-5 h-5" />}
            loading={loading}
            hover="scale"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <MetricCard
            title="Hourly Rate"
            value={`₦${metrics.hourlyRate.toFixed(0)}/hr`}
            description="Current sales pace"
            change={{
              value: weeklyIndicator.text,
              type: metrics.vsWeeklyAvg > 0 ? 'increase' : metrics.vsWeeklyAvg < 0 ? 'decrease' : 'neutral',
              period: 'vs weekly avg'
            }}
            icon={<Clock className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>
      </motion.div>

      {/* Target Progress Bar */}
      <motion.div 
        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Target Progress</h3>
            <p className="text-sm text-gray-500">
              {data.salesTarget.timeRemaining > 0 ? 
                `${data.salesTarget.timeRemaining.toFixed(1)} hours remaining` : 
                'Shift completed'
              }
            </p>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold", getTargetColor(metrics.targetProgress))}>
              {metrics.targetProgress.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              ₦{(data.salesTarget.dailyTarget - metrics.totalRevenue).toLocaleString()} to go
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={cn(
                "h-4 rounded-full transition-all duration-700 relative",
                metrics.targetProgress >= 100 ? "bg-green-500" :
                metrics.targetProgress >= 75 ? "bg-orange-500" :
                metrics.targetProgress >= 50 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(metrics.targetProgress, 100)}%` }}
            >
              {metrics.targetProgress > 10 && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-medium">
                  {metrics.targetProgress.toFixed(0)}%
                </div>
              )}
            </div>
          </div>
          
          {/* Projection indicator */}
          {data.salesTarget.timeRemaining > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Current: ₦{metrics.totalRevenue.toLocaleString()}</span>
              <span>Projected: ₦{metrics.projectedTotal.toFixed(0)}</span>
              <span>Target: ₦{data.salesTarget.dailyTarget.toLocaleString()}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Secondary Metrics Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Customer Analytics */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Customer Analytics</h3>
                <p className="text-sm text-gray-500">Sales by customer type</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Individual</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{getCustomerTypeStats.individual}</span>
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Regular</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{getCustomerTypeStats.regular}</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bulk Orders</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{getCustomerTypeStats.bulk}</span>
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Performance */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Top Performance</h3>
                <p className="text-sm text-gray-500">Best selling today</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Best Seller</span>
                <span className="font-medium text-gray-900">{data.topSellingBread}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Order</span>
                <span className="font-medium text-gray-900">
                  ₦{metrics.avgOrderValue.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Performance</span>
                <span className={cn(
                  "flex items-center gap-1 font-medium",
                  metrics.targetProgress >= 75 ? "text-green-600" : "text-orange-600"
                )}>
                  {metrics.targetProgress >= 75 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <BarChart3 className="w-3 h-3" />
                  )}
                  {metrics.targetProgress >= 75 ? 'Excellent' : 'Good'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Quick Stats</h3>
                <p className="text-sm text-gray-500">Key metrics</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sales Rate</span>
                <span className="font-medium text-gray-900">
                  {data.todaySales.length}/{8 - data.salesTarget.timeRemaining} per hour
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Efficiency</span>
                <span className={cn(
                  "font-medium",
                  metrics.hourlyRate > data.averageOrderValue ? "text-green-600" : "text-orange-600"
                )}>
                  {metrics.hourlyRate > data.averageOrderValue ? 'High' : 'Standard'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Trend</span>
                <span className={cn("flex items-center gap-1", yesterdayIndicator.color)}>
                  <yesterdayIndicator.icon className="w-3 h-3" />
                  {metrics.vsYesterday > 0 ? 'Improving' : metrics.vsYesterday < 0 ? 'Declining' : 'Stable'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}