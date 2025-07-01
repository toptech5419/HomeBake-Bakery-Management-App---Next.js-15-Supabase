'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeManager } from '@/lib/supabase/realtime';
import { useToast } from '@/components/ui/ToastProvider';

interface RealtimeContextType {
  isConnected: boolean;
  connectionCount: number;
  lastActivity: Date | null;
  enableRealtime: () => void;
  disableRealtime: () => void;
  reconnectAll: () => void;
  getConnectionStatus: () => Array<{ id: string; table: string; isConnected: boolean }>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
  showConnectionStatus?: boolean;
  autoReconnect?: boolean;
}

export function RealtimeProvider({ 
  children, 
  showConnectionStatus = false,
  autoReconnect = true 
}: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const toast = useToast();

  // Monitor connection status
  const updateConnectionStatus = useCallback(() => {
    const subscriptions = realtimeManager.getActiveSubscriptions();
    const connectedCount = subscriptions.filter(sub => sub.isConnected).length;
    const totalCount = subscriptions.length;
    
    setConnectionCount(connectedCount);
    setIsConnected(totalCount > 0 && connectedCount === totalCount);
    
    if (connectedCount > 0) {
      setLastActivity(new Date());
    }
  }, []);

  // Enable real-time updates
  const enableRealtime = useCallback(() => {
    setIsEnabled(true);
    if (showConnectionStatus) {
      toast.success('Real-time updates enabled');
    }
  }, [showConnectionStatus, toast]);

  // Disable real-time updates
  const disableRealtime = useCallback(() => {
    setIsEnabled(false);
    realtimeManager.unsubscribeAll();
    setIsConnected(false);
    setConnectionCount(0);
    if (showConnectionStatus) {
      toast.info('Real-time updates disabled');
    }
  }, [showConnectionStatus, toast]);

  // Reconnect all subscriptions
  const reconnectAll = useCallback(() => {
    if (!isEnabled) return;
    
    realtimeManager.unsubscribeAll();
    setTimeout(() => {
      updateConnectionStatus();
      if (showConnectionStatus) {
        toast.info('Reconnecting to real-time updates...');
      }
    }, 1000);
  }, [isEnabled, updateConnectionStatus, showConnectionStatus, toast]);

  // Get current connection status
  const getConnectionStatus = useCallback(() => {
    return realtimeManager.getActiveSubscriptions();
  }, []);

  // Monitor connection status periodically
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(updateConnectionStatus, 5000); // Check every 5 seconds
    updateConnectionStatus(); // Initial check

    return () => clearInterval(interval);
  }, [isEnabled, updateConnectionStatus]);

  // Auto-reconnect on network status changes
  useEffect(() => {
    if (!autoReconnect || !isEnabled) return;

    const handleOnline = () => {
      console.log('Network back online, reconnecting...');
      setTimeout(reconnectAll, 2000);
    };

    const handleOffline = () => {
      console.log('Network offline, real-time updates paused');
      if (showConnectionStatus) {
        toast.info('Network offline - real-time updates paused');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoReconnect, isEnabled, reconnectAll, showConnectionStatus, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realtimeManager.unsubscribeAll();
    };
  }, []);

  // Handle visibility change (tab focus/blur)
  useEffect(() => {
    if (!autoReconnect || !isEnabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible, check connections
        setTimeout(updateConnectionStatus, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoReconnect, isEnabled, updateConnectionStatus]);

  const contextValue: RealtimeContextType = {
    isConnected,
    connectionCount,
    lastActivity,
    enableRealtime,
    disableRealtime,
    reconnectAll,
    getConnectionStatus
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
      {showConnectionStatus && <RealtimeStatusIndicator />}
    </RealtimeContext.Provider>
  );
}

/**
 * Visual indicator for real-time connection status
 */
function RealtimeStatusIndicator() {
  const { isConnected, connectionCount } = useRealtimeContext();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Show indicator briefly when connection status changes
    setShowIndicator(true);
    const timer = setTimeout(() => setShowIndicator(false), 3000);
    return () => clearTimeout(timer);
  }, [isConnected, connectionCount]);

  if (!showIndicator) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
      isConnected 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
        <span>
          {isConnected 
            ? `Real-time connected (${connectionCount})` 
            : `Connecting... (${connectionCount})`
          }
        </span>
      </div>
    </div>
  );
}

/**
 * Hook to check if real-time is available and connected
 */
export function useRealtimeStatus() {
  const { isConnected, connectionCount, lastActivity } = useRealtimeContext();
  
  return {
    isConnected,
    connectionCount,
    lastActivity,
    isAvailable: typeof window !== 'undefined' && 'WebSocket' in window
  };
}

/**
 * Hook to control real-time connections
 */
export function useRealtimeControls() {
  const { 
    enableRealtime, 
    disableRealtime, 
    reconnectAll, 
    getConnectionStatus 
  } = useRealtimeContext();
  
  return {
    enable: enableRealtime,
    disable: disableRealtime,
    reconnect: reconnectAll,
    getStatus: getConnectionStatus
  };
}