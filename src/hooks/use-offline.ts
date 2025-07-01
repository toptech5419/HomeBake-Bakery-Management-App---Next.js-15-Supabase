'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { OfflineSync, SyncResult, SyncStatus } from '@/lib/offline/sync';
import { OfflineQueue, queueEvents, QueueEvent } from '@/lib/offline/queue';
import { OfflineStorage, initializeOfflineDB } from '@/lib/offline/storage';
import { toast } from 'sonner';

export interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  hasOfflineData: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncTime?: number;
  syncHealth: {
    isHealthy: boolean;
    issues: string[];
  };
}

export interface OfflineActions {
  sync: (showNotification?: boolean) => Promise<SyncResult>;
  retryFailedActions: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  getQueueStats: () => Promise<any>;
}

export function useOffline(userId?: string): OfflineState & OfflineActions {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInitialized: false,
    hasOfflineData: false,
    isSyncing: false,
    syncStatus: {
      isActive: false,
      progress: { total: 0, completed: 0, failed: 0 }
    },
    pendingCount: 0,
    failedCount: 0,
    syncHealth: {
      isHealthy: true,
      issues: []
    }
  });

  const backgroundSyncCleanup = useRef<(() => void) | null>(null);
  const syncInProgress = useRef(false);

  // Initialize offline database and state
  const initialize = useCallback(async () => {
    try {
      await initializeOfflineDB();
      await updateState();
      setState(prev => ({ ...prev, isInitialized: true }));
      console.log('Offline system initialized');
    } catch (error) {
      console.error('Failed to initialize offline system:', error);
      toast.error('Failed to initialize offline features');
    }
  }, []);

  // Update state from storage
  const updateState = useCallback(async () => {
    try {
      const [stats, health, syncStatus] = await Promise.all([
        OfflineQueue.getQueueStats(),
        OfflineSync.getSyncHealth(),
        Promise.resolve(OfflineSync.getCurrentStatus())
      ]);

      setState(prev => ({
        ...prev,
        hasOfflineData: stats.total > 0,
        isSyncing: syncStatus.isActive,
        syncStatus,
        pendingCount: stats.pending,
        failedCount: stats.failed,
        lastSyncTime: health.lastSyncTime,
        syncHealth: {
          isHealthy: health.isHealthy,
          issues: health.issues
        }
      }));
    } catch (error) {
      console.error('Failed to update offline state:', error);
    }
  }, []);

  // Handle online/offline events
  const handleOnline = useCallback(async () => {
    console.log('Network connection restored');
    setState(prev => ({ ...prev, isOnline: true }));
    
    // Trigger sync when coming back online
    if (state.isInitialized && !syncInProgress.current) {
      await triggerSync(true);
    }
  }, [state.isInitialized]);

  const handleOffline = useCallback(() => {
    console.log('Network connection lost');
    setState(prev => ({ ...prev, isOnline: false }));
    toast.warning('You are now offline. Data will sync when connection is restored.');
  }, []);

  // Trigger sync with optional notification
  const triggerSync = useCallback(async (showNotification = false): Promise<SyncResult> => {
    if (syncInProgress.current) {
      throw new Error('Sync already in progress');
    }

    syncInProgress.current = true;

    try {
      const result = await OfflineSync.syncAll({ userId });
      
      if (result.success && result.syncedCount > 0) {
        if (showNotification) {
          toast.success(`Synced ${result.syncedCount} items successfully`);
        }
      } else if (result.failedCount > 0) {
        if (showNotification) {
          toast.error(`Failed to sync ${result.failedCount} items`);
        }
      }

      await updateState();
      return result;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      if (showNotification) {
        toast.error(`Sync failed: ${message}`);
      }
      throw error;
    } finally {
      syncInProgress.current = false;
    }
  }, [userId, updateState]);

  // Retry failed actions
  const retryFailedActions = useCallback(async (): Promise<SyncResult> => {
    try {
      const result = await OfflineSync.retryFailedActions();
      
      if (result.success && result.syncedCount > 0) {
        toast.success(`Retried and synced ${result.syncedCount} items`);
      }
      
      await updateState();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Retry failed: ${message}`);
      throw error;
    }
  }, [updateState]);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await OfflineStorage.clearAllData();
      await updateState();
      toast.success('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast.error('Failed to clear offline data');
    }
  }, [updateState]);

  // Get queue statistics
  const getQueueStats = useCallback(async () => {
    return await OfflineQueue.getQueueStats();
  }, []);

  // Handle queue events
  useEffect(() => {
    const handleQueueEvent = (event: QueueEvent) => {
      switch (event.type) {
        case 'action_added':
          updateState();
          break;
        case 'action_completed':
          updateState();
          break;
        case 'action_failed':
          updateState();
          if (event.error) {
            console.warn('Action failed:', event.error);
          }
          break;
        case 'sync_started':
          setState(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync_completed':
          setState(prev => ({ ...prev, isSyncing: false }));
          updateState();
          break;
      }
    };

    // Subscribe to queue events
    queueEvents.on('action_added', handleQueueEvent);
    queueEvents.on('action_completed', handleQueueEvent);
    queueEvents.on('action_failed', handleQueueEvent);
    queueEvents.on('sync_started', handleQueueEvent);
    queueEvents.on('sync_completed', handleQueueEvent);

    return () => {
      queueEvents.off('action_added', handleQueueEvent);
      queueEvents.off('action_completed', handleQueueEvent);
      queueEvents.off('action_failed', handleQueueEvent);
      queueEvents.off('sync_started', handleQueueEvent);
      queueEvents.off('sync_completed', handleQueueEvent);
    };
  }, [updateState]);

  // Handle sync status changes
  useEffect(() => {
    const unsubscribe = OfflineSync.onStatusChange((status) => {
      setState(prev => ({ ...prev, syncStatus: status, isSyncing: status.isActive }));
    });

    return unsubscribe;
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Set up network event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Start background sync when online and initialized
  useEffect(() => {
    if (state.isOnline && state.isInitialized) {
      // Clean up existing background sync
      if (backgroundSyncCleanup.current) {
        backgroundSyncCleanup.current();
      }

      // Start new background sync
      OfflineSync.startBackgroundSync({
        interval: 30000, // 30 seconds
        maxRetries: 3,
        exponentialBackoff: true
      }).then(cleanup => {
        backgroundSyncCleanup.current = cleanup;
      });
    } else {
      // Clean up background sync when offline
      if (backgroundSyncCleanup.current) {
        backgroundSyncCleanup.current();
        backgroundSyncCleanup.current = null;
      }
    }

    return () => {
      if (backgroundSyncCleanup.current) {
        backgroundSyncCleanup.current();
      }
    };
  }, [state.isOnline, state.isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundSyncCleanup.current) {
        backgroundSyncCleanup.current();
      }
    };
  }, []);

  return {
    ...state,
    sync: triggerSync,
    retryFailedActions,
    clearOfflineData,
    getQueueStats
  };
}

// Simplified hook for basic offline status
export function useOfflineStatus(): { isOnline: boolean; isOffline: boolean } {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
}