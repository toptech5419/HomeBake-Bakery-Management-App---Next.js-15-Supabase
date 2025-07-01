import { realtimeManager, type TableName, type RealtimeCallbacks } from '@/lib/supabase/realtime';

export interface SubscriptionConfig {
  table: TableName;
  filter?: { column: string; value: any };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface ManagedSubscription {
  id: string;
  config: SubscriptionConfig;
  isActive: boolean;
  lastConnected?: Date;
  errorCount: number;
  retryCount: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, ManagedSubscription> = new Map();
  private priorities: Map<string, number> = new Map([
    ['high', 1],
    ['medium', 2],
    ['low', 3]
  ]);

  /**
   * Create a managed subscription with automatic lifecycle management
   */
  createSubscription(name: string, config: SubscriptionConfig): string {
    // Remove existing subscription if it exists
    this.removeSubscription(name);

    const callbacks: RealtimeCallbacks = {
      onInsert: (payload) => {
        this.updateActivity(name);
        config.onInsert?.(payload);
      },
      onUpdate: (payload) => {
        this.updateActivity(name);
        config.onUpdate?.(payload);
      },
      onDelete: (payload) => {
        this.updateActivity(name);
        config.onDelete?.(payload);
      },
      onError: (error) => {
        this.handleError(name, error);
        config.onError?.(error);
      },
      onStatusChange: (status) => {
        this.updateStatus(name, status === 'SUBSCRIBED');
      }
    };

    const subscriptionId = realtimeManager.subscribe(
      config.table,
      callbacks,
      config.filter
    );

    const managedSub: ManagedSubscription = {
      id: subscriptionId,
      config,
      isActive: false,
      errorCount: 0,
      retryCount: 0
    };

    this.subscriptions.set(name, managedSub);
    console.log(`Created managed subscription: ${name} for table: ${config.table}`);

    return subscriptionId;
  }

  /**
   * Remove a managed subscription
   */
  removeSubscription(name: string): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      realtimeManager.unsubscribe(subscription.id);
      this.subscriptions.delete(name);
      console.log(`Removed managed subscription: ${name}`);
    }
  }

  /**
   * Get subscription status
   */
  getSubscription(name: string): ManagedSubscription | undefined {
    return this.subscriptions.get(name);
  }

  /**
   * Get all managed subscriptions
   */
  getAllSubscriptions(): Array<{ name: string; subscription: ManagedSubscription }> {
    return Array.from(this.subscriptions.entries()).map(([name, subscription]) => ({
      name,
      subscription
    }));
  }

  /**
   * Reconnect a specific subscription
   */
  reconnectSubscription(name: string): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      console.log(`Reconnecting subscription: ${name}`);
      subscription.retryCount++;
      
      // Remove and recreate
      realtimeManager.unsubscribe(subscription.id);
      
      setTimeout(() => {
        this.createSubscription(name, subscription.config);
      }, this.getRetryDelay(subscription.retryCount));
    }
  }

  /**
   * Reconnect all subscriptions by priority
   */
  reconnectAll(): void {
    const sortedSubs = Array.from(this.subscriptions.entries())
      .sort(([, a], [, b]) => {
        const priorityA = this.priorities.get(a.config.priority || 'medium') || 2;
        const priorityB = this.priorities.get(b.config.priority || 'medium') || 2;
        return priorityA - priorityB;
      });

    sortedSubs.forEach(([name], index) => {
      setTimeout(() => {
        this.reconnectSubscription(name);
      }, index * 500); // Stagger reconnections
    });
  }

  /**
   * Health check for all subscriptions
   */
  healthCheck(): void {
    const now = new Date();
    const staleThreshold = 2 * 60 * 1000; // 2 minutes

    for (const [name, subscription] of this.subscriptions) {
      if (subscription.lastConnected) {
        const timeSinceActivity = now.getTime() - subscription.lastConnected.getTime();
        
        if (timeSinceActivity > staleThreshold && subscription.isActive) {
          console.warn(`Subscription ${name} appears stale, reconnecting...`);
          this.reconnectSubscription(name);
        }
      }

      // Auto-retry failed subscriptions
      if (!subscription.isActive && subscription.config.autoReconnect !== false) {
        const maxRetries = this.getMaxRetries(subscription.config.priority);
        if (subscription.retryCount < maxRetries) {
          console.log(`Auto-retrying failed subscription: ${name} (attempt ${subscription.retryCount + 1})`);
          this.reconnectSubscription(name);
        }
      }
    }
  }

  /**
   * Pause all subscriptions
   */
  pauseAll(): void {
    for (const [name, subscription] of this.subscriptions) {
      realtimeManager.unsubscribe(subscription.id);
      subscription.isActive = false;
    }
    console.log('All subscriptions paused');
  }

  /**
   * Resume all subscriptions
   */
  resumeAll(): void {
    for (const [name, subscription] of this.subscriptions) {
      this.createSubscription(name, subscription.config);
    }
    console.log('All subscriptions resumed');
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    total: number;
    active: number;
    errors: number;
    byTable: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const subscriptions = Array.from(this.subscriptions.values());
    
    const byTable: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    subscriptions.forEach(sub => {
      // Count by table
      byTable[sub.config.table] = (byTable[sub.config.table] || 0) + 1;
      
      // Count by priority
      const priority = sub.config.priority || 'medium';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    });

    return {
      total: subscriptions.length,
      active: subscriptions.filter(sub => sub.isActive).length,
      errors: subscriptions.reduce((sum, sub) => sum + sub.errorCount, 0),
      byTable,
      byPriority
    };
  }

  private updateActivity(name: string): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.lastConnected = new Date();
    }
  }

  private updateStatus(name: string, isActive: boolean): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.isActive = isActive;
      if (isActive) {
        subscription.lastConnected = new Date();
        subscription.errorCount = 0; // Reset error count on successful connection
      }
    }
  }

  private handleError(name: string, error: string): void {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.errorCount++;
      subscription.isActive = false;
      console.error(`Subscription ${name} error (count: ${subscription.errorCount}):`, error);
    }
  }

  private getRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(retryCount, 6));
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return exponentialDelay + jitter;
  }

  private getMaxRetries(priority?: string): number {
    switch (priority) {
      case 'high': return 10;
      case 'medium': return 5;
      case 'low': return 3;
      default: return 5;
    }
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

// Convenience functions for common subscription patterns
export const createDashboardSubscriptions = (userId: string, onDataChange: () => void) => {
  return [
    subscriptionManager.createSubscription('dashboard-sales', {
      table: 'sales_logs',
      onInsert: onDataChange,
      onUpdate: onDataChange,
      onDelete: onDataChange,
      priority: 'high',
      autoReconnect: true
    }),
    subscriptionManager.createSubscription('dashboard-production', {
      table: 'production_logs',
      onInsert: onDataChange,
      onUpdate: onDataChange,
      onDelete: onDataChange,
      priority: 'high',
      autoReconnect: true
    }),
    subscriptionManager.createSubscription('dashboard-feedback', {
      table: 'shift_feedback',
      onInsert: onDataChange,
      onUpdate: onDataChange,
      onDelete: onDataChange,
      priority: 'medium',
      autoReconnect: true
    })
  ];
};

export const createInventorySubscriptions = (onInventoryChange: () => void) => {
  return [
    subscriptionManager.createSubscription('inventory-sales', {
      table: 'sales_logs',
      onInsert: onInventoryChange,
      onUpdate: onInventoryChange,
      onDelete: onInventoryChange,
      priority: 'high',
      autoReconnect: true
    }),
    subscriptionManager.createSubscription('inventory-production', {
      table: 'production_logs',
      onInsert: onInventoryChange,
      onUpdate: onInventoryChange,
      onDelete: onInventoryChange,
      priority: 'high',
      autoReconnect: true
    })
  ];
};

export const createReportsSubscriptions = (onReportsChange: () => void) => {
  return [
    subscriptionManager.createSubscription('reports-sales', {
      table: 'sales_logs',
      onInsert: onReportsChange,
      onUpdate: onReportsChange,
      onDelete: onReportsChange,
      priority: 'medium',
      autoReconnect: true
    }),
    subscriptionManager.createSubscription('reports-production', {
      table: 'production_logs',
      onInsert: onReportsChange,
      onUpdate: onReportsChange,
      onDelete: onReportsChange,
      priority: 'medium',
      autoReconnect: true
    })
  ];
};

// Start health check interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    subscriptionManager.healthCheck();
  }, 2 * 60 * 1000); // Check every 2 minutes
}