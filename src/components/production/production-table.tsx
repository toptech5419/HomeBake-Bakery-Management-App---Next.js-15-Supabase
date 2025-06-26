import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Clock, Calendar, MessageSquare } from 'lucide-react';

interface ProductionLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  created_at: string;
  feedback?: string;
  bread_types?: { name: string };
}

interface ProductionTableProps {
  logs: ProductionLog[];
  loading?: boolean;
}

export default function ProductionTable({ logs, loading }: ProductionTableProps) {
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
        <Package className="h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No production logs found</h3>
        <p className="text-muted-foreground">Start logging your production to see entries here.</p>
      </Card>
    );
  }

  // Group logs by shift for better mobile display
  const morningLogs = logs.filter(log => log.shift === 'morning');
  const nightLogs = logs.filter(log => log.shift === 'night');

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
              <ProductionLogCard key={log.id} log={log} />
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
              <ProductionLogCard key={log.id} log={log} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionLogCard({ log }: { log: ProductionLog }) {
  return (
    <Card className="hover:shadow-md transition-shadow p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          {log.feedback && (
            <div className="flex items-start mt-2 text-sm text-muted-foreground">
              <MessageSquare className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{log.feedback}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {log.quantity}
          </div>
          <div className="text-xs text-muted-foreground">units</div>
        </div>
      </div>
    </Card>
  );
} 