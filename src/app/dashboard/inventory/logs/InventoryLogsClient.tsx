'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProductionLogWithBreadType } from '@/types/database';

interface InventoryLogsClientProps {
  productionLogs: ProductionLogWithBreadType[];
}

export default function InventoryLogsClient({ productionLogs }: InventoryLogsClientProps) {
  const [filter, setFilter] = useState<'all' | 'morning' | 'night'>('all');

  const filteredLogs = productionLogs.filter(log => {
    if (filter === 'all') return true;
    return log.shift === filter;
  });

  const totalProduced = filteredLogs.reduce((sum, log) => sum + log.quantity, 0);
  const morningProduction = productionLogs
    .filter(log => log.shift === 'morning')
    .reduce((sum, log) => sum + log.quantity, 0);
  const nightProduction = productionLogs
    .filter(log => log.shift === 'night')
    .reduce((sum, log) => sum + log.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Shifts
        </button>
        <button
          onClick={() => setFilter('morning')}
          className={`px-4 py-2 rounded-md ${
            filter === 'morning' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Morning
        </button>
        <button
          onClick={() => setFilter('night')}
          className={`px-4 py-2 rounded-md ${
            filter === 'night' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Night
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Produced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProduced}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Morning Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{morningProduction}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Night Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nightProduction}</div>
          </CardContent>
        </Card>
      </div>

      {/* Production Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Production Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-medium">{log.bread_types.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={log.shift === 'morning' ? 'default' : 'secondary'}>
                    {log.shift}
                  </Badge>
                  <span className="font-medium">{log.quantity} units</span>
                </div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No production logs found for the selected filter.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}