'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Users,
  Package,
  FileText,
  BarChart3,
  Clock,
  Plus,
  Factory,
  ShoppingCart,
  Activity,
} from 'lucide-react';
import { GridContainer } from '../shared/GridContainer';
import { MetricCard } from '../shared/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'sale' | 'production' | 'inventory' | 'staff' | 'alert' | 'system';
  title: string;
  description: string;
  amount?: number;
  user?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface OwnerDashboardProps {
  data: {
    user: {
      name: string;
      role: string;
    };
    metrics: {
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
    alerts: {
      lowStock: number;
      pendingReports: number;
      staffNotifications: number;
    };
    activities: ActivityItem[];
  };
}

export function OwnerDashboard({ data }: OwnerDashboardProps) {
  const router = useRouter();
  const { productionLogs, salesLogs, users } = useData();
  
  const { metrics, alerts, activities } = data;

  const revenueChange = ((metrics.todayRevenue - metrics.yesterdayRevenue) / metrics.yesterdayRevenue) * 100;

  // Calculate today's production and sales metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayProduction = productionLogs.filter(log => 
    new Date(log.created_at) >= today
  );
  
  const todaySales = salesLogs.filter(log => 
    new Date(log.created_at) >= today
  );

  const totalProductionToday = todayProduction.reduce((sum, log) => sum + log.quantity, 0);
  const totalRevenueToday = todaySales.reduce((sum, log) => sum + (log.quantity * (log.unit_price || 0)), 0);

  // Get active staff count
  const activeStaffCount = users.filter(user => 
    user.role === 'sales_rep' || user.role === 'manager'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with Add Staff Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back, {data.user.name}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/users/invite')}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Key Metrics - Original Perfect Sizing */}
      <GridContainer cols={{ mobile: 2, tablet: 2, desktop: 4 }}>
        <MetricCard
          title="Today's Revenue"
          value={formatCurrency(totalRevenueToday)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          change={{
            value: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
            type: revenueChange >= 0 ? 'increase' : 'decrease',
          }}
          color={revenueChange >= 0 ? 'success' : 'error'}
        />
        
        {/* Sales Rep Log Summary Card */}
        <MetricCard
          title="Sales Logs"
          value={`${todaySales.length}`}
          icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
          onClick={() => router.push('/dashboard/sales')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        />
        
        {/* Production Log Summary Card */}
        <MetricCard
          title="Production"
          value={`${todayProduction.length}`}
          icon={<Factory className="h-5 w-5 text-orange-600" />}
          onClick={() => router.push('/dashboard/production')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        />
        
        <MetricCard
          title="Low Stock"
          value={alerts.lowStock}
          icon={<Package className="h-5 w-5 text-red-600" />}
          color={alerts.lowStock > 0 ? 'warning' : 'success'}
        />
      </GridContainer>

      {/* Financial Overview - Original Perfect Layout */}
      <GridContainer cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Today&apos;s Revenue</span>
                <span className="font-semibold">{formatCurrency(totalRevenueToday)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Yesterday</span>
                <span className="font-semibold">{formatCurrency(metrics.yesterdayRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Production Today</span>
                <span className="font-semibold">{totalProductionToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Value</span>
                <span className="font-semibold">{formatCurrency(metrics.inventoryValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Low Stock Alerts</span>
                <Badge variant={alerts.lowStock > 0 ? "destructive" : "secondary"}>
                  {alerts.lowStock}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Active Staff</span>
                <span className="font-semibold">{activeStaffCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Current Shift</span>
                <Badge variant="outline" className="capitalize">
                  {metrics.currentShift}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </GridContainer>

      {/* Quick Actions - Button Style */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="w-full"
              onClick={() => router.push('/dashboard/reports')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/analytics')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/inventory')}
            >
              <Package className="mr-2 h-4 w-4" />
              Manage Inventory
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/users')}
            >
              <Users className="mr-2 h-4 w-4" />
              Staff Management
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - Original Perfect Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activity</span>
            <Badge variant="outline" className="text-xs">
              <Activity className="h-4 w-4 mr-1" />
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    {activity.type === 'sale' && <DollarSign className="h-5 w-5 text-green-600" />}
                    {activity.type === 'production' && <Clock className="h-5 w-5 text-blue-600" />}
                    {activity.type === 'inventory' && <Package className="h-5 w-5 text-orange-600" />}
                    {activity.type === 'staff' && <Users className="h-5 w-5 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-slate-600">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {activity.priority && (
                    <Badge
                      variant={activity.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {activity.priority}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
