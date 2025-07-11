'use client';

import React, { useState, useEffect } from 'react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  DollarSign,
  Users,
  AlertTriangle,
  ShoppingCart,
  Factory,
  TrendingUp,
  Package,
  Clock,
  FileText,
  UserPlus,
  BarChart3,
  Activity,
  CreditCard,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown,
  MoreHorizontal
} from 'lucide-react';

interface OwnerDashboardProps {
  userId: string;
  userData: {
    name: string;
    email: string;
    role: string;
  };
}

interface DashboardData {
  todayRevenue: number;
  totalStaffOnline: number;
  lowStockAlerts: number;
  activeOrders: number;
  productionStatus: {
    activeBatches: number;
    completedToday: number;
    efficiency: number;
  };
  salesPerformance: {
    totalSales: number;
    trend: number;
    bestSeller: string;
  };
  inventoryValue: number;
  shiftSummary: {
    morningShift: { revenue: number; staff: number };
    nightShift: { revenue: number; staff: number };
  };
  recentActivity: Array<{
    id: string;
    type: 'sale' | 'production' | 'staff' | 'alert';
    message: string;
    timestamp: Date;
    user?: string;
  }>;
  financialOverview: {
    weeklyRevenue: number;
    monthlyRevenue: number;
    profit: number;
    expenses: number;
  };
}

