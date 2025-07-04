'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BreadType, ProductionLog, SalesLog, UserRole } from '@/types';
import type { Database } from '@/types/supabase';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { ArrowLeft, Plus, Minus, Search } from 'lucide-react';
import Link from 'next/link';

// Use the actual database types
type ProductionLogDB = Database['public']['Tables']['production_logs']['Row'];
type SalesLogDB = Database['public']['Tables']['sales_logs']['Row'];
type BreadTypeDB = Database['public']['Tables']['bread_types']['Row'];

interface InventoryLogsClientProps {
  productionLogs: (ProductionLogDB & { bread_types: BreadTypeDB })[];
  salesLogs: (SalesLogDB & { bread_types: BreadTypeDB })[];
}

interface LogEntry {
  id: string;
  type: 'production' | 'sale';
  breadType: BreadTypeDB;
  quantity: number;
  shift: 'morning' | 'night';
  createdAt: Date;
  amount?: number;
  returned?: boolean;
}

export default function InventoryLogsClient({
  productionLogs,
  salesLogs
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
      createdAt: new Date(log.created_at), // Fix: use created_at from database
    })),
    ...salesLogs.map(log => ({
      id: log.id,
      type: 'sale' as const,
      breadType: log.bread_types,
      quantity: log.quantity,
      shift: log.shift,
      createdAt: new Date(log.created_at), // Fix: use created_at from database
      amount: log.quantity * (log.unit_price || 0), // Fix: use unit_price from database
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Inventory</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory Audit Logs</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Complete history of all inventory changes through production and sales
            </p>
          </div>
        </div>

        {/* Responsive Filters */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="flex-1 w-full">
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
            
            <div className="w-full lg:w-auto">
              <label className="text-sm font-medium mb-2 block">Filter Type</label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterType === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className="flex-1 sm:flex-none"
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'production' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('production')}
                  className="flex-1 sm:flex-none"
                >
                  Production
                </Button>
                <Button
                  variant={filterType === 'sale' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('sale')}
                  className="flex-1 sm:flex-none"
                >
                  Sales
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Responsive Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {productionLogs.reduce((sum, log) => sum + log.quantity, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Produced</p>
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {salesLogs.filter(log => !log.returned).reduce((sum, log) => sum + log.quantity, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Sold</p>
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {salesLogs.filter(log => log.returned).reduce((sum, log) => sum + log.quantity, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Returns</p>
            </div>
          </Card>
        </div>

        {/* Responsive Logs Display */}
        <Card className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Activity Timeline</h2>
            <p className="text-muted-foreground text-sm">
              Showing {filteredLogs.length} of {allLogs.length} total entries
            </p>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
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
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredLogs.slice(0, 50).map((log) => (
              <div key={`${log.type}-${log.id}`} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getLogColor(log.type, log.returned)}`}>
                    {getLogIcon(log.type, log.returned)}
                    {log.type === 'production' ? 'Production' : 
                     log.returned ? 'Return' : 'Sale'}
                  </div>
                                     <Badge>
                     {log.shift === 'morning' ? '☀️' : '🌙'} {log.shift}
                   </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="font-medium text-lg">{log.breadType.name}</div>
                  {log.breadType.size && (
                    <div className="text-sm text-muted-foreground">{log.breadType.size}</div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Quantity: {log.type === 'production' ? '+' : '-'}{log.quantity}
                    </span>
                    {log.amount && (
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrencyNGN(log.amount)}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {getLogDescription(log)}
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your criteria
            </div>
          )}
          
          {filteredLogs.length > 50 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Showing first 50 entries. Use filters to narrow down results.
            </div>
          )}
        </Card>

        {/* Responsive Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/dashboard/inventory">
            <Button variant="outline" className="w-full sm:w-auto">
              Back to Inventory
            </Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button variant="outline" className="w-full sm:w-auto">
              View Reports
            </Button>
          </Link>
        </div>

        {/* Mobile Bottom Padding */}
        <div className="h-4 sm:h-8" />
      </div>
    </div>
  );
}