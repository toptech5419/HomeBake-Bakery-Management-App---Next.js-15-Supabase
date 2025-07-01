import { OfflineStorage, QueuedAction } from './storage';
import type { Database } from '@/types/supabase';

export type SalesLogInsert = Database['public']['Tables']['sales_logs']['Insert'];
export type ProductionLogInsert = Database['public']['Tables']['production_logs']['Insert'];
export type ShiftFeedbackInsert = Database['public']['Tables']['shift_feedback']['Insert'];
export type BreadTypeInsert = Database['public']['Tables']['bread_types']['Insert'];

export interface QueueableAction {
  type: QueuedAction['type'];
  action: QueuedAction['action'];
  data: SalesLogInsert | ProductionLogInsert | ShiftFeedbackInsert | BreadTypeInsert;
  userId: string;
}

export class OfflineQueue {
  
  // Add actions to queue
  static async addSalesLog(data: SalesLogInsert, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'sales_log',
      action: 'insert',
      data,
      userId
    });
  }

  static async addProductionLog(data: ProductionLogInsert, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'insert',
      data,
      userId
    });
  }

  static async addShiftFeedback(data: ShiftFeedbackInsert, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'shift_feedback',
      action: 'insert',
      data,
      userId
    });
  }

  static async addBreadType(data: BreadTypeInsert, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'bread_type',
      action: 'insert',
      data,
      userId
    });
  }

  static async updateSalesLog(id: string, data: Partial<SalesLogInsert>, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'sales_log',
      action: 'update',
      data: { id, ...data },
      userId
    });
  }

  static async updateProductionLog(id: string, data: Partial<ProductionLogInsert>, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'update',
      data: { id, ...data },
      userId
    });
  }

  static async deleteSalesLog(id: string, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'sales_log',
      action: 'delete',
      data: { id },
      userId
    });
  }

  static async deleteProductionLog(id: string, userId: string): Promise<number> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'delete',
      data: { id },
      userId
    });
  }

  // Queue status and management
  static async getPendingActions(): Promise<QueuedAction[]> {
    return await OfflineStorage.getQueuedActions('pending');
  }

  static async getFailedActions(): Promise<QueuedAction[]> {
    return await OfflineStorage.getQueuedActions('failed');
  }

  static async getAllActions(): Promise<QueuedAction[]> {
    return await OfflineStorage.getQueuedActions();
  }

  static async markActionAsCompleted(actionId: number): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'completed'
    });
  }

  static async markActionAsFailed(actionId: number, error: string): Promise<void> {
    const action = await OfflineStorage.getQueuedActions();
    const currentAction = action.find(a => a.id === actionId);
    
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'failed',
      lastError: error,
      retryCount: (currentAction?.retryCount || 0) + 1
    });
  }

  static async markActionAsSyncing(actionId: number): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'syncing'
    });
  }

  static async retryFailedAction(actionId: number): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'pending',
      lastError: undefined
    });
  }

  static async removeAction(actionId: number): Promise<void> {
    await OfflineStorage.removeQueuedAction(actionId);
  }

  static async clearCompletedActions(): Promise<void> {
    await OfflineStorage.clearCompletedActions();
  }

  // Statistics and monitoring
  static async getQueueStats(): Promise<{
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const actions = await OfflineStorage.getQueuedActions();
    
    const stats = {
      pending: 0,
      syncing: 0,
      completed: 0,
      failed: 0,
      total: actions.length
    };

    actions.forEach(action => {
      stats[action.status]++;
    });

    return stats;
  }

  static async getOldestPendingAction(): Promise<QueuedAction | null> {
    const pending = await this.getPendingActions();
    if (pending.length === 0) return null;
    
    return pending.sort((a, b) => a.timestamp - b.timestamp)[0];
  }

  static async getActionsForUser(userId: string): Promise<QueuedAction[]> {
    const actions = await OfflineStorage.getQueuedActions();
    return actions.filter(action => action.userId === userId);
  }

  // Queue health checks
  static async isQueueHealthy(): Promise<boolean> {
    const stats = await this.getQueueStats();
    
    // Consider queue unhealthy if:
    // - More than 50 failed actions
    // - More than 100 pending actions
    // - Any action has been retrying for more than 5 times
    if (stats.failed > 50 || stats.pending > 100) {
      return false;
    }

    const actions = await OfflineStorage.getQueuedActions();
    const hasStuckActions = actions.some(action => action.retryCount > 5);
    
    return !hasStuckActions;
  }

  static async cleanupOldActions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const actions = await OfflineStorage.getQueuedActions();
    const now = Date.now();
    let cleaned = 0;

    for (const action of actions) {
      if (action.status === 'completed' && (now - action.timestamp) > maxAge) {
        await OfflineStorage.removeQueuedAction(action.id!);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Priority handling
  static async prioritizeUserActions(userId: string): Promise<QueuedAction[]> {
    const pending = await this.getPendingActions();
    const userActions = pending.filter(action => action.userId === userId);
    const otherActions = pending.filter(action => action.userId !== userId);

    // Return user actions first, then others
    return [...userActions, ...otherActions];
  }

  // Batch processing
  static async getBatchForProcessing(batchSize: number = 10): Promise<QueuedAction[]> {
    const pending = await this.getPendingActions();
    return pending.slice(0, batchSize);
  }
}

// Event system for queue changes
export type QueueEventType = 'action_added' | 'action_completed' | 'action_failed' | 'sync_started' | 'sync_completed';

export interface QueueEvent {
  type: QueueEventType;
  actionId?: number;
  error?: string;
  timestamp: number;
}

class QueueEventEmitter {
  private listeners: Map<QueueEventType, Array<(event: QueueEvent) => void>> = new Map();

  on(eventType: QueueEventType, listener: (event: QueueEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: QueueEventType, listener: (event: QueueEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(eventType: QueueEventType, event: Omit<QueueEvent, 'type' | 'timestamp'>): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const fullEvent: QueueEvent = {
        ...event,
        type: eventType,
        timestamp: Date.now()
      };
      listeners.forEach(listener => listener(fullEvent));
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const queueEvents = new QueueEventEmitter();