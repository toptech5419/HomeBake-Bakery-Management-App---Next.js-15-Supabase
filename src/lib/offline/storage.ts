import Dexie, { Table } from 'dexie';
import type { Database } from '@/types/supabase';

// Types for offline storage
export interface QueuedAction {
  id?: number;
  type: 'sales_log' | 'production_log' | 'shift_feedback' | 'bread_type';
  action: 'insert' | 'update' | 'delete';
  data: any;
  userId: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface CachedSalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  leftover: number | null;
  shift: 'morning' | 'night';
  recorded_by: string;
  created_at: string;
  _offlineId?: string;
  _syncStatus: 'pending' | 'synced' | 'failed';
  _timestamp: number;
}

export interface CachedProductionLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  recorded_by: string;
  created_at: string;
  _offlineId?: string;
  _syncStatus: 'pending' | 'synced' | 'failed';
  _timestamp: number;
}

export interface CachedShiftFeedback {
  id: string;
  user_id: string;
  shift: 'morning' | 'night';
  note: string | null;
  created_at: string;
  _offlineId?: string;
  _syncStatus: 'pending' | 'synced' | 'failed';
  _timestamp: number;
}

export interface CachedBreadType {
  id: string;
  name: string;
  size: string | null;
  unit_price: number;
  created_by: string;
  created_at: string;
  _offlineId?: string;
  _syncStatus: 'pending' | 'synced' | 'failed';
  _timestamp: number;
}

export interface SyncMetadata {
  key: string;
  lastSyncTimestamp: number;
  syncInProgress: boolean;
}

class OfflineDatabase extends Dexie {
  // Queue for pending actions
  queuedActions!: Table<QueuedAction>;
  
  // Cached data tables
  salesLogs!: Table<CachedSalesLog>;
  productionLogs!: Table<CachedProductionLog>;
  shiftFeedback!: Table<CachedShiftFeedback>;
  breadTypes!: Table<CachedBreadType>;
  
  // Sync metadata
  syncMetadata!: Table<SyncMetadata>;

  constructor() {
    super('HomeBakeOfflineDB');
    
    this.version(1).stores({
      queuedActions: '++id, type, status, timestamp, userId',
      salesLogs: 'id, bread_type_id, shift, recorded_by, created_at, _syncStatus, _timestamp',
      productionLogs: 'id, bread_type_id, shift, recorded_by, created_at, _syncStatus, _timestamp',
      shiftFeedback: 'id, user_id, shift, created_at, _syncStatus, _timestamp',
      breadTypes: 'id, name, created_by, created_at, _syncStatus, _timestamp',
      syncMetadata: 'key'
    });
  }
}

export const offlineDB = new OfflineDatabase();

// Storage utilities
export class OfflineStorage {
  
  // Queue management
  static async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<number> {
    return await offlineDB.queuedActions.add({
      ...action,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    });
  }

  static async getQueuedActions(status?: QueuedAction['status']): Promise<QueuedAction[]> {
    if (status) {
      return await offlineDB.queuedActions.where('status').equals(status).toArray();
    }
    return await offlineDB.queuedActions.orderBy('timestamp').toArray();
  }

  static async updateQueuedAction(id: number, updates: Partial<QueuedAction>): Promise<void> {
    await offlineDB.queuedActions.update(id, updates);
  }

  static async removeQueuedAction(id: number): Promise<void> {
    await offlineDB.queuedActions.delete(id);
  }

  static async clearCompletedActions(): Promise<void> {
    await offlineDB.queuedActions.where('status').equals('completed').delete();
  }

  // Sales logs
  static async cacheSalesLog(salesLog: Omit<CachedSalesLog, '_timestamp'>): Promise<void> {
    const cached: CachedSalesLog = {
      ...salesLog,
      _timestamp: Date.now()
    };
    await offlineDB.salesLogs.put(cached);
  }

  static async getCachedSalesLogs(): Promise<CachedSalesLog[]> {
    return await offlineDB.salesLogs.orderBy('created_at').reverse().toArray();
  }

  static async getTodaysCachedSalesLogs(): Promise<CachedSalesLog[]> {
    const today = new Date().toISOString().split('T')[0];
    return await offlineDB.salesLogs
      .where('created_at')
      .between(`${today}T00:00:00`, `${today}T23:59:59`)
      .reverse()
      .toArray();
  }

  // Production logs
  static async cacheProductionLog(productionLog: Omit<CachedProductionLog, '_timestamp'>): Promise<void> {
    const cached: CachedProductionLog = {
      ...productionLog,
      _timestamp: Date.now()
    };
    await offlineDB.productionLogs.put(cached);
  }

  static async getCachedProductionLogs(): Promise<CachedProductionLog[]> {
    return await offlineDB.productionLogs.orderBy('created_at').reverse().toArray();
  }

  static async getTodaysCachedProductionLogs(): Promise<CachedProductionLog[]> {
    const today = new Date().toISOString().split('T')[0];
    return await offlineDB.productionLogs
      .where('created_at')
      .between(`${today}T00:00:00`, `${today}T23:59:59`)
      .reverse()
      .toArray();
  }

  // Shift feedback
  static async cacheShiftFeedback(feedback: Omit<CachedShiftFeedback, '_timestamp'>): Promise<void> {
    const cached: CachedShiftFeedback = {
      ...feedback,
      _timestamp: Date.now()
    };
    await offlineDB.shiftFeedback.put(cached);
  }

  static async getCachedShiftFeedback(): Promise<CachedShiftFeedback[]> {
    return await offlineDB.shiftFeedback.orderBy('created_at').reverse().toArray();
  }

  // Bread types
  static async cacheBreadType(breadType: Omit<CachedBreadType, '_timestamp'>): Promise<void> {
    const cached: CachedBreadType = {
      ...breadType,
      _timestamp: Date.now()
    };
    await offlineDB.breadTypes.put(cached);
  }

  static async getCachedBreadTypes(): Promise<CachedBreadType[]> {
    return await offlineDB.breadTypes.orderBy('name').toArray();
  }

  // Sync metadata
  static async setSyncMetadata(key: string, lastSyncTimestamp: number, syncInProgress = false): Promise<void> {
    await offlineDB.syncMetadata.put({
      key,
      lastSyncTimestamp,
      syncInProgress
    });
  }

  static async getSyncMetadata(key: string): Promise<SyncMetadata | undefined> {
    return await offlineDB.syncMetadata.get(key);
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    await Promise.all([
      offlineDB.queuedActions.clear(),
      offlineDB.salesLogs.clear(),
      offlineDB.productionLogs.clear(),
      offlineDB.shiftFeedback.clear(),
      offlineDB.breadTypes.clear(),
      offlineDB.syncMetadata.clear()
    ]);
  }

  static async getStorageSize(): Promise<{ tables: Record<string, number>; total: number }> {
    const tables = {
      queuedActions: await offlineDB.queuedActions.count(),
      salesLogs: await offlineDB.salesLogs.count(),
      productionLogs: await offlineDB.productionLogs.count(),
      shiftFeedback: await offlineDB.shiftFeedback.count(),
      breadTypes: await offlineDB.breadTypes.count(),
      syncMetadata: await offlineDB.syncMetadata.count()
    };

    const total = Object.values(tables).reduce((sum, count) => sum + count, 0);

    return { tables, total };
  }

  // Generate offline IDs
  static generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if ID is offline-generated
  static isOfflineId(id: string): boolean {
    return id.startsWith('offline_');
  }
}

// Initialize database
export const initializeOfflineDB = async (): Promise<void> => {
  try {
    await offlineDB.open();
    console.log('Offline database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
    throw error;
  }
};