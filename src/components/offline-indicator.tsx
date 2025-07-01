'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/hooks/use-offline';
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  userId?: string;
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ 
  userId, 
  className, 
  showDetails = false 
}: OfflineIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const {
    isOnline,
    isInitialized,
    hasOfflineData,
    isSyncing,
    syncStatus,
    pendingCount,
    failedCount,
    lastSyncTime,
    syncHealth,
    sync,
    retryFailedActions
  } = useOffline(userId);

  // Don't render anything if we're online and have no offline data
  if (isOnline && !hasOfflineData && !isSyncing) {
    return null;
  }

  const handleSync = async () => {
    if (isSyncing) return;
    
    try {
      await sync(true);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleRetry = async () => {
    if (isRetrying || failedCount === 0) return;
    
    setIsRetrying(true);
    try {
      await retryFailedActions();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-600" />;
    }
    
    if (failedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    
    if (hasOfflineData) {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      const { progress } = syncStatus;
      return `Syncing... ${progress.completed}/${progress.total}`;
    }
    
    if (!isOnline) {
      return 'Offline';
    }
    
    if (failedCount > 0) {
      return `${failedCount} failed items`;
    }
    
    if (pendingCount > 0) {
      return `${pendingCount} items pending`;
    }
    
    return 'All synced';
  };

  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-50 border-blue-200';
    if (!isOnline) return 'bg-red-50 border-red-200';
    if (failedCount > 0) return 'bg-yellow-50 border-yellow-200';
    if (hasOfflineData) return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const diff = Date.now() - lastSyncTime;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <Card className={cn(
      'fixed bottom-4 left-4 right-4 z-50 border transition-all duration-200',
      'md:left-auto md:right-4 md:w-80',
      getStatusColor(),
      className
    )}>
      <div className="p-3">
        {/* Main status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <span className="text-sm font-medium truncate">
              {getStatusText()}
            </span>
            
            {/* Connection status badge */}
            <Badge className={cn(
              "text-xs",
              isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {/* Sync button */}
            {isOnline && (pendingCount > 0 || failedCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isSyncing && "animate-spin"
                )} />
              </Button>
            )}

            {/* Show details button */}
            {showDetails && (hasOfflineData || failedCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && showDetails && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {/* Sync progress */}
            {isSyncing && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Syncing progress</span>
                  <span>{syncStatus.progress.completed}/{syncStatus.progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(syncStatus.progress.completed / syncStatus.progress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Queue stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-medium">{pendingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-medium text-red-600">{failedCount}</span>
              </div>
            </div>

            {/* Last sync time */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Last sync:</span>
              <span className="font-medium">{formatLastSync()}</span>
            </div>

            {/* Health issues */}
            {syncHealth.issues.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-red-600">Issues:</div>
                {syncHealth.issues.map((issue, index) => (
                  <div key={index} className="text-xs text-red-600 pl-2">
                    • {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {failedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying || isSyncing}
                  className="flex-1 text-xs"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Failed
                    </>
                  )}
                </Button>
              )}

              {isOnline && pendingCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1 text-xs"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Simplified offline banner for less intrusive display
export function OfflineBanner({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  if (isOnline) return null;

  return (
    <div className={cn(
      'bg-red-50 border-l-4 border-red-400 p-4',
      className
    )}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <WifiOff className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            You&apos;re currently offline. 
            {pendingCount > 0 && ` ${pendingCount} items will sync when connection is restored.`}
            {isSyncing && ' Syncing in progress...'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Mini indicator for header/navigation
export function OfflineStatusDot({ className }: { className?: string }) {
  const { isOnline, hasOfflineData, isSyncing } = useOffline();

  if (isOnline && !hasOfflineData && !isSyncing) return null;

  const getColor = () => {
    if (isSyncing) return 'bg-blue-500';
    if (!isOnline) return 'bg-red-500';
    if (hasOfflineData) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        getColor(),
        isSyncing && 'animate-pulse'
      )} />
      {isSyncing && (
        <div className={cn(
          'absolute inset-0 w-2 h-2 rounded-full',
          'bg-blue-500 animate-ping'
        )} />
      )}
    </div>
  );
}