'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BreadType, ProductionLog, SalesLog, UserRole } from '@/types';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { ArrowLeft, Plus, Minus, Search, Filter } from 'lucide-react';

interface InventoryLogsClientProps {
  productionLogs: (ProductionLog & { bread_types: BreadType })[];
  salesLogs: (SalesLog & { bread_types: BreadType })[];
  userRole: UserRole;
  userId: string;
}

interface LogEntry {
  id: string;
  type: 'production' | 'sale';
  breadType: BreadType;
  quantity: number;
  shift: 'morning' | 'night';
  createdAt: Date;
  amount?: number;
  returned?: boolean;
}

export default function InventoryLogsClient({
  productionLogs,
  salesLogs,
  userRole,
  userId
}: InventoryLogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'production' | 'sale'>('all');

  // Combine and sort all logs
  const allLogs: LogEntry[] = [
    ...productionLogs.map(log => ({
      id: log.id,
      type: 'production' as const,
      breadType: log.bread_types,
      quantity: log.quantity,
      shift: log.shift,
      createdAt: log.createdAt,
    })),
    ...salesLogs.map(log => ({
      id: log.id,
      type: 'sale' as const,
      breadType: log.bread_types,
      quantity: log.quantity,
      shift: log.shift,
      createdAt: log.createdAt,
      amount: log.quantity * (log.unitPrice || 0),
      returned: log.returned,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter logs based on search and type
  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = log.breadType.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const getLogIcon = (type: string, returned?: boolean) => {
    if (type === 'production') return <Plus className="h-4 w-4 text-green-600" />;
    if (returned) return <Minus className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-blue-600" />;
  };

  const getLogColor = (type: string, returned?: boolean) => {
    if (type === 'production') return 'text-green-700 bg-green-50 border-green-200';
    if (returned) return 'text-red-700 bg-red-50 border-red-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  const getLogDescription = (log: LogEntry) => {
    if (log.type === 'production') {
      return `Added ${log.quantity} units to inventory`;
    }
    if (log.returned) {
      return `Returned ${log.quantity} units`;
    }
    return `Sold ${log.quantity} units`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete history of all inventory changes through production and sales
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Search Bread Type</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search by bread type name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Filter Type</label>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'production' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('production')}
              >
                Production
              </Button>
              <Button
                variant={filterType === 'sale' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('sale')}
              >
                Sales
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {productionLogs.reduce((sum, log) => sum + log.quantity, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Produced</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {salesLogs.filter(log => !log.returned).reduce((sum, log) => sum + log.quantity, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Sold</p>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {salesLogs.filter(log => log.returned).reduce((sum, log) => sum + log.quantity, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Returns</p>
          </div>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Activity Timeline</h2>
          <p className="text-muted-foreground">
            Showing {filteredLogs.length} of {allLogs.length} total entries
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date & Time</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Bread Type</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Shift</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.slice(0, 50).map((log) => (
                <tr key={`${log.type}-${log.id}`} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <div className="text-sm">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getLogColor(log.type, log.returned)}`}>
                      {getLogIcon(log.type, log.returned)}
                      {log.type === 'production' ? 'Production' : 
                       log.returned ? 'Return' : 'Sale'}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{log.breadType.name}</div>
                    {log.breadType.size && (
                      <div className="text-xs text-muted-foreground">{log.breadType.size}</div>
                    )}
                  </td>
                  <td className="p-2 font-medium">
                    {log.type === 'production' ? '+' : '-'}{log.quantity}
                  </td>
                  <td className="p-2">
                    <Badge>
                      {log.shift === 'morning' ? '☀️' : '🌙'} {log.shift}
                    </Badge>
                  </td>
                  <td className="p-2">
                    {log.amount ? formatCurrencyNGN(log.amount) : '-'}
                  </td>
                  <td className="p-2 text-sm text-muted-foreground">
                    {getLogDescription(log)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your criteria
            </div>
          )}
          
          {filteredLogs.length > 50 && (
            <div className="text-center py-4 text-muted-foreground">
              Showing first 50 entries. Use filters to narrow down results.
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/dashboard/inventory'}
        >
          Back to Inventory
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/dashboard/reports'}
        >
          View Reports
        </Button>
      </div>
    </div>
  );
}