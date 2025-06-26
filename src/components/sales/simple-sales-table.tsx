import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Package } from 'lucide-react';

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

interface SimpleSalesTableProps {
  logs: SalesLog[];
  title?: string;
}

export default function SimpleSalesTable({ logs, title = "Sales Entries" }: SimpleSalesTableProps) {
  if (logs.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground">No sales entries found.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 text-lg font-semibold">{title}</div>
      <div className="space-y-3">
        {logs.map((log) => {
          const unitPrice = log.bread_types?.unit_price || 0;
          const discountMultiplier = (100 - (log.discount_percentage || 0)) / 100;
          const totalPrice = unitPrice * log.quantity_sold * discountMultiplier;
          
          return (
            <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <div className="font-medium">{log.bread_types?.name || 'Unknown Bread'}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {log.shift.charAt(0).toUpperCase() + log.shift.slice(1)} Shift
                  <span>•</span>
                  {new Date(log.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-lg">${totalPrice.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  {log.quantity_sold} × ${unitPrice.toFixed(2)}
                  {log.discount_percentage > 0 && (
                    <span className="text-green-600 ml-1">
                      (-{log.discount_percentage}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
} 