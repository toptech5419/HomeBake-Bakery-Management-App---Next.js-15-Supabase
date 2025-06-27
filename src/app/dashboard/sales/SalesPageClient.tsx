"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ShiftSelector from '@/components/sales/shift-selector';
import SalesForm from '@/components/sales/sales-form';
import SalesTable from '@/components/sales/sales-table';
import { useShift } from '@/hooks/use-shift';
import { ShoppingCart, BarChart3, Plus, History } from 'lucide-react';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
  size?: string;
}

interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  returned: boolean;
  leftover?: number;
  shift: 'morning' | 'night';
  created_at: string;
  bread_types?: {
    name: string;
    unit_price: number;
  };
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface SalesPageClientProps {
  user: User;
  breadTypes: BreadType[];
  initialSalesLogs: SalesLog[];
}

export default function SalesPageClient({
  user,
  breadTypes,
  initialSalesLogs,
}: SalesPageClientProps) {
  const { shift } = useShift();
  const [activeTab, setActiveTab] = useState<'log' | 'history'>('log');
  const [displayLogs, setDisplayLogs] = useState<SalesLog[]>(initialSalesLogs);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Filter logs by current shift for the active view
  const currentShiftLogs = displayLogs.filter(log => log.shift === shift);
  const todayLogs = displayLogs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  // Calculate today's stats
  const todayStats = {
    totalSales: todayLogs.reduce((sum, log) => sum + log.quantity, 0),
    totalRevenue: todayLogs.reduce((sum, log) => {
      const price = log.unit_price || log.bread_types?.unit_price || 0;
      const discount = (log.discount || 0) / 100;
      return sum + (log.quantity * price * (1 - discount));
    }, 0),
    shiftSales: currentShiftLogs.reduce((sum, log) => sum + log.quantity, 0),
  };

  const handleSalesSuccess = () => {
    // Refresh by triggering a re-fetch or state update
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Logging</h1>
          <p className="text-muted-foreground">
            Record your sales for the {shift} shift
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="info">
            {user.name}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/sales/shift')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Manage Shift
          </Button>
        </div>
      </div>

      {/* Shift Selector */}
      <ShiftSelector className="mb-6" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Today's Sales</p>
              <p className="text-2xl font-bold">{todayStats.totalSales}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
              <p className="text-2xl font-bold">₦{todayStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <Badge color={shift === 'morning' ? 'morning' : 'night'} className="mr-2">
              {shift}
            </Badge>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Shift Sales</p>
              <p className="text-2xl font-bold">{todayStats.shiftSales}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'log'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Plus className="h-4 w-4 mr-2 inline" />
          Log Sales
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4 mr-2 inline" />
          Sales History
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'log' ? (
          <div className="space-y-6">
            <SalesForm
              breadTypes={breadTypes}
              userId={user.id}
              onSuccess={handleSalesSuccess}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Sales History</h2>
              <Badge color="default">
                {displayLogs.length} total entries
              </Badge>
            </div>
            <SalesTable
              logs={displayLogs}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}