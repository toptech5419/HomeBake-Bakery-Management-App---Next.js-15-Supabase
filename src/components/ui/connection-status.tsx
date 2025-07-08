'use client';

import { useData } from '@/contexts/DataContext';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { connectionStatus, error, lastUpdated, refreshData } = useData();

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: 'text-green-600',
          bg: 'bg-green-100',
          text: 'Connected'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          text: 'Connecting...'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          text: 'Offline'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-600',
          bg: 'bg-red-100',
          text: 'Error'
        };
    }
  };

  const status = getStatusInfo();

  if (connectionStatus === 'connected' && !error) {
    // Only show connection status when there are issues
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      status.bg,
      "border-current border-opacity-20"
    )}>
      <div className={status.color}>
        {status.icon}
      </div>
      <div className="flex-1">
        <div className={cn("text-sm font-medium", status.color)}>
          {status.text}
        </div>
        {error && (
          <div className="text-xs text-gray-600 mt-1">
            {error}
          </div>
        )}
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
      {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
        <Button
          size="sm"
          variant="outline"
          onClick={refreshData}
          className="h-7 px-2 text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  );
}