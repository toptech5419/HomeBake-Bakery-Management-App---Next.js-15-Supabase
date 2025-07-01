import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type TableName = 'sales_logs' | 'production_logs' | 'shift_feedback' | 'bread_types';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  table: TableName;
  isConnected: boolean;
  lastHeartbeat?: Date;
}

export interface RealtimeCallbacks<T = any> {
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

class RealtimeManager {
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Subscribe to real-time changes on a specific table
   */
  subscribe<T = any>(
    table: TableName,
    callbacks: RealtimeCallbacks<T>,
    filter?: { column: string; value: any }
  ): string {
    const subscriptionId = this.generateSubscriptionId(table, filter);
    
    // Remove existing subscription if it exists
    this.unsubscribe(subscriptionId);

    const channel = supabase.channel(`${table}-changes-${Date.now()}`);

    // Build the subscription based on filter
    let subscription = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
      },
      (payload: any) => {
        console.log(`Real-time event received for ${table}:`, payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            callbacks.onInsert?.(payload);
            break;
          case 'UPDATE':
            callbacks.onUpdate?.(payload);
            break;
          case 'DELETE':
            callbacks.onDelete?.(payload);
            break;
        }
      }
    );

    // Handle connection status changes
    subscription.on('presence', { event: 'sync' }, () => {
      console.log(`Real-time sync for ${table}`);
    });

    subscription.on('broadcast', { event: 'heartbeat' }, () => {
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.lastHeartbeat = new Date();
      }
    });

    // Subscribe and handle status changes
    subscription.subscribe((status, err) => {
      console.log(`Subscription status for ${table}:`, status, err);
      
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.isConnected = status === 'SUBSCRIBED';
      }

      callbacks.onStatusChange?.(status);

      if (err) {
        console.error(`Subscription error for ${table}:`, err);
        callbacks.onError?.(err.message || 'Subscription error');
        
        // Attempt to reconnect on error
        this.attemptReconnect(subscriptionId, table, callbacks, filter);
      } else if (status === 'SUBSCRIBED') {
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts.set(subscriptionId, 0);
      }
    });

    // Store subscription
    this.subscriptions.set(subscriptionId, {
      channel,
      table,
      isConnected: false,
      lastHeartbeat: new Date()
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
      this.reconnectAttempts.delete(subscriptionId);
      console.log(`Unsubscribed from ${subscription.table}`);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    for (const [id, subscription] of this.subscriptions) {
      subscription.channel.unsubscribe();
    }
    this.subscriptions.clear();
    this.reconnectAttempts.clear();
    console.log('Unsubscribed from all real-time subscriptions');
  }

  /**
   * Get connection status for a subscription
   */
  getConnectionStatus(subscriptionId: string): boolean {
    return this.subscriptions.get(subscriptionId)?.isConnected || false;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): Array<{ id: string; table: TableName; isConnected: boolean }> {
    return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
      id,
      table: sub.table,
      isConnected: sub.isConnected
    }));
  }

  /**
   * Health check for subscriptions
   */
  healthCheck(): void {
    const now = new Date();
    const staleThreshold = 30000; // 30 seconds

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.lastHeartbeat) {
        const timeSinceHeartbeat = now.getTime() - subscription.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > staleThreshold && subscription.isConnected) {
          console.warn(`Stale connection detected for ${subscription.table}, attempting reconnect`);
          // Force reconnection for stale connections
          const callbacks = { onError: (err: string) => console.error('Health check reconnect error:', err) };
          this.attemptReconnect(id, subscription.table, callbacks);
        }
      }
    }
  }

  private generateSubscriptionId(table: TableName, filter?: { column: string; value: any }): string {
    const filterStr = filter ? `_${filter.column}_${filter.value}` : '';
    return `${table}${filterStr}_${Date.now()}`;
  }

  private async attemptReconnect<T = any>(
    subscriptionId: string,
    table: TableName,
    callbacks: RealtimeCallbacks<T>,
    filter?: { column: string; value: any }
  ): Promise<void> {
    const attempts = this.reconnectAttempts.get(subscriptionId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for ${table}`);
      callbacks.onError?.(`Failed to reconnect to ${table} after ${this.maxReconnectAttempts} attempts`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    console.log(`Attempting to reconnect to ${table} in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(() => {
      this.reconnectAttempts.set(subscriptionId, attempts + 1);
      
      // Remove old subscription
      this.unsubscribe(subscriptionId);
      
      // Create new subscription with same parameters
      this.subscribe(table, callbacks, filter);
    }, delay);
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Convenience functions for common use cases
export const subscribeToSalesLogs = (
  callbacks: RealtimeCallbacks,
  userId?: string
) => {
  const filter = userId ? { column: 'recorded_by', value: userId } : undefined;
  return realtimeManager.subscribe('sales_logs', callbacks, filter);
};

export const subscribeToProductionLogs = (
  callbacks: RealtimeCallbacks,
  userId?: string
) => {
  const filter = userId ? { column: 'recorded_by', value: userId } : undefined;
  return realtimeManager.subscribe('production_logs', callbacks, filter);
};

export const subscribeToShiftFeedback = (
  callbacks: RealtimeCallbacks,
  userId?: string
) => {
  const filter = userId ? { column: 'user_id', value: userId } : undefined;
  return realtimeManager.subscribe('shift_feedback', callbacks, filter);
};

export const subscribeToBreadTypes = (callbacks: RealtimeCallbacks) => {
  return realtimeManager.subscribe('bread_types', callbacks);
};

// Start health check interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    realtimeManager.healthCheck();
  }, 60000); // Check every minute
}