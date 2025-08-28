'use client';

import { QueryClient } from '@tanstack/react-query';

interface PollingConfig {
  queryClient: QueryClient;
  defaultInterval: number;
  strategies: {
    aggressive: number;
    standard: number;
    conservative: number;
    offline: number;
  };
}

/**
 * Smart Polling Manager
 * Manages intelligent polling based on user activity and network status
 */
class SmartPollingManager {
  private queryClient: QueryClient | null = null;
  private config: PollingConfig | null = null;
  private isOnline = true;
  private isActive = true;
  private initialized = false;

  /**
   * Initialize smart polling
   */
  initialize(config: PollingConfig) {
    if (this.initialized) {
      console.warn('Smart polling manager already initialized');
      return;
    }

    this.config = config;
    this.queryClient = config.queryClient;
    this.initialized = true;

    // Set up event listeners
    this.setupEventListeners();
    
    console.log('🎯 Smart polling manager initialized');
  }

  /**
   * Set up event listeners for online/offline and visibility
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Page visibility detection
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Initialize states
    this.isOnline = navigator.onLine;
    this.isActive = !document.hidden;
  }

  /**
   * Handle online event
   */
  private handleOnline() {
    this.isOnline = true;
    console.log('🌐 Connection restored, resuming polling');
    this.updatePollingStrategy();
  }

  /**
   * Handle offline event
   */
  private handleOffline() {
    this.isOnline = false;
    console.log('📴 Connection lost, pausing polling');
    this.updatePollingStrategy();
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange() {
    this.isActive = !document.hidden;
    console.log(`👁️ Page ${this.isActive ? 'active' : 'inactive'}, adjusting polling`);
    this.updatePollingStrategy();
  }

  /**
   * Update polling strategy based on current conditions
   */
  private updatePollingStrategy() {
    if (!this.config || !this.queryClient) return;

    let strategy: keyof typeof this.config.strategies;

    if (!this.isOnline) {
      strategy = 'offline';
    } else if (this.isActive) {
      strategy = 'aggressive';
    } else {
      strategy = 'conservative';
    }

    const interval = this.config.strategies[strategy];
    
    // Update default query options
    this.queryClient.setDefaultOptions({
      queries: {
        refetchInterval: interval || false,
        refetchIntervalInBackground: strategy === 'aggressive'
      }
    });
  }

  /**
   * Get current polling interval
   */
  getCurrentInterval(): number {
    if (!this.config) return 0;

    if (!this.isOnline) return this.config.strategies.offline;
    if (this.isActive) return this.config.strategies.aggressive;
    return this.config.strategies.conservative;
  }

  /**
   * Force refresh all queries
   */
  refreshAll() {
    if (!this.queryClient) return;
    this.queryClient.invalidateQueries();
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    this.initialized = false;
    this.queryClient = null;
    this.config = null;
  }
}

export const smartPollingManager = new SmartPollingManager();