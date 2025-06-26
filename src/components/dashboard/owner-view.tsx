'use client';

import { useState } from 'react';
import { MetricsCard } from './metrics-card';
import { Card } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  UserPlus, 
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrencyNGN } from '@/lib/utils/currency';

export function OwnerDashboard() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Static data for now - will be replaced with real Supabase data
  const metrics = {
    totalUsers: 12,
    totalBreadTypes: 8,
    totalRevenue: 1500000,
    totalProduced: 2450,
    todayRevenue: 45000,
    todayProduced: 120,
    todaySold: 95
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'invite':
        router.push('/dashboard/users/invite');
        break;
      case 'bread-types':
        router.push('/dashboard/bread-types');
        break;
      case 'reports':
        router.push('/dashboard/reports');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Owner Dashboard</h2>
          <p className="text-sm text-gray-600">System overview and management</p>
        </div>
        <LoadingButton
          onClick={handleRefresh}
          isLoading={isRefreshing}
          variant="outline"
          size="sm"
          icon={RefreshCw}
        >
          Refresh
        </LoadingButton>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingButton 
            onClick={() => handleQuickAction('invite')}
            className="flex items-center justify-center space-x-2"
            icon={UserPlus}
          >
            Invite Staff
          </LoadingButton>
          <LoadingButton 
            onClick={() => handleQuickAction('bread-types')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={Package}
          >
            Manage Bread Types
          </LoadingButton>
          <LoadingButton 
            onClick={() => handleQuickAction('reports')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={BarChart3}
          >
            View Reports
          </LoadingButton>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Users"
          value={metrics.totalUsers}
          icon={Users}
          subtitle="Active staff members"
          clickable
          onClick={() => router.push('/dashboard/users')}
        />
        <MetricsCard
          title="Bread Types"
          value={metrics.totalBreadTypes}
          icon={Package}
          subtitle="Available products"
          clickable
          onClick={() => router.push('/dashboard/bread-types')}
        />
        <MetricsCard
          title="Total Revenue"
          value={formatCurrencyNGN(metrics.totalRevenue)}
          icon={DollarSign}
          subtitle="All-time earnings"
          trend={{
            value: 12,
            isPositive: true,
            period: 'this month'
          }}
        />
        <MetricsCard
          title="Total Produced"
          value={metrics.totalProduced}
          icon={TrendingUp}
          subtitle="Loaves manufactured"
          trend={{
            value: 8,
            isPositive: true,
            period: 'this week'
          }}
        />
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrencyNGN(metrics.todayRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Loaves Produced</span>
              <span className="font-semibold">{metrics.todayProduced}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Loaves Sold</span>
              <span className="font-semibold">{metrics.todaySold}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Active Users</span>
              <Badge color="success">{metrics.totalUsers} Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bread Types</span>
              <Badge color="info">{metrics.totalBreadTypes} Types</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">System Health</span>
              <Badge color="success">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Updated</span>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Activity feed coming soon...</p>
          <p className="text-xs mt-2">Real-time notifications and system events</p>
        </div>
      </Card>
    </div>
  );
}
