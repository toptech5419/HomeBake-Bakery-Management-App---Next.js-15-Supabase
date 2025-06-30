'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadType, ProductionLog, SalesLog, UserRole } from '@/types';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { Package, TrendingDown, TrendingUp, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

interface InventoryDashboardClientProps {
  breadTypes: BreadType[];
  todaysProduction: (ProductionLog & { bread_types: BreadType })[];
  todaysSales: (SalesLog & { bread_types: BreadType })[];
  userRole: UserRole;
  userId: string;
}

interface InventoryItem {
  breadType: BreadType;
  produced: number;
  sold: number;
  remaining: number;
  revenue: number;
  status: 'low' | 'normal' | 'high';
}

export default function InventoryDashboardClient({
  breadTypes,
  todaysProduction,
  todaysSales,
  userRole,
  userId
}: InventoryDashboardClientProps) {

  // Calculate inventory for each bread type
  const inventoryItems: InventoryItem[] = breadTypes.map(breadType => {
    const produced = todaysProduction
      .filter(p => p.breadTypeId === breadType.id)
      .reduce((sum, p) => sum + p.quantity, 0);
    
    const sold = todaysSales
      .filter(s => s.breadTypeId === breadType.id)
      .reduce((sum, s) => sum + s.quantity, 0);
    
    const revenue = todaysSales
      .filter(s => s.breadTypeId === breadType.id)
      .reduce((sum, s) => sum + (s.quantity * (s.unitPrice || breadType.unit_price)), 0);
    
    const remaining = produced - sold;
    
    // Determine status based on remaining inventory
    let status: 'low' | 'normal' | 'high' = 'normal';
    if (remaining <= 0) status = 'low';
    else if (remaining > produced * 0.5) status = 'high';
    
    return {
      breadType,
      produced,
      sold,
      remaining,
      revenue,
      status
    };
  });

  // Calculate summary metrics
  const totalProduced = inventoryItems.reduce((sum, item) => sum + item.produced, 0);
  const totalSold = inventoryItems.reduce((sum, item) => sum + item.sold, 0);
  const totalRemaining = inventoryItems.reduce((sum, item) => sum + item.remaining, 0);
  const totalRevenue = inventoryItems.reduce((sum, item) => sum + item.revenue, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'low': return <TrendingDown className="h-4 w-4" />;
      case 'high': return <TrendingUp className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

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
              Track current stock levels and inventory movement
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
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
              <p className="text-2xl font-bold">{totalProduced}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sold</p>
              <p className="text-2xl font-bold">{totalSold}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">{totalRemaining}</p>
            </div>
            <AlertTriangle className={`h-8 w-8 ${totalRemaining < 5 ? 'text-red-500' : 'text-gray-500'}`} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
              <p className="text-2xl font-bold">{formatCurrencyNGN(totalRevenue)}</p>
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
            Calculated from today's production and sales data
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Bread Type</th>
                <th className="text-left p-2">Size</th>
                <th className="text-left p-2">Produced</th>
                <th className="text-left p-2">Sold</th>
                <th className="text-left p-2">Remaining</th>
                <th className="text-left p-2">Revenue</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item) => (
                <tr key={item.breadType.id} className="border-b">
                  <td className="p-2 font-medium">{item.breadType.name}</td>
                  <td className="p-2 text-muted-foreground">{item.breadType.size || 'Standard'}</td>
                  <td className="p-2">{item.produced}</td>
                  <td className="p-2">{item.sold}</td>
                  <td className="p-2 font-medium">{item.remaining}</td>
                  <td className="p-2">{formatCurrencyNGN(item.revenue)}</td>
                  <td className="p-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status === 'low' ? 'Low Stock' : 
                       item.status === 'high' ? 'High Stock' : 'Normal'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {inventoryItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No bread types configured yet
            </div>
          )}
        </div>
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
      {inventoryItems.some(item => item.status === 'low') && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Low Stock Alert</h3>
          </div>
          <p className="text-red-700 mb-3">
            The following items are running low or out of stock:
          </p>
          <div className="space-y-1">
            {inventoryItems
              .filter(item => item.status === 'low')
              .map(item => (
                <div key={item.breadType.id} className="text-red-700">
                  • {item.breadType.name}: {item.remaining} remaining
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}