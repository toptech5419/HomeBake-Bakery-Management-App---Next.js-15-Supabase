import { OfflineQueue } from './queue';
import { supabase } from '@/lib/supabase/client';
import type { QueuedAction } from './queue';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ actionId: string; error: string }>;
}

export interface SyncStatus {
  isActive: boolean;
  progress: { total: number; completed: number; failed: number };
}

export interface SyncOptions {
  retryFailed?: boolean;
  maxRetries?: number;
  batchSize?: number;
  userId?: string;
}

class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private isSyncing = false;
  private statusListeners: Array<(status: SyncStatus) => void> = [];

  static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    return this.sync(options);
  }

  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      retryFailed = false,
      maxRetries = 3,
      batchSize = 10
    } = options;

    if (this.isSyncing) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      // Get pending actions
      let actions = await OfflineQueue.getPendingActions();
      
      if (retryFailed) {
        const failedActions = await OfflineQueue.getFailedActions();
        actions = [...actions, ...failedActions];
      }

      // Filter out actions that have exceeded max retries
      actions = actions.filter(action => (action.retryCount || 0) < maxRetries);

      // Process actions in batches
      for (let i = 0; i < actions.length; i += batchSize) {
        const batch = actions.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(action => this.processAction(action))
        );

        batchResults.forEach((batchResult, index) => {
          const action = batch[i + index];
          if (batchResult.status === 'fulfilled') {
            result.syncedCount++;
            OfflineQueue.emit('action_completed', { actionId: action.id });
          } else {
            result.failedCount++;
            const errorMessage = batchResult.reason?.message || 'Unknown error';
            result.errors.push({ actionId: action.id, error: errorMessage });
            OfflineQueue.emit('action_failed', { actionId: action.id, error: errorMessage });
          }
        });
      }
    } catch (error) {
      result.success = false;
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private async processAction(action: QueuedAction): Promise<void> {
    try {
      // Mark as syncing
      await OfflineQueue.markActionAsSyncing(action.id);

      // Process based on action type
      switch (action.type) {
        case 'sales_log':
          await this.processSalesAction(action);
          break;
        case 'production_log':
          await this.processProductionAction(action);
          break;
        case 'shift_feedback':
          await this.processShiftFeedbackAction(action);
          break;
        case 'bread_type':
          await this.processBreadTypeAction(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Mark as completed
      await OfflineQueue.markActionAsCompleted(action.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await OfflineQueue.markActionAsFailed(action.id, errorMessage);
      throw error;
    }
  }

  private async processSalesAction(action: QueuedAction): Promise<void> {
    const { data } = action;
    const { error } = await supabase
      .from('sales_logs')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
  }

  private async processProductionAction(action: QueuedAction): Promise<void> {
    const { data } = action;
    const { error } = await supabase
      .from('production_logs')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
  }

  private async processShiftFeedbackAction(action: QueuedAction): Promise<void> {
    const { data } = action;
    const { error } = await supabase
      .from('shift_feedback')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
  }

  private async processBreadTypeAction(action: QueuedAction): Promise<void> {
    const { data } = action;
    const { error } = await supabase
      .from('bread_types')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
  }

  private async processUpdateBreadTypeAction(action: QueuedAction): Promise<void> {
    const { data } = action;
    const { breadTypeId, updates } = data;
    const { error } = await supabase
      .from('bread_types')
      .update(updates)
      .eq('id', breadTypeId)
      .select()
      .single();

    if (error) throw error;
  }

  async retryFailedActions(): Promise<SyncResult> {
    return this.sync({ retryFailed: true });
  }

  getCurrentStatus(): SyncStatus {
    return {
      isActive: this.isSyncing,
      progress: { total: 0, completed: 0, failed: 0 }
    };
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  async getSyncHealth(): Promise<{ isHealthy: boolean; lastSyncTime?: number; issues: string[] }> {
    try {
      const actions = await OfflineQueue.getPendingActions();
      const failedActions = await OfflineQueue.getFailedActions();
      
      return {
        isHealthy: failedActions.length === 0,
        lastSyncTime: Date.now(),
        issues: failedActions.length > 0 ? [`${failedActions.length} failed actions`] : []
      };
    } catch (error) {
      return {
        isHealthy: false,
        issues: ['Sync health check failed']
      };
    }
  }

  async isSyncNeeded(): Promise<boolean> {
    const actions = await OfflineQueue.getPendingActions();
    return actions.length > 0;
  }

  async startBackgroundSync(options: SyncOptions = {}): Promise<() => void> {
    const interval = setInterval(async () => {
      if (await this.isSyncNeeded()) {
        await this.sync(options);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }
}

export const OfflineSync = OfflineSyncManager.getInstance();