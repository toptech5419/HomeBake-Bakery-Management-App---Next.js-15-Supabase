import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Clock, Calendar, DollarSign } from 'lucide-react';

interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity_sold: number;
  discount_percentage: number;
  shift: 'morning' | 'night';
  created_at: string;
  bread_types?: { 
    name: string;
    unit_price: number;
  };
}

interface SalesTableProps {
  logs: SalesLog[];
  loading?: boolean;
}

export default function SalesTable({ logs, loading }: SalesTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="py-6 flex flex-col items-center">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No sales logs found</h3>
        <p className="text-muted-foreground">Start logging your sales to see entries here.</p>
      </Card>
    );
  }

  // Group logs by shift for better mobile display
  const morningLogs = logs.filter(log => log.shift === 'morning');
  const nightLogs = logs.filter(log => log.shift === 'night');

  const calculateRevenue = (log: SalesLog) => {
    const discountMultiplier = (100 - (log.discount_percentage || 0)) / 100;
    const unitPrice = log.bread_types?.unit_price || 0;
    return log.quantity_sold * unitPrice * discountMultiplier;
  };

  return (
    <div className="space-y-6">
      {morningLogs.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <Badge variant="default" className="mr-2">Morning Shift</Badge>
            <span className="text-muted-foreground">({morningLogs.length} entries)</span>
          </div>
          <div className="space-y-3">
            {morningLogs.map((log) => (
              <SalesLogCard key={log.id} log={log} calculateRevenue={calculateRevenue} />
            ))}
          </div>
        </div>
      )}

      {nightLogs.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <Badge variant="secondary" className="mr-2">Night Shift</Badge>
            <span className="text-muted-foreground">({nightLogs.length} entries)</span>
          </div>
          <div className="space-y-3">
            {nightLogs.map((log) => (
              <SalesLogCard key={log.id} log={log} calculateRevenue={calculateRevenue} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SalesLogCard({ 
  log, 
  calculateRevenue 
}: { 
  log: SalesLog;
  calculateRevenue: (log: SalesLog) => number;
}) {
  const revenue = calculateRevenue(log);
  
  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center md:justify-between p-4">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-base truncate">
          {log.bread_types?.name || log.bread_type_id}
        </h4>
        <div className="flex items-center mt-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {new Date(log.created_at).toLocaleDateString()}
          <Clock className="h-3 w-3 ml-3 mr-1" />
          {new Date(log.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
        {log.discount_percentage > 0 && (
          <div className="flex items-center mt-1">
            <Badge variant="outline" className="text-xs">
              {log.discount_percentage}% off
            </Badge>
          </div>
        )}
      </div>
      <div className="ml-0 md:ml-4 text-right mt-4 md:mt-0 space-y-1">
        <div className="text-2xl font-bold text-primary">
          {log.quantity_sold}
        </div>
        <div className="text-xs text-muted-foreground">units sold</div>
        <div className="flex items-center justify-end text-sm font-medium text-green-600">
          <DollarSign className="h-3 w-3 mr-1" />
          {revenue.toFixed(2)}
        </div>
      </div>
    </Card>
  );
} 