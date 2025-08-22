'use client';

import { supabase } from '@/lib/supabase/client';
import { Logger } from '@/lib/utils/logger';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

class SimplePushNotifications {
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Enhanced browser support detection with comprehensive compatibility checks
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Basic feature detection
    const hasBasicFeatures = !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
    
    if (!hasBasicFeatures) return false;
    
    // Enhanced browser-specific checks
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Safari iOS requires 16.4+
    if (userAgent.includes('safari') && userAgent.includes('mobile')) {
      const match = userAgent.match(/version\/(\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major < 16 || (major === 16 && minor < 4)) {
          Logger.debug('Safari iOS version too old for push notifications');
          return false;
        }
      }
    }
    
    // Check for secure context (HTTPS required)
    const isSecureContext = 'isSecureContext' in window ? 
      window.isSecureContext : 
      (location.protocol === 'https:' || location.hostname === 'localhost');
      
    if (!isSecureContext) {
      Logger.debug('Push notifications require secure context (HTTPS)');
      return false;
    }
    
    // Check for private browsing mode (where notifications are often blocked)
    if (this.isPrivateBrowsingMode()) {
      Logger.debug('Push notifications may be disabled in private browsing');
      return false; // Be conservative in private mode
    }
    
    return true;
  }
  
  /**
   * Detect private browsing mode
   */
  private isPrivateBrowsingMode(): boolean {
    try {
      // Firefox private browsing detection
      if ('MozAppearance' in document.documentElement.style) {
        const db = indexedDB.open('test');
        return new Promise((resolve) => {
          db.onerror = () => resolve(true);
          db.onsuccess = () => resolve(false);
        });
      }
      
      // Safari private browsing detection
      if (navigator.userAgent.includes('Safari')) {
        try {
          localStorage.setItem('test', '1');
          localStorage.removeItem('test');
          return false;
        } catch {
          return true;
        }
      }
      
      // Chrome incognito detection (limited)
      if ('webkitRequestFileSystem' in window) {
        return new Promise((resolve) => {
          (window as any).webkitRequestFileSystem(
            (window as any).TEMPORARY, 1,
            () => resolve(false),
            () => resolve(true)
          );
        });
      }
      
      return false;
    } catch {
      return false; // If detection fails, assume not private
    }
  }

  /**
   * Get current notification permission status with enhanced context
   */
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'default';
    
    const permission = Notification.permission;
    
    // Log permission state for debugging
    Logger.debug('Notification permission status:', permission);
    
    return permission;
  }
  
  /**
   * Get detailed browser and permission info for debugging
   */
  getDetailedSupport(): {
    isSupported: boolean;
    permission: NotificationPermission;
    browserType: string;
    browserVersion: string;
    isSecureContext: boolean;
    hasServiceWorker: boolean;
    hasPushManager: boolean;
    hasNotification: boolean;
    reason?: string;
  } {
    const userAgent = navigator.userAgent;
    const isSecureContext = 'isSecureContext' in window ? 
      window.isSecureContext : 
      (location.protocol === 'https:' || location.hostname === 'localhost');
    
    let browserType = 'unknown';
    let browserVersion = '';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserType = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
      browserType = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserType = 'safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Edg')) {
      browserType = 'edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
    
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    let reason: string | undefined;
    let isSupported = hasServiceWorker && hasPushManager && hasNotification && isSecureContext;
    
    if (!hasServiceWorker) reason = 'Service Worker not supported';
    else if (!hasPushManager) reason = 'Push Manager not supported';
    else if (!hasNotification) reason = 'Notifications not supported';
    else if (!isSecureContext) reason = 'Requires HTTPS (secure context)';
    else if (browserType === 'safari' && userAgent.includes('Mobile')) {
      const match = userAgent.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major < 16 || (major === 16 && minor < 4)) {
          isSupported = false;
          reason = 'Safari iOS requires version 16.4+';
        }
      }
    }
    
    return {
      isSupported,
      permission: this.getPermission(),
      browserType,
      browserVersion,
      isSecureContext,
      hasServiceWorker,
      hasPushManager,
      hasNotification,
      reason
    };
  }

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      Logger.debug('Initializing push notifications...');

      if (!this.isSupported()) {
        Logger.info('Push notifications not supported in this browser');
        return false;
      }

      // Register service worker
      await this.registerServiceWorker();
      
      this.isInitialized = true;
      Logger.success('Push notifications initialized successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to initialize push notifications', error);
      this.initPromise = null; // Allow retry
      return false;
    }
  }

  /**
   * Register service worker with simple retry logic
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      // Check for existing registration first
      const existingReg = await navigator.serviceWorker.getRegistration('/');
      if (existingReg && existingReg.active) {
        this.registration = existingReg;
        Logger.debug('Using existing service worker');
        return;
      }

      // Register new service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      Logger.success('Service worker registered');
    } catch (error) {
      Logger.error('Service worker registration failed', error);
      throw new Error('Failed to register service worker');
    }
  }

  /**
   * Request notification permission with enhanced error handling
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      Logger.debug('Notification permission already granted');
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      const errorMsg = 'Notification permission has been denied. To enable notifications:\n\n' +
        '1. Click the lock icon in your browser address bar\n' +
        '2. Allow notifications for this site\n' +
        '3. Refresh the page and try again';
      throw new Error(errorMsg);
    }

    try {
      Logger.debug('Requesting notification permission...');
      
      // Handle both callback and promise-based permission requests
      let permission: NotificationPermission;
      
      if (typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission();
        
        // Check if it returns a promise (modern browsers)
        if (result && typeof result.then === 'function') {
          permission = await result;
        } else {
          // Fallback for older browsers that use callbacks
          permission = await new Promise((resolve) => {
            Notification.requestPermission(resolve);
          });
        }
      } else {
        throw new Error('Permission request method not available');
      }
      
      Logger.debug('Permission request result:', permission);
      
      if (permission === 'denied') {
        throw new Error('User denied notification permission');
      }
      
      return permission;
    } catch (error) {
      Logger.error('Failed to request permission', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMsg.includes('denied')) {
        throw new Error('Notifications were blocked. Please check your browser settings.');
      }
      
      throw new Error(`Failed to request notification permission: ${errorMsg}`);
    }
  }

  /**
   * Subscribe to push notifications with comprehensive error handling
   */
  async subscribe(): Promise<PushSubscriptionData> {
    Logger.debug('Starting push notification subscription process');
    
    // Validate support before proceeding
    if (!this.isSupported()) {
      const details = this.getDetailedSupport();
      throw new Error(`Push notifications not supported: ${details.reason || 'Unknown reason'}`);
    }
    
    await this.initialize();

    if (!this.registration) {
      throw new Error('Service worker registration failed');
    }

    // Request permission with retries
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error(`Permission ${permission}: Cannot subscribe without notification permission`);
    }

    try {
      Logger.debug('Checking for existing subscription...');
      
      // Check for existing subscription
      let subscription = await this.registration.pushManager.getSubscription();

      if (subscription) {
        Logger.debug('Found existing subscription');
        
        // Validate existing subscription
        try {
          // Test if subscription is still valid
          const testResponse = await fetch('/api/push/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          }).catch(() => null);
          
          if (testResponse?.ok) {
            Logger.debug('Existing subscription is valid');
          } else {
            Logger.debug('Existing subscription invalid, creating new one');
            await subscription.unsubscribe();
            subscription = null;
          }
        } catch {
          // If validation fails, create new subscription
          Logger.debug('Subscription validation failed, creating new');
          await subscription.unsubscribe();
          subscription = null;
        }
      }

      if (!subscription) {
        Logger.debug('Creating new subscription...');
        
        // Get VAPID key with validation
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
          throw new Error('VAPID key not configured. Please contact support.');
        }

        const applicationServerKey = this.urlBase64ToUint8Array(vapidKey);
        
        // Subscribe with retry logic
        const maxRetries = 3;
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            Logger.debug(`Subscription attempt ${attempt}/${maxRetries}`);
            
            subscription = await this.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey
            });
            
            Logger.success('Successfully created push subscription');
            break;
            
          } catch (error) {
            lastError = error as Error;
            Logger.warn(`Subscription attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
              throw lastError;
            }
            
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!subscription) {
        throw new Error('Failed to create subscription after all retries');
      }

      // Convert and validate subscription data
      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint) {
        throw new Error('Invalid subscription: missing endpoint');
      }
      
      if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription: missing encryption keys');
      }

      const subscriptionData = {
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth
        }
      };
      
      Logger.success('Push subscription created successfully', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        hasKeys: !!(subscriptionData.keys.p256dh && subscriptionData.keys.auth)
      });
      
      return subscriptionData;
      
    } catch (error) {
      Logger.error('Failed to create subscription', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide user-friendly error messages
      if (errorMsg.includes('not supported')) {
        throw new Error('Push notifications are not supported in this browser version');
      } else if (errorMsg.includes('permission')) {
        throw new Error('Notification permission is required for push notifications');
      } else if (errorMsg.includes('VAPID')) {
        throw new Error('Server configuration error. Please contact support.');
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw new Error(`Failed to subscribe to push notifications: ${errorMsg}`);
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.registration) return;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        Logger.success('Unsubscribed from push notifications');
      }
    } catch (error) {
      Logger.error('Failed to unsubscribe', error);
      throw new Error('Failed to unsubscribe from push notifications');
    }
  }

  /**
   * Save push subscription to database with retry logic
   */
  async saveSubscription(userId: string, subscriptionData: PushSubscriptionData): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`Attempting to save subscription (${attempt}/${maxRetries})`);

        const { error } = await supabase
          .from('push_notification_preferences')
          .upsert({
            user_id: userId,
            enabled: true,
            endpoint: subscriptionData.endpoint,
            p256dh_key: subscriptionData.keys.p256dh,
            auth_key: subscriptionData.keys.auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });

        if (error) {
          throw error;
        }

        Logger.success('Push subscription saved successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Save attempt ${attempt}/${maxRetries} failed`, {
          error: lastError.message,
          userId,
          endpoint: subscriptionData.endpoint.substring(0, 50) + '...'
        });

        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        Logger.debug(`Retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown error';
    Logger.error('All save attempts failed', lastError || new Error(errorMessage));
    
    // Provide user-friendly error message
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    } else if (errorMessage.includes('timeout')) {
      throw new Error('Request timed out. Please try again.');
    } else if (errorMessage.includes('row-level security policy')) {
      throw new Error('Authentication issue. Please refresh the page and try again.');
    } else if (errorMessage.includes('PGRST')) {
      throw new Error('Database error. Please try again or contact support.');
    } else {
      throw new Error(`Failed to save push subscription: ${errorMessage}`);
    }
  }

  /**
   * Remove push subscription from database with retry logic
   */
  async removeSubscription(userId: string): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`Attempting to remove subscription (${attempt}/${maxRetries})`);

        const { error } = await supabase
          .from('push_notification_preferences')
          .update({
            enabled: false,
            endpoint: null,
            p256dh_key: null,
            auth_key: null,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        Logger.success('Push subscription removed successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Remove attempt ${attempt}/${maxRetries} failed`, {
          error: lastError.message,
          userId
        });

        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError?.message || 'Unknown error';
    Logger.error('All remove attempts failed', lastError || new Error(errorMessage));
    
    if (errorMessage.includes('fetch failed') || errorMessage.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    } else if (errorMessage.includes('row-level security policy')) {
      throw new Error('Authentication issue. Please refresh the page and try again.');
    } else {
      throw new Error(`Failed to remove push subscription: ${errorMessage}`);
    }
  }

  /**
   * Get user's push notification preferences with retry logic
   */
  async getUserPreferences(userId: string): Promise<{ enabled: boolean; hasSubscription: boolean }> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`Getting user preferences (${attempt}/${maxRetries})`);

        const { data, error } = await supabase
          .from('push_notification_preferences')
          .select('enabled, endpoint')
          .eq('user_id', userId)
          .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

        if (error && error.code !== 'PGRST116') throw error;

        const result = {
          enabled: data?.enabled ?? false,
          hasSubscription: !!(data?.endpoint)
        };

        Logger.success('User preferences retrieved', result);
        return result;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Get preferences attempt ${attempt}/${maxRetries} failed`, {
          error: lastError.message,
          userId
        });

        if (attempt === maxRetries) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    Logger.warn('All get preferences attempts failed, using defaults');
    return { enabled: false, hasSubscription: false };
  }

  /**
   * Show a local notification (for testing)
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Notifications not available');
    }

    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        tag: payload.tag || 'homebake-notification',
        requireInteraction: false,
        silent: false
      });
    } catch (error) {
      Logger.error('Failed to show notification', error);
      throw new Error('Failed to show notification');
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.showNotification({
      title: 'HomeBake Test',
      body: 'Push notifications are working! 🍞',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification'
    });
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// Export singleton instance
export const pushNotifications = new SimplePushNotifications();