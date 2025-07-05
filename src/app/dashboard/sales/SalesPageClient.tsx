'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadType, SalesLog, UserRole, ShiftType } from '@/types';
import { useShift } from '@/hooks/use-shift';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { TrendingUp, Package, AlertCircle, Plus } from 'lucide-react';

interface SalesPageClientProps {
  breadTypes: BreadType[];
  salesLogs: (SalesLog & { bread_types: BreadType })[];
  userRole: UserRole;
  userId: string;
}

export default function SalesPageClient({
  breadTypes,
  salesLogs: initialSalesLogs,
  userRole,
  userId
}: SalesPageClientProps) {
  const { shift: currentShift, setShift: setCurrentShift } = useShift();
  const [salesLogs, setSalesLogs] = useState(initialSalesLogs);
  const router = useRouter();

  // Calculate metrics for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todaySales = salesLogs.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= todayStart;
  });

  const shiftMetrics = {
    totalSales: todaySales.reduce((sum, sale) => 
      sum + (sale.quantity * (sale.unitPrice || 0)), 0),
    totalItems: todaySales.reduce((sum, sale) => 
      sum + sale.quantity, 0),
    totalReturns: todaySales.filter(sale => sale.returned).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Management</h1>
          <p className="text-muted-foreground">
            Record and track sales transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Shift:</span>
          <Badge>
            {currentShift === 'morning' ? '☀️ Morning' : '🌙 Night'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentShift(currentShift === 'morning' ? 'night' : 'morning')}
          >
            Switch Shift
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
                              <p className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</p>
              <p className="text-2xl font-bold">{formatCurrencyNGN(shiftMetrics.totalSales)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
              <p className="text-2xl font-bold">{shiftMetrics.totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Returns</p>
              <p className="text-2xl font-bold">{shiftMetrics.totalReturns}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        {userRole === 'sales_rep' && (
          <Button onClick={() => router.push('/dashboard/sales/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Record Sale
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/sales/shift')}
        >
          Manage Shift
        </Button>
        <Button 
          variant="outline"
          onClick={() => router.push('/dashboard/sales/end')}
        >
          End Shift
        </Button>
      </div>

      {/* Sales History */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent Sales</h2>
          <p className="text-muted-foreground">
            {userRole === 'sales_rep' 
              ? 'Your recent sales transactions' 
              : 'All recent sales transactions'
            }
          </p>
        </div>
        
        {/* Simple Sales Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Bread Type</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Shift</th>
              </tr>
            </thead>
            <tbody>
              {salesLogs.slice(0, 10).map((sale) => (
                <tr key={sale.id} className="border-b">
                  <td className="p-2">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">{sale.bread_types.name}</td>
                  <td className="p-2">{sale.quantity}</td>
                  <td className="p-2">
                    {formatCurrencyNGN(sale.quantity * (sale.unitPrice || 0))}
                  </td>
                  <td className="p-2">
                    <Badge>
                      {sale.shift === 'morning' ? '☀️' : '🌙'} {sale.shift}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {salesLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sales recorded yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}