const SAMPLE_DATA: DashboardData = {
  todayRevenue: 125000,
  totalStaffOnline: 8,
  lowStockAlerts: 3,
  activeOrders: 12,
  productionStatus: {
    activeBatches: 4,
    completedToday: 15,
    efficiency: 87
  },
  salesPerformance: {
    totalSales: 145,
    trend: 12.5,
    bestSeller: 'White Bread'
  },
  inventoryValue: 85000,
  shiftSummary: {
    morningShift: { revenue: 75000, staff: 5 },
    nightShift: { revenue: 50000, staff: 3 }
  },
  recentActivity: [
    { id: '1', type: 'sale', message: 'Large order completed - ₦15,000', timestamp: new Date(Date.now() - 1000 * 60 * 5), user: 'Jane Doe' },
    { id: '2', type: 'production', message: 'Batch #B023 completed - 50 units', timestamp: new Date(Date.now() - 1000 * 60 * 15), user: 'John Smith' },
    { id: '3', type: 'alert', message: 'Low stock alert: Brown Bread', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { id: '4', type: 'staff', message: 'Staff member clocked in', timestamp: new Date(Date.now() - 1000 * 60 * 45), user: 'Mike Johnson' },
  ],
  financialOverview: {
    weeklyRevenue: 750000,
    monthlyRevenue: 3200000,
    profit: 485000,
    expenses: 265000
  }
};

export function OwnerDashboard({ userId, userData }: OwnerDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(SAMPLE_DATA);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setDashboardData(prev => ({
        ...prev,
        todayRevenue: prev.todayRevenue + Math.floor(Math.random() * 5000),
        activeOrders: prev.activeOrders + Math.floor(Math.random() * 2) - 1,
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'production': return <Factory className="h-4 w-4 text-blue-600" />;
      case 'staff': return <Users className="h-4 w-4 text-purple-600" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const quickActions = [
    { label: 'Generate Report', icon: FileText, onClick: () => console.log('Generate Report') },
    { label: 'Add Staff', icon: UserPlus, onClick: () => console.log('Add Staff') },
    { label: 'Performance Check', icon: BarChart3, onClick: () => console.log('Performance Check') },
    { label: 'Financial Review', icon: TrendingUp, onClick: () => console.log('Financial Review') },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {userData.name} • Complete business oversight
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedTimeRange === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('today')}
                >
                  Today
                </Button>
                <Button
                  variant={selectedTimeRange === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('week')}
                >
                  Week
                </Button>
                <Button
                  variant={selectedTimeRange === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeRange('month')}
                >
                  Month
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1: Primary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard
            title="Today's Revenue"
            value={formatCurrency(dashboardData.todayRevenue)}
            icon={DollarSign}
            iconColor="text-green-600"
            type="primary"
            size="large"
            trend={{
              value: 15.2,
              label: 'vs yesterday',
              isPositive: true
            }}
          />
          <DashboardCard
            title="Total Staff Online"
            value={dashboardData.totalStaffOnline}
            subtitle="Active across all shifts"
            icon={Users}
            iconColor="text-blue-600"
            type="primary"
            size="large"
            badge={{
              label: 'All Active',
              color: 'bg-green-100 text-green-800'
            }}
          />
          <DashboardCard
            title="Low Stock Alerts"
            value={dashboardData.lowStockAlerts}
            subtitle="Immediate attention needed"
            icon={AlertTriangle}
            iconColor="text-red-600"
            type="primary"
            size="large"
            badge={{
              label: 'Critical',
              color: 'bg-red-100 text-red-800'
            }}
          />
          <DashboardCard
            title="Active Orders"
            value={dashboardData.activeOrders}
            subtitle="In progress"
            icon={ShoppingCart}
            iconColor="text-purple-600"
            type="primary"
            size="large"
            trend={{
              value: 8.1,
              label: 'vs last hour',
              isPositive: true
            }}
          />
        </div>

        {/* Row 2: Production Status - Full Width */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Production Status</h3>
                <p className="text-gray-600">Real-time production monitoring and batch tracking</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {dashboardData.productionStatus.activeBatches} Active
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardData.productionStatus.activeBatches}
                </div>
                <div className="text-sm text-blue-800">Active Batches</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {dashboardData.productionStatus.completedToday}
                </div>
                <div className="text-sm text-green-800">Completed Today</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {dashboardData.productionStatus.efficiency}%
                </div>
                <div className="text-sm text-purple-800">Efficiency Rate</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Production Efficiency</span>
                <span className="text-sm text-gray-600">{dashboardData.productionStatus.efficiency}%</span>
              </div>
              <Progress value={dashboardData.productionStatus.efficiency} className="h-3" />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Target: 85%</span>
                <span>Current: {dashboardData.productionStatus.efficiency}%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 3: Sales Performance, Inventory Value, Shift Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <DashboardCard
            title="Sales Performance"
            value={dashboardData.salesPerformance.totalSales}
            subtitle={`Best seller: ${dashboardData.salesPerformance.bestSeller}`}
            icon={TrendingUp}
            iconColor="text-green-600"
            type="metric"
            trend={{
              value: dashboardData.salesPerformance.trend,
              label: 'vs last week',
              isPositive: true
            }}
          />
          <DashboardCard
            title="Inventory Value"
            value={formatCurrency(dashboardData.inventoryValue)}
            subtitle="Total stock value"
            icon={Package}
            iconColor="text-blue-600"
            type="metric"
          />
          <DashboardCard
            title="Shift Summary"
            icon={Clock}
            iconColor="text-purple-600"
            type="metric"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Morning Shift</span>
                <span className="font-medium">{formatCurrency(dashboardData.shiftSummary.morningShift.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Night Shift</span>
                <span className="font-medium">{formatCurrency(dashboardData.shiftSummary.nightShift.revenue)}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="font-bold">
                    {formatCurrency(dashboardData.shiftSummary.morningShift.revenue + dashboardData.shiftSummary.nightShift.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Row 4: Quick Actions */}
        <div className="mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="flex items-center gap-2 whitespace-nowrap"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Row 5: Recent Activity Feed & Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Feed */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                      {activity.user && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">{activity.user}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Financial Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
              <Badge className="bg-green-100 text-green-800">
                +{((dashboardData.financialOverview.profit / dashboardData.financialOverview.monthlyRevenue) * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">Weekly Revenue</p>
                  <p className="text-lg font-bold text-green-900">
                    {formatCurrency(dashboardData.financialOverview.weeklyRevenue)}
                  </p>
                </div>
                <ArrowUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-800">Monthly Revenue</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(dashboardData.financialOverview.monthlyRevenue)}
                  </p>
                </div>
                <ArrowUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-800">Profit</p>
                  <p className="text-lg font-bold text-purple-900">
                    {formatCurrency(dashboardData.financialOverview.profit)}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-800">Expenses</p>
                  <p className="text-lg font-bold text-orange-900">
                    {formatCurrency(dashboardData.financialOverview.expenses)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}