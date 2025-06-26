'use client';

import { useState } from 'react';
import { MetricsCard } from './metrics-card';
import { Card } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import { ShiftToggle } from '@/components/shift-toggle';
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Plus,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrencyNGN } from '@/lib/utils/currency';

export function SalesRepDashboard() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Static data for now
  const metrics = {
    todaySold: 95,
    todayRevenue: 14250,
    remaining: 25,
    morningSold: 60,
    nightSold: 35
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
          <h2 className="text-lg font-semibold text-gray-900">Sales Dashboard</h2>
          <p className="text-sm text-gray-600">Sales tracking and shift management</p>
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

      {/* Shift Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Shift</h3>
        <div className="flex items-center justify-between">
          <ShiftToggle />
          <div className="flex space-x-2">
            <LoadingButton 
              onClick={() => router.push('/dashboard/sales')}
              className="flex items-center space-x-2"
              icon={Plus}
            >
              Log Sale
            </LoadingButton>
            <LoadingButton 
              variant="outline"
              onClick={() => router.push('/dashboard/sales/end')}
            >
              End Shift
            </LoadingButton>
          </div>
        </div>
      </Card>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Today&apos;s Sales"
          value={metrics.todaySold}
          icon={ShoppingCart}
          subtitle="Loaves sold"
        />
        <MetricsCard
          title="Today&apos;s Revenue"
          value={formatCurrencyNGN(metrics.todayRevenue)}
          icon={DollarSign}
          subtitle="Daily earnings"
        />
        <MetricsCard
          title="Remaining Stock"
          value={metrics.remaining}
          icon={Package}
          subtitle="Unsold inventory"
        />
        <MetricsCard
          title="Performance"
          value="Good"
          icon={TrendingUp}
          subtitle="Sales rating"
        />
      </div>

      {/* Shift Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Morning Shift Sales</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Loaves Sold</span>
              <span className="font-semibold">{metrics.morningSold}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrencyNGN(metrics.morningSold * 150)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge color="success">Completed</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Night Shift Sales</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Loaves Sold</span>
              <span className="font-semibold">{metrics.nightSold}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrencyNGN(metrics.nightSold * 150)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status</span>
              <Badge color="warning">In Progress</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LoadingButton 
            onClick={() => router.push('/dashboard/sales')}
            className="flex items-center justify-center space-x-2"
            icon={ShoppingCart}
          >
            New Sale
          </LoadingButton>
          <LoadingButton 
            onClick={() => router.push('/dashboard/sales/history')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={Package}
          >
            Sales History
          </LoadingButton>
          <LoadingButton 
            onClick={() => router.push('/dashboard/sales/end')}
            variant="outline"
            className="flex items-center justify-center space-x-2"
            icon={Package}
          >
            End Shift
          </LoadingButton>
        </div>
      </Card>

      {/* Performance Tips */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Tips</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Keep track of your sales throughout the shift for better accuracy</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Report any unsold bread at the end of your shift</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
            <p>Use the shift toggle to ensure accurate shift-based reporting</p>
          </div>
        </div>
      </Card>
    </div>
  );
} 