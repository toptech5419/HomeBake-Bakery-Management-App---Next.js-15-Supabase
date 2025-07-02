// Production-ready offline storage using localStorage
// Replaced Dexie (IndexedDB) for better serverless compatibility

import type { Database } from '@/types/database';

// Types for offline storage
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

// Storage keys
const STORAGE_KEYS = {
  QUEUED_ACTIONS: 'homebake_queued_actions',
  SALES_LOGS: 'homebake_sales_logs',
  PRODUCTION_LOGS: 'homebake_production_logs',
  SHIFT_FEEDBACK: 'homebake_shift_feedback',
  BREAD_TYPES: 'homebake_bread_types',
  SYNC_METADATA: 'homebake_sync_metadata',
} as const;

// Storage utilities with localStorage backend
export class OfflineStorage {
  
  // Helper methods for localStorage operations
  private static getFromStorage<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading from localStorage key ${key}:`, error);
      return [];
    }
  }

  private static saveToStorage<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage key ${key}:`, error);
    }
  }

  private static getSingleFromStorage<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading single item from localStorage key ${key}:`, error);
      return null;
    }
  }

  private static saveSingleToStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving single item to localStorage key ${key}:`, error);
    }
  }

  // Queue management
  static async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const actions = this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS);
    const newAction: QueuedAction = {
      ...action,
      id: this.generateOfflineId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };
    
    actions.push(newAction);
    this.saveToStorage(STORAGE_KEYS.QUEUED_ACTIONS, actions);
    return newAction.id;
  }

  static async getQueuedActions(status?: QueuedAction['status']): Promise<QueuedAction[]> {
    const actions = this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS);
    
    if (status) {
      return actions.filter(action => action.status === status);
    }
    
    return actions.sort((a, b) => a.timestamp - b.timestamp);
  }

  static async updateQueuedAction(id: string, updates: Partial<QueuedAction>): Promise<void> {
    const actions = this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS);
    const index = actions.findIndex(action => action.id === id);
    
    if (index !== -1) {
      actions[index] = { ...actions[index], ...updates };
      this.saveToStorage(STORAGE_KEYS.QUEUED_ACTIONS, actions);
    }
  }

  static async removeQueuedAction(id: string): Promise<void> {
    const actions = this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS);
    const filtered = actions.filter(action => action.id !== id);
    this.saveToStorage(STORAGE_KEYS.QUEUED_ACTIONS, filtered);
  }

  static async clearCompletedActions(): Promise<void> {
    const actions = this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS);
    const filtered = actions.filter(action => action.status !== 'completed');
    this.saveToStorage(STORAGE_KEYS.QUEUED_ACTIONS, filtered);
  }

  // Sales logs
  static async cacheSalesLog(salesLog: Omit<CachedSalesLog, '_timestamp'>): Promise<void> {
    const logs = this.getFromStorage<CachedSalesLog>(STORAGE_KEYS.SALES_LOGS);
    const cached: CachedSalesLog = {
      ...salesLog,
      _timestamp: Date.now()
    };
    
    const index = logs.findIndex(log => log.id === cached.id);
    if (index !== -1) {
      logs[index] = cached;
    } else {
      logs.push(cached);
    }
    
    this.saveToStorage(STORAGE_KEYS.SALES_LOGS, logs);
  }

  static async getCachedSalesLogs(): Promise<CachedSalesLog[]> {
    const logs = this.getFromStorage<CachedSalesLog>(STORAGE_KEYS.SALES_LOGS);
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getTodaysCachedSalesLogs(): Promise<CachedSalesLog[]> {
    const logs = this.getFromStorage<CachedSalesLog>(STORAGE_KEYS.SALES_LOGS);
    const today = new Date().toISOString().split('T')[0];
    
    return logs
      .filter(log => log.created_at.startsWith(today))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Production logs
  static async cacheProductionLog(productionLog: Omit<CachedProductionLog, '_timestamp'>): Promise<void> {
    const logs = this.getFromStorage<CachedProductionLog>(STORAGE_KEYS.PRODUCTION_LOGS);
    const cached: CachedProductionLog = {
      ...productionLog,
      _timestamp: Date.now()
    };
    
    const index = logs.findIndex(log => log.id === cached.id);
    if (index !== -1) {
      logs[index] = cached;
    } else {
      logs.push(cached);
    }
    
    this.saveToStorage(STORAGE_KEYS.PRODUCTION_LOGS, logs);
  }

  static async getCachedProductionLogs(): Promise<CachedProductionLog[]> {
    const logs = this.getFromStorage<CachedProductionLog>(STORAGE_KEYS.PRODUCTION_LOGS);
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getTodaysCachedProductionLogs(): Promise<CachedProductionLog[]> {
    const logs = this.getFromStorage<CachedProductionLog>(STORAGE_KEYS.PRODUCTION_LOGS);
    const today = new Date().toISOString().split('T')[0];
    
    return logs
      .filter(log => log.created_at.startsWith(today))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Shift feedback
  static async cacheShiftFeedback(feedback: Omit<CachedShiftFeedback, '_timestamp'>): Promise<void> {
    const feedbacks = this.getFromStorage<CachedShiftFeedback>(STORAGE_KEYS.SHIFT_FEEDBACK);
    const cached: CachedShiftFeedback = {
      ...feedback,
      _timestamp: Date.now()
    };
    
    const index = feedbacks.findIndex(f => f.id === cached.id);
    if (index !== -1) {
      feedbacks[index] = cached;
    } else {
      feedbacks.push(cached);
    }
    
    this.saveToStorage(STORAGE_KEYS.SHIFT_FEEDBACK, feedbacks);
  }

  static async getCachedShiftFeedback(): Promise<CachedShiftFeedback[]> {
    const feedbacks = this.getFromStorage<CachedShiftFeedback>(STORAGE_KEYS.SHIFT_FEEDBACK);
    return feedbacks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Bread types
  static async cacheBreadType(breadType: Omit<CachedBreadType, '_timestamp'>): Promise<void> {
    const types = this.getFromStorage<CachedBreadType>(STORAGE_KEYS.BREAD_TYPES);
    const cached: CachedBreadType = {
      ...breadType,
      _timestamp: Date.now()
    };
    
    const index = types.findIndex(t => t.id === cached.id);
    if (index !== -1) {
      types[index] = cached;
    } else {
      types.push(cached);
    }
    
    this.saveToStorage(STORAGE_KEYS.BREAD_TYPES, types);
  }

  static async getCachedBreadTypes(): Promise<CachedBreadType[]> {
    const types = this.getFromStorage<CachedBreadType>(STORAGE_KEYS.BREAD_TYPES);
    return types.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sync metadata
  static async setSyncMetadata(key: string, lastSyncTimestamp: number, syncInProgress = false): Promise<void> {
    const metadata = this.getSingleFromStorage<Record<string, SyncMetadata>>(STORAGE_KEYS.SYNC_METADATA) || {};
    metadata[key] = {
      key,
      lastSyncTimestamp,
      syncInProgress
    };
    this.saveSingleToStorage(STORAGE_KEYS.SYNC_METADATA, metadata);
  }

  static async getSyncMetadata(key: string): Promise<SyncMetadata | undefined> {
    const metadata = this.getSingleFromStorage<Record<string, SyncMetadata>>(STORAGE_KEYS.SYNC_METADATA) || {};
    return metadata[key];
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  static async getStorageSize(): Promise<{ tables: Record<string, number>; total: number }> {
    const tables = {
      queuedActions: this.getFromStorage<QueuedAction>(STORAGE_KEYS.QUEUED_ACTIONS).length,
      salesLogs: this.getFromStorage<CachedSalesLog>(STORAGE_KEYS.SALES_LOGS).length,
      productionLogs: this.getFromStorage<CachedProductionLog>(STORAGE_KEYS.PRODUCTION_LOGS).length,
      shiftFeedback: this.getFromStorage<CachedShiftFeedback>(STORAGE_KEYS.SHIFT_FEEDBACK).length,
      breadTypes: this.getFromStorage<CachedBreadType>(STORAGE_KEYS.BREAD_TYPES).length,
      syncMetadata: Object.keys(this.getSingleFromStorage<Record<string, SyncMetadata>>(STORAGE_KEYS.SYNC_METADATA) || {}).length
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

// Initialize localStorage (no-op for localStorage, but kept for API compatibility)
export const initializeOfflineDB = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      console.log('LocalStorage offline storage initialized successfully');
    } else {
      console.warn('LocalStorage not available, offline features disabled');
    }
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
    throw error;
  }
};