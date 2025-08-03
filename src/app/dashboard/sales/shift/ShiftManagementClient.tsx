'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadType, SalesLog, UserRole, ShiftFeedback } from '@/types';
import { useShift } from '@/hooks/use-shift';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { Clock, FileText, ArrowLeft } from 'lucide-react';

interface ShiftManagementClientProps {
  todaysSales: (SalesLog & { bread_types: BreadType })[];
  shiftFeedback: ShiftFeedback[];
  userRole: UserRole;
  userId: string;
}

export default function ShiftManagementClient({
  todaysSales,
  shiftFeedback,
  userRole
}: ShiftManagementClientProps) {
  const { shift: currentShift, setShift: setCurrentShift } = useShift();

  // Filter sales by shift
  const morningSales = todaysSales.filter(sale => sale.shift === 'morning');
  const nightSales = todaysSales.filter(sale => sale.shift === 'night');

  // Calculate shift metrics
  const calculateShiftMetrics = (sales: typeof todaysSales) => {
    return {
      totalRevenue: sales.reduce((sum, sale) => 
        sum + (sale.quantity * (sale.unitPrice || 0)), 0),
      totalItems: sales.reduce((sum, sale) => 
        sum + sale.quantity, 0),
      totalTransactions: sales.length
    };
  };

  const morningMetrics = calculateShiftMetrics(morningSales);
  const nightMetrics = calculateShiftMetrics(nightSales);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
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
              <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
              <p className="text-muted-foreground">
                Monitor and manage your shift performance
              </p>
            </div>
          </div>
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
            Switch to {currentShift === 'morning' ? 'Night' : 'Morning'}
          </Button>
        </div>
      </div>

      {/* Shift Comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Morning Shift */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              ☀️ Morning Shift
            </h2>
            <Badge>
              {currentShift === 'morning' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrencyNGN(morningMetrics.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items Sold</span>
              <span className="font-semibold">{morningMetrics.totalItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transactions</span>
              <span className="font-semibold">{morningMetrics.totalTransactions}</span>
            </div>
          </div>
        </Card>

        {/* Night Shift */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              🌙 Night Shift
            </h2>
            <Badge>
              {currentShift === 'night' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold">{formatCurrencyNGN(nightMetrics.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items Sold</span>
              <span className="font-semibold">{nightMetrics.totalItems}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transactions</span>
              <span className="font-semibold">{nightMetrics.totalTransactions}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Current Shift Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {currentShift === 'morning' ? '☀️ Morning' : '🌙 Night'} Shift Actions
          </h2>
        </div>
        
        <div className="flex gap-4">
          {userRole === 'sales_rep' && (
            <Button onClick={() => window.location.href = '/dashboard/sales'}>
              Record Sale
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/sales/end'}
          >
            End Current Shift
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard/inventory'}
          >
            Check Inventory
          </Button>
        </div>
      </Card>

      {/* Current Shift Sales */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            {currentShift === 'morning' ? '☀️ Morning' : '🌙 Night'} Shift Sales
          </h2>
          <p className="text-muted-foreground">
            Sales recorded during the current shift
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Bread Type</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {todaysSales
                .filter(sale => sale.shift === currentShift)
                .slice(0, 10)
                .map((sale) => (
                  <tr key={sale.id} className="border-b">
                    <td className="p-2">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-2">{sale.bread_types.name}</td>
                    <td className="p-2">{sale.quantity}</td>
                    <td className="p-2">
                      {formatCurrencyNGN(sale.quantity * (sale.unitPrice || 0))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          
          {todaysSales.filter(sale => sale.shift === currentShift).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No sales recorded for {currentShift} shift yet
            </div>
          )}
        </div>
      </Card>

      {/* Shift Feedback */}
      {shiftFeedback.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Today&apos;s Feedback
            </h2>
            <p className="text-muted-foreground">
              Feedback submitted during shifts
            </p>
          </div>
          
          <div className="space-y-3">
            {shiftFeedback.map((feedback) => (
              <div key={feedback.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge>
                    {feedback.shift === 'morning' ? '☀️ Morning' : '🌙 Night'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(feedback.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{feedback.note}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}