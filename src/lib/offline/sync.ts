import { supabase } from '@/lib/supabase/client';
import { OfflineQueue, queueEvents } from './queue';
import { OfflineStorage, QueuedAction } from './storage';
import type { Database } from '@/types/supabase';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ actionId: number; error: string }>;
}

export interface SyncStatus {
  isActive: boolean;
  currentAction?: QueuedAction;
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  startTime?: number;
  estimatedTimeRemaining?: number;
}

export class OfflineSync {
  private static isRunning = false;
  private static currentSyncStatus: SyncStatus = {
    isActive: false,
    progress: { total: 0, completed: 0, failed: 0 }
  };

  private static statusListeners: Array<(status: SyncStatus) => void> = [];

  // Status management
  static getCurrentStatus(): SyncStatus {
    return { ...this.currentSyncStatus };
  }

  static onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private static updateStatus(updates: Partial<SyncStatus>): void {
    this.currentSyncStatus = { ...this.currentSyncStatus, ...updates };
    this.statusListeners.forEach(listener => listener(this.currentSyncStatus));
  }

  // Main sync function
  static async syncAll(options: { 
    maxRetries?: number;
    batchSize?: number;
    userId?: string;
  } = {}): Promise<SyncResult> {
    const { maxRetries = 3, batchSize = 10, userId } = options;

    if (this.isRunning) {
      throw new Error('Sync is already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    // Get actions to sync
    const actionsToSync = userId 
      ? await OfflineQueue.getActionsForUser(userId)
      : await OfflineQueue.getPendingActions();

    this.updateStatus({
      isActive: true,
      progress: { total: actionsToSync.length, completed: 0, failed: 0 },
      startTime
    });

    queueEvents.emit('sync_started', {});

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      // Process actions in batches
      for (let i = 0; i < actionsToSync.length; i += batchSize) {
        const batch = actionsToSync.slice(i, i + batchSize);
        
        for (const action of batch) {
          this.updateStatus({ currentAction: action });

          try {
            await OfflineQueue.markActionAsSyncing(action.id!);
            await this.syncAction(action);
            await OfflineQueue.markActionAsCompleted(action.id!);
            
            result.syncedCount++;
            this.updateStatus({
              progress: {
                ...this.currentSyncStatus.progress,
                completed: result.syncedCount
              }
            });

            queueEvents.emit('action_completed', { actionId: action.id });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await OfflineQueue.markActionAsFailed(action.id!, errorMessage);
            
            result.failedCount++;
            result.errors.push({ actionId: action.id!, error: errorMessage });
            
            this.updateStatus({
              progress: {
                ...this.currentSyncStatus.progress,
                failed: result.failedCount
              }
            });

            queueEvents.emit('action_failed', { actionId: action.id, error: errorMessage });

            if (result.failedCount > maxRetries) {
              result.success = false;
              break;
            }
          }
        }

        // Add small delay between batches to avoid overwhelming the server
        if (i + batchSize < actionsToSync.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Clean up completed actions
      await OfflineQueue.clearCompletedActions();

    } catch (error) {
      result.success = false;
      console.error('Sync failed:', error);
    } finally {
      this.isRunning = false;
      this.updateStatus({
        isActive: false,
        currentAction: undefined
      });

      queueEvents.emit('sync_completed', {});
    }

    return result;
  }

  // Sync individual action
  private static async syncAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'sales_log':
        await this.syncSalesLog(action);
        break;
      case 'production_log':
        await this.syncProductionLog(action);
        break;
      case 'shift_feedback':
        await this.syncShiftFeedback(action);
        break;
      case 'bread_type':
        await this.syncBreadType(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private static async syncSalesLog(action: QueuedAction): Promise<void> {
    const { data, action: actionType } = action;

    switch (actionType) {
      case 'insert':
        const { error: insertError } = await supabase
          .from('sales_logs')
          .insert(data);
        
        if (insertError) throw insertError;
        
        // Cache the synced data
        await OfflineStorage.cacheSalesLog({
          ...data,
          id: data.id || OfflineStorage.generateOfflineId(),
          _syncStatus: 'synced'
        });
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from('sales_logs')
          .update(updateData)
          .eq('id', id);
        
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('sales_logs')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        break;
    }
  }

  private static async syncProductionLog(action: QueuedAction): Promise<void> {
    const { data, action: actionType } = action;

    switch (actionType) {
      case 'insert':
        const { error: insertError } = await supabase
          .from('production_logs')
          .insert(data);
        
        if (insertError) throw insertError;
        
        // Cache the synced data
        await OfflineStorage.cacheProductionLog({
          ...data,
          id: data.id || OfflineStorage.generateOfflineId(),
          _syncStatus: 'synced'
        });
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from('production_logs')
          .update(updateData)
          .eq('id', id);
        
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('production_logs')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        break;
    }
  }

  private static async syncShiftFeedback(action: QueuedAction): Promise<void> {
    const { data, action: actionType } = action;

    switch (actionType) {
      case 'insert':
        const { error: insertError } = await supabase
          .from('shift_feedback')
          .insert(data);
        
        if (insertError) throw insertError;
        
        // Cache the synced data
        await OfflineStorage.cacheShiftFeedback({
          ...data,
          id: data.id || OfflineStorage.generateOfflineId(),
          _syncStatus: 'synced'
        });
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from('shift_feedback')
          .update(updateData)
          .eq('id', id);
        
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('shift_feedback')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        break;
    }
  }

  private static async syncBreadType(action: QueuedAction): Promise<void> {
    const { data, action: actionType } = action;

    switch (actionType) {
      case 'insert':
        const { error: insertError } = await supabase
          .from('bread_types')
          .insert(data);
        
        if (insertError) throw insertError;
        
        // Cache the synced data
        await OfflineStorage.cacheBreadType({
          ...data,
          id: data.id || OfflineStorage.generateOfflineId(),
          _syncStatus: 'synced'
        });
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from('bread_types')
          .update(updateData)
          .eq('id', id);
        
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('bread_types')
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Retry failed actions
  static async retryFailedActions(maxRetries: number = 3): Promise<SyncResult> {
    const failedActions = await OfflineQueue.getFailedActions();
    const actionsToRetry = failedActions.filter(action => action.retryCount < maxRetries);

    // Reset failed actions to pending
    for (const action of actionsToRetry) {
      await OfflineQueue.retryFailedAction(action.id!);
    }

    return await this.syncAll({ maxRetries });
  }

  // Force sync specific user's actions
  static async syncUserActions(userId: string): Promise<SyncResult> {
    return await this.syncAll({ userId });
  }

  // Check if sync is needed
  static async isSyncNeeded(): Promise<boolean> {
    const pendingActions = await OfflineQueue.getPendingActions();
    return pendingActions.length > 0;
  }

  // Get sync health status
  static async getSyncHealth(): Promise<{
    isHealthy: boolean;
    pendingCount: number;
    failedCount: number;
    lastSyncTime?: number;
    issues: string[];
  }> {
    const stats = await OfflineQueue.getQueueStats();
    const lastSyncMeta = await OfflineStorage.getSyncMetadata('last_sync');
    
    const issues: string[] = [];
    
    if (stats.failed > 10) {
      issues.push(`${stats.failed} failed actions need attention`);
    }
    
    if (stats.pending > 50) {
      issues.push(`${stats.pending} pending actions may indicate sync issues`);
    }

    const isHealthy = issues.length === 0;

    return {
      isHealthy,
      pendingCount: stats.pending,
      failedCount: stats.failed,
      lastSyncTime: lastSyncMeta?.lastSyncTimestamp,
      issues
    };
  }

  // Background sync with exponential backoff
  static async startBackgroundSync(options: {
    interval?: number;
    maxRetries?: number;
    exponentialBackoff?: boolean;
  } = {}): Promise<() => void> {
    const { 
      interval = 30000, // 30 seconds
      maxRetries = 3,
      exponentialBackoff = true 
    } = options;

    let currentInterval = interval;
    let consecutiveFailures = 0;

    const syncInterval = setInterval(async () => {
      try {
        if (navigator.onLine && await this.isSyncNeeded()) {
          const result = await this.syncAll({ maxRetries });
          
          if (result.success) {
            // Reset interval on success
            currentInterval = interval;
            consecutiveFailures = 0;
            await OfflineStorage.setSyncMetadata('last_sync', Date.now());
          } else {
            consecutiveFailures++;
            if (exponentialBackoff) {
              currentInterval = Math.min(interval * Math.pow(2, consecutiveFailures), 300000); // Max 5 minutes
            }
          }
        }
      } catch (error) {
        console.error('Background sync error:', error);
        consecutiveFailures++;
        if (exponentialBackoff) {
          currentInterval = Math.min(interval * Math.pow(2, consecutiveFailures), 300000);
        }
      }
    }, currentInterval);

    // Return cleanup function
    return () => {
      clearInterval(syncInterval);
    };
  }
}