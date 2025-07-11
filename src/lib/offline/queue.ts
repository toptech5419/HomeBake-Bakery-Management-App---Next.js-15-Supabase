import { OfflineStorage } from './storage';

export interface QueuedAction {
  id: string;
  type: 'sales_log' | 'production_log' | 'shift_feedback' | 'bread_type';
  action: 'insert' | 'update' | 'delete';
  data: any;
  userId: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface QueueEvent {
  type: 'action_completed' | 'action_failed' | 'sync_started' | 'sync_completed';
  timestamp: number;
  actionId?: string;
  error?: string;
}

class OfflineQueueManager {
  private static instance: OfflineQueueManager;
  private listeners: Map<string, Function[]> = new Map();

  static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  async addSalesAction(salesData: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'sales_log',
      action: 'insert',
      data: salesData,
      userId
    });
  }

  async addProductionAction(productionData: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'insert',
      data: productionData,
      userId
    });
  }

  async addBatchAction(batchData: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'insert',
      data: batchData,
      userId
    });
  }

  async addUpdateBatchAction(batchId: string, updates: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'update',
      data: { batchId, updates },
      userId
    });
  }

  async addCompleteBatchAction(batchId: string, actualQuantity: number, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'update',
      data: { batchId, actualQuantity },
      userId
    });
  }

  async addCancelBatchAction(batchId: string, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'delete',
      data: { batchId },
      userId
    });
  }

  async addBreadTypeAction(breadTypeData: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'bread_type',
      action: 'insert',
      data: breadTypeData,
      userId
    });
  }

  async addUpdateBreadTypeAction(breadTypeId: string, updates: any, userId: string): Promise<string> {
    return await OfflineStorage.addToQueue({
      type: 'bread_type',
      action: 'update',
      data: { breadTypeId, updates },
      userId
    });
  }

  async markActionAsSyncing(actionId: string): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'syncing',
      timestamp: Date.now()
    });
  }

  async markActionAsCompleted(actionId: string): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'completed',
      timestamp: Date.now()
    });
  }

  async markActionAsFailed(actionId: string, error: string): Promise<void> {
    const actions = await OfflineStorage.getQueuedActions();
    const currentAction = actions.find(a => a.id === actionId);
    
    if (currentAction) {
      await OfflineStorage.updateQueuedAction(actionId, {
        status: 'failed',
        lastError: error,
        retryCount: (currentAction.retryCount || 0) + 1,
        timestamp: Date.now()
      });
    }
  }

  async markActionAsRetrying(actionId: string): Promise<void> {
    await OfflineStorage.updateQueuedAction(actionId, {
      status: 'pending',
      timestamp: Date.now()
    });
  }

  async removeQueuedAction(actionId: string): Promise<void> {
    await OfflineStorage.removeQueuedAction(actionId);
  }

  async getPendingActions(): Promise<QueuedAction[]> {
    return await OfflineStorage.getQueuedActions();
  }

  async getFailedActions(): Promise<QueuedAction[]> {
    const actions = await OfflineStorage.getQueuedActions();
    return actions.filter(action => action.status === 'failed');
  }

  async retryFailedAction(actionId: string): Promise<void> {
    await this.markActionAsRetrying(actionId);
  }

  async getQueueStats(): Promise<{ total: number; pending: number; failed: number; completed: number }> {
    const actions = await OfflineStorage.getQueuedActions();
    const pending = actions.filter(a => a.status === 'pending').length;
    const failed = actions.filter(a => a.status === 'failed').length;
    const completed = actions.filter(a => a.status === 'completed').length;
    
    return {
      total: actions.length,
      pending,
      failed,
      completed
    };
  }

  // Wrapper for legacy compatibility
  async addSalesLog(salesData: any, userId: string) {
    return this.addSalesAction(salesData, userId);
  }
  async addProductionLog(productionData: any, userId: string) {
    return this.addProductionAction(productionData, userId);
  }
  async addShiftFeedback(feedbackData: any, userId: string) {
    // Use type: 'shift_feedback', action: 'insert'
    return await OfflineStorage.addToQueue({
      type: 'shift_feedback',
      action: 'insert',
      data: feedbackData,
      userId
    });
  }
  async updateSalesLog(id: string, data: any, userId: string) {
    // Use type: 'sales_log', action: 'update'
    return await OfflineStorage.addToQueue({
      type: 'sales_log',
      action: 'update',
      data: { id, ...data },
      userId
    });
  }
  async updateProductionLog(id: string, data: any, userId: string) {
    // Use type: 'production_log', action: 'update'
    return await OfflineStorage.addToQueue({
      type: 'production_log',
      action: 'update',
      data: { id, ...data },
      userId
    });
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const OfflineQueue = OfflineQueueManager.getInstance();
export const queueEvents = OfflineQueue;