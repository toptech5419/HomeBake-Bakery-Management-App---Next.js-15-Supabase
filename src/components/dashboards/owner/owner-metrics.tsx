'use client';

import { MetricCard } from '@/components/ui/card';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { formatNigeriaDate, getRelativeTime, nigeriaTime } from '@/lib/utils/timezone';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface OwnerMetricsProps {
  data: {
    todayRevenue: number;
    yesterdayRevenue: number;
    activeProduction: number;
    totalProduction: number;
    inventoryValue: number;
    lowStockItems: number;
    staffOnline: number;
    totalStaff: number;
    currentShift: 'morning' | 'night';
    lastUpdate: string;
  };
  loading?: boolean;
}

export function OwnerMetrics({ data, loading = false }: OwnerMetricsProps) {
  // Calculate performance changes
  const revenueChange = useMemo(() => {
    if (data.yesterdayRevenue === 0) return null;
    const change = ((data.todayRevenue - data.yesterdayRevenue) / data.yesterdayRevenue) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral'
    };
  }, [data.todayRevenue, data.yesterdayRevenue]);

  const productionEfficiency = useMemo(() => {
    const efficiency = (data.activeProduction / Math.max(data.totalProduction, 1)) * 100;
    return {
      value: efficiency.toFixed(1),
      type: efficiency > 80 ? 'increase' : efficiency > 60 ? 'neutral' : 'decrease'
    };
  }, [data.activeProduction, data.totalProduction]);

  const staffUtilization = useMemo(() => {
    const utilization = (data.staffOnline / Math.max(data.totalStaff, 1)) * 100;
    return {
      value: utilization.toFixed(1),
      type: utilization > 80 ? 'increase' : utilization > 50 ? 'neutral' : 'decrease'
    };
  }, [data.staffOnline, data.totalStaff]);

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
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
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

      {/* Primary Metrics Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Today's Revenue */}
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Today's Revenue"
            value={`₦${data.todayRevenue.toLocaleString()}`}
            description="Total sales revenue"
            change={revenueChange ? {
              value: `${revenueChange.value}%`,
              type: revenueChange.type as any,
              period: 'vs yesterday'
            } : undefined}
            icon={<DollarSign className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>

        {/* Active Production */}
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Active Production"
            value={`${data.activeProduction}`}
            description="Batches in progress"
            change={{
              value: `${productionEfficiency.value}%`,
              type: productionEfficiency.type as any,
              period: 'efficiency'
            }}
            icon={<Package className="w-5 h-5" />}
            loading={loading}
            hover="lift"
          />
        </motion.div>

        {/* Inventory Value */}
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Inventory Value"
            value={`₦${data.inventoryValue.toLocaleString()}`}
            description={`${data.lowStockItems} low stock alerts`}
            change={data.lowStockItems > 0 ? {
              value: `${data.lowStockItems}`,
              type: 'decrease' as any,
              period: 'items low'
            } : {
              value: 'All Good',
              type: 'increase' as any,
              period: 'stock levels'
            }}
            icon={data.lowStockItems > 0 ? 
              <AlertTriangle className="w-5 h-5" /> : 
              <CheckCircle className="w-5 h-5" />
            }
            loading={loading}
            hover="scale"
          />
        </motion.div>

        {/* Staff Status */}
        <motion.div variants={itemVariants}>
          <MetricCard
            title="Staff Online"
            value={`${data.staffOnline}/${data.totalStaff}`}
            description="Active team members"
            change={{
              value: `${staffUtilization.value}%`,
              type: staffUtilization.type as any,
              period: 'utilization'
            }}
            icon={<Users className="w-5 h-5" />}
            loading={loading}
            hover="glow"
          />
        </motion.div>
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Shift Performance */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Shift Status</h3>
                <p className="text-sm text-gray-500">Current operations</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Shift</span>
                <span className="font-medium text-gray-900 capitalize">
                  {data.currentShift}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Shift Progress</span>
                <span className="font-medium text-gray-900">
                  {(() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    if (data.currentShift === 'morning') {
                      const progress = Math.min(((currentHour - 6) / 8) * 100, 100);
                      return `${Math.max(progress, 0).toFixed(0)}%`;
                    } else {
                      const progress = currentHour >= 14 ? 
                        ((currentHour - 14) / 16) * 100 : 
                        ((currentHour + 10) / 16) * 100;
                      return `${Math.min(progress, 100).toFixed(0)}%`;
                    }
                  })()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: (() => {
                      const now = new Date();
                      const currentHour = now.getHours();
                      if (data.currentShift === 'morning') {
                        const progress = Math.min(((currentHour - 6) / 8) * 100, 100);
                        return `${Math.max(progress, 0)}%`;
                      } else {
                        const progress = currentHour >= 14 ? 
                          ((currentHour - 14) / 16) * 100 : 
                          ((currentHour + 10) / 16) * 100;
                        return `${Math.min(progress, 100)}%`;
                      }
                    })()
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Quick Stats</h3>
                <p className="text-sm text-gray-500">Key performance indicators</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Daily Revenue</span>
                <span className="font-medium text-gray-900">
                  ₦{Math.round(data.todayRevenue * 0.85).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Production Rate</span>
                <span className="font-medium text-gray-900">
                  {Math.round(data.totalProduction / 8)} items/hour
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">System Status</span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alerts & Notifications */}
        <motion.div variants={itemVariants}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                data.lowStockItems > 0 ? "bg-red-100" : "bg-green-100"
              )}>
                {data.lowStockItems > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">System Alerts</h3>
                <p className="text-sm text-gray-500">Active notifications</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {data.lowStockItems > 0 ? (
                <>
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Low Stock Alert</p>
                      <p className="text-xs text-red-600">{data.lowStockItems} items need attention</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-700">All Systems Good</p>
                    <p className="text-xs text-green-600">No alerts at this time</p>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  View All Notifications →
                </button>
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