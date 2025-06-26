'use client';

import { useState } from 'react';
import { MetricsCard } from './metrics-card';
import { Card } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { ShiftToggle } from '@/components/shift-toggle';
import { 
  Factory, 
  TrendingUp, 
  Package, 
  BarChart3,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrencyNGN } from '@/lib/utils/currency';

export function ManagerDashboard() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Static data for now
  const metrics = {
    todayProduced: 120,
    todaySold: 95,
    todayRevenue: 14250,
    remaining: 25,
    morningProduced: 80,
    nightProduced: 40
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Manager Dashboard</h2>
          <p className="text-sm text-gray-600">Production and shift management</p>
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

      {/* Shift Management */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shift Management</h3>
        <div className="flex items-center justify-between">
          <ShiftToggle />
          <LoadingButton 
            onClick={() => router.push('/dashboard/production')}
            className="flex items-center space-x-2"
            icon={Plus}
          >
            Log Production
          </LoadingButton>
        </div>
      </Card>

      {/* Production Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Today&apos;s Production"
          value={metrics.todayProduced}
          icon={Factory}
          subtitle="Loaves manufactured"
        />
        <MetricsCard
          title="Today&apos;s Sales"
          value={metrics.todaySold}
          icon={TrendingUp}
          subtitle="Loaves sold"
        />
        <MetricsCard
          title="Today&apos;s Revenue"
          value={formatCurrencyNGN(metrics.todayRevenue)}
          icon={BarChart3}
          subtitle="Daily earnings"
        />
        <MetricsCard
          title="Remaining Stock"
          value={metrics.remaining}
          icon={Package}
          subtitle="Unsold inventory"
        />
      </div>

      {/* Shift Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Morning Shift</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Produced</span>
              <span className="font-semibold">{metrics.morningProduced} loaves</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge color="success">Completed</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time</span>
              <span className="text-sm text-gray-500">06:00 - 18:00</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Night Shift</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Produced</span>
              <span className="font-semibold">{metrics.nightProduced} loaves</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge color="warning">In Progress</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Time</span>
              <span className="text-sm text-gray-500">18:00 - 06:00</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingButton 
            onClick={() => router.push('/dashboard/production')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={Factory}
          >
            Production Log
          </LoadingButton>
          <LoadingButton 
            onClick={() => router.push('/dashboard/inventory')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={Package}
          >
            Inventory
          </LoadingButton>
          <LoadingButton 
            onClick={() => router.push('/dashboard/reports')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={BarChart3}
          >
            Reports
          </LoadingButton>
        </div>
      </Card>
    </div>
  );
}
