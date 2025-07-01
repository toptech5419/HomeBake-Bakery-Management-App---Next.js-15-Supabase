'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Clock 
} from 'lucide-react';
import {
  useInventory,
  useTodaysSales,
  useTodaysProduction,
  useManualRefresh,
  useAutoRefresh
} from '@/hooks/use-inventory';

interface InventoryDashboardClientProps {
  userRole: UserRole;
  userId: string;
}

export default function InventoryDashboardClient({
  userRole
}: InventoryDashboardClientProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Use React Query hooks for data fetching with polling
  const { 
    data: inventoryItems = [], 
    isLoading: inventoryLoading, 
    error: inventoryError,
    dataUpdatedAt: inventoryUpdatedAt
  } = useInventory(20000); // Poll every 20 seconds

  const { 
    isLoading: salesLoading 
  } = useTodaysSales(30000); // Poll every 30 seconds

  const { 
    isLoading: productionLoading 
  } = useTodaysProduction(30000); // Poll every 30 seconds

  const { refreshAll } = useManualRefresh();

  // Enable auto-refresh on visibility change and network reconnection
  useAutoRefresh(true);

  const isLoading = inventoryLoading || salesLoading || productionLoading;

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate summary metrics
  const totalProduced = inventoryItems.reduce((sum, item) => sum + item.total_produced, 0);
  const totalSold = inventoryItems.reduce((sum, item) => sum + item.total_sold, 0);
  const totalRemaining = inventoryItems.reduce((sum, item) => sum + item.current_stock, 0);
  const totalRevenue = inventoryItems.reduce((sum, item) => sum + (item.total_sold * item.unit_price), 0);

  const getStatusColor = (stock: number, produced: number) => {
    if (stock <= 0) return 'text-red-600 bg-red-50 border-red-200';
    if (stock > produced * 0.6) return 'text-green-600 bg-green-50 border-green-200';
    if (stock < produced * 0.2) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (stock: number, produced: number) => {
    if (stock <= 0) return <TrendingDown className="h-4 w-4" />;
    if (stock > produced * 0.6) return <TrendingUp className="h-4 w-4" />;
    if (stock < produced * 0.2) return <AlertTriangle className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  const getStatusText = (stock: number, produced: number) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock > produced * 0.6) return 'High Stock';
    if (stock < produced * 0.2) return 'Low Stock';
    return 'Normal';
  };

  const lowStockItems = inventoryItems.filter(item => 
    item.current_stock <= 0 || item.current_stock < item.total_produced * 0.2
  );

  // Show error state
  if (inventoryError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Error Loading Inventory</h3>
          </div>
          <p className="text-red-700">
            {inventoryError.message || 'Failed to load inventory data. Please try again.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time stock levels and inventory movement
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-blue-600">Updating...</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-green-600 text-xs">
                  Updated {new Date(inventoryUpdatedAt).toLocaleTimeString()}
                </span>
              </>
            )}
          </div>
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(refreshing || isLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/inventory/logs'}
          >
            View Logs
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Produced</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  totalProduced
                )}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sold</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  totalSold
                )}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  totalRemaining
                )}
              </p>
            </div>
            <AlertTriangle className={`h-8 w-8 ${totalRemaining < 5 ? 'text-red-500' : 'text-gray-500'}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  formatCurrencyNGN(totalRevenue)
                )}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Current Inventory Levels</h2>
          <p className="text-muted-foreground">
            Real-time calculation from today's production and sales data
          </p>
        </div>
        
        {isLoading && inventoryItems.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading inventory data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Bread Type</th>
                  <th className="text-left p-2">Size</th>
                  <th className="text-left p-2">Produced</th>
                  <th className="text-left p-2">Sold</th>
                  <th className="text-left p-2">Leftover</th>
                  <th className="text-left p-2">Current Stock</th>
                  <th className="text-left p-2">Revenue</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item) => (
                  <tr key={item.bread_type_id} className="border-b">
                    <td className="p-2 font-medium">{item.bread_type_name}</td>
                    <td className="p-2 text-muted-foreground">{item.bread_type_size || 'Standard'}</td>
                    <td className="p-2">{item.total_produced}</td>
                    <td className="p-2">{item.total_sold}</td>
                    <td className="p-2">{item.total_leftover}</td>
                    <td className="p-2 font-medium text-lg">{item.current_stock}</td>
                    <td className="p-2">{formatCurrencyNGN(item.total_sold * item.unit_price)}</td>
                    <td className="p-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.current_stock, item.total_produced)}`}>
                        {getStatusIcon(item.current_stock, item.total_produced)}
                        {getStatusText(item.current_stock, item.total_produced)}
                      </div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {item.last_production && (
                        <div>
                          Prod: {new Date(item.last_production).toLocaleTimeString()}
                        </div>
                      )}
                      {item.last_sale && (
                        <div>
                          Sale: {new Date(item.last_sale).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {inventoryItems.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No bread types configured yet
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4">
        {(userRole === 'manager' || userRole === 'owner') && (
          <Button onClick={() => window.location.href = '/dashboard/production'}>
            Log Production
          </Button>
        )}
        {userRole === 'sales_rep' && (
          <Button onClick={() => window.location.href = '/dashboard/sales'}>
            Record Sale
          </Button>
        )}
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/dashboard/reports'}
        >
          View Reports
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Stock Alert</h3>
          </div>
          <p className="text-red-700 mb-3">
            The following items are running low or out of stock:
          </p>
          <div className="space-y-1">
            {lowStockItems.map(item => (
              <div key={item.bread_type_id} className="text-red-700">
                • {item.bread_type_name}: {item.current_stock} remaining
                {item.current_stock <= 0 && <Badge className="ml-2 bg-red-600">OUT OF STOCK</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Auto-update Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            This dashboard updates automatically every 20-30 seconds. 
            Data refreshes when you switch tabs or go online.
          </span>
        </div>
      </Card>
    </div>
  );
